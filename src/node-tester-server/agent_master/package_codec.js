const assert = require('assert');

const base = require('./common/base');
const Protocol = require('./protocol');
const {ErrorCode} = require('./tcp_server');

const EmptyBuffer = new Buffer(0);
const MAX_PACKAGE_SIZE = 10240;

const MAGIC = 0x1106;
const VERSION = 0x0100;

class PackageCodec {
    constructor() {
        this.m_cache = new Buffer(MAX_PACKAGE_SIZE);
        this.m_cacheSize = 0;
        this.m_decodedPkgs = [];
        this.m_debug = {
            lastPkg: {
                pkg: {},
                buffer: null,
                cache: null,
            }
        }
    }

    push(buffer) {
        let toParseBuffer = buffer;
        let overBuffer = EmptyBuffer;

        const appendCache = (appendBuffer) => {
            const cacheAppendSize = Math.min(this.m_cache.length - this.m_cacheSize, appendBuffer.length);
            appendBuffer.copy(this.m_cache, this.m_cacheSize, 0, cacheAppendSize);
            this.m_cacheSize += cacheAppendSize;
            return cacheAppendSize;
        };

        if (this.m_cacheSize > 0) {
            overBuffer = buffer.slice(appendCache(buffer));
            toParseBuffer = this.m_cache.slice(0, this.m_cacheSize);
        }

        let pkgCount = this.m_decodedPkgs.length;
        let offset = 0;
        while (true) {
            let {err, pkg, length} = this._decode(toParseBuffer, offset);
            base.blog.debug('decode: err = ', err);
            if (err === ErrorCode.success) {
                assert(length > 0);
                this.m_decodedPkgs.push(pkg);
                offset += length;

                this.m_debug.lastPkg.pkg = pkg;
                this.m_debug.lastPkg.buffer = Buffer.from(toParseBuffer.slice(offset - length, offset));
                this.m_debug.lastPkg.cache = Buffer.concat([toParseBuffer.slice(offset), overBuffer]);
            } else if (err === ErrorCode.pending) {
                if (this.m_cacheSize > 0) {
                    this.m_cache.copy(this.m_cache, 0, offset);
                    this.m_cacheSize -= offset;
                    if (overBuffer.length > 0) {
                        if (this.m_cacheSize > 0) {
                            overBuffer = overBuffer.slice(appendCache(overBuffer));
                            toParseBuffer = this.m_cache.slice(0, this.m_cacheSize);
                        } else {
                            toParseBuffer = overBuffer;
                            overBuffer = EmptyBuffer;
                        }
                        offset = 0;
                    } else {
                        return this.m_decodedPkgs.length > pkgCount ? ErrorCode.success : ErrorCode.pending;
                    }
                } else {
                    assert(overBuffer.length === 0);
                    const appendSize = appendCache(toParseBuffer.slice(offset));
                    assert(appendSize === toParseBuffer.length - offset);
                    return this.m_decodedPkgs.length > pkgCount ? ErrorCode.success : ErrorCode.pending;
                }
            } else {
                return err;
            }
        }

        return ErrorCode.success;
    }

    pop() {
        const pkgs = this.m_decodedPkgs;
        this.m_decodedPkgs = [];
        return pkgs;
    }

    encode(pkgs) { // []
        let buffer = Buffer.allocUnsafe(MAX_PACKAGE_SIZE * pkgs.length);

        let offset = 0;
        for (let i = 0; i < pkgs.length; i++) {
            const pkg = pkgs[i];
            
            base.blog.debug('encode pkg:', JSON.stringify(pkg));
            
            buffer.writeUInt16LE(MAGIC, offset);
            offset += 2;
            buffer.writeUInt16LE(VERSION, offset);
            // length
            offset += 6;

            const bodyStartPos = offset;

            let encodeSize = Protocol.Header.encode(pkg.header, buffer, offset);
            offset += encodeSize;
            if (encodeSize < 0) {
                return null;
            }

            const bodyCodec = Protocol.GetBodyCodecByPkgName(pkg.header.name);
            if (!bodyCodec) {
                return null;
            }

            encodeSize = bodyCodec.encode(pkg.body, buffer, offset);
            offset += encodeSize;

            buffer.writeUInt32LE(offset - bodyStartPos, bodyStartPos - 4);
            if (encodeSize < 0) {
                return null;
            }
        }

        return buffer.slice(0, offset);
    }

    _decode(buffer, offset) {
        if (buffer.length - offset < 8) {
            return {err: ErrorCode.pending, pkg : null};
        }

        const length = buffer.readUInt32LE(offset + 4);
        if (length > MAX_PACKAGE_SIZE) {
            base.blog.warn(`unknown package(length:${length}): `, buffer.toString('hex'), ', last package: ', JSON.stringify(this.m_debug.lastPkg));
            return {err: ErrorCode.unknownPakage, pkg : null};
        }

        let pkgBuffer = buffer.slice(offset, offset + length + 8);

        if (pkgBuffer.length < length + 8) {
            return {err: ErrorCode.pending, pkg : null};
        }

        offset = 0;
        const magic = pkgBuffer.readUInt16LE(offset);
        offset += 2;
        const version = pkgBuffer.readUInt16LE(offset);

        // if (magic != MAGIC || version != VERSION) {
        //     return {err: ErrorCode.unknownPakage, pkg : null};
        // }
        
        offset += 6; // version|length
        let headerSize = 0;
        let decodeResult = Protocol.Header.decode(pkgBuffer, offset);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            base.blog.warn('unknown package header: ', pkgBuffer.toString('hex'), ', last package: ', JSON.stringify(this.m_debug.lastPkg));
            return {err: ErrorCode.unknownPakage, pkg : null};
        }
        headerSize = decodeResult.length;

        let pkg = {};
        pkg.header = decodeResult.pkg;

        const bodyCodec = Protocol.GetBodyCodecByPkgName(pkg.header.name);
        if (!bodyCodec) {
            base.blog.warn(`unknown package (name:${pkg.header.name}): `, pkgBuffer.toString('hex'), ', last package: ', JSON.stringify(this.m_debug.lastPkg));
            return {err: ErrorCode.unknownPakage, pkg : null};
        }

        decodeResult = bodyCodec.decode(pkgBuffer, offset);
        offset += decodeResult.length;
        if (decodeResult.length < 0) {
            base.blog.warn('unknown package body: ', pkgBuffer.toString('hex'), ', last package: ', JSON.stringify(this.m_debug.lastPkg));
            return {err: ErrorCode.unknownPakage, pkg : null};
        }

        assert(decodeResult.length + headerSize === length);
        assert(offset === length + 8);
        
        pkg.body = decodeResult.pkg;

        base.blog.info('decode pkg:', JSON.stringify(pkg));
        
        return {err: ErrorCode.success, pkg, length: pkgBuffer.length};
    }
}

class PackageCodecCreator {
    constructor() {
    }

    create() {
        return new PackageCodec();
    }
}

module.exports = {
    PackageCodecCreator,
};

if (require.main === module) {
    const fs = require('fs-extra');
    let file = fs.openSync('E:\\project\\node_tester\\log\\dst_master_command.send', 'r');
    let buffer = Buffer.allocUnsafe(1024 * 1024);
    let readSize = fs.readSync(file, buffer, 0, buffer.length, 0);
    buffer = buffer.slice(0, readSize);

    let codec = new PackageCodec();
    let pos = 0;
    let lastPos = 0;
    let lastSize = 0;
    let ranges = [];
    let sizes = [4440, 1066, 8578];
    let buffers = [];
    let index = 0;
    while (pos < buffer.length) {
        let pushSize = Math.ceil(Math.random() * (buffer.length - pos));
        let buf = buffer.slice(pos, pos + pushSize);
        buffers.push(buf);
        let errCode = codec.push(buf);
        if (errCode === ErrorCode.unknownPakage) {
            let errCodec = new PackageCodec();
            // errCodec.push(codec.m_cache.slice(0, codec.m_cacheSize));
            errCodec.push(codec.m_debug.lastPkg.buffer);
            errCodec.push(codec.m_debug.lastPkg.cache);
            errCodec.push(buffer.slice(pos, pos + pushSize));
            break;
        }
        ranges.push({pos, pushSize});
        index++;
        lastPos = pos;
        lastSize = pushSize;
        pos += pushSize;
    }
}    