/*!
 * writer.js - buffer writer for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */
/// <reference types="node" />
/**
 * An object that allows writing of buffers in a
 * sane manner. This buffer writer is extremely
 * optimized since it does not actually write
 * anything until `render` is called. It makes
 * one allocation: at the end, once it knows the
 * size of the buffer to be allocated. Because
 * of this, it can also act as a size calculator
 * which is useful for guaging block size
 * without actually serializing any data.
 * @alias module:utils.BufferWriter
 * @constructor
 */
export declare class BufferWriter {
    constructor();
    private ops;
    private offset;
    /**
     * Allocate and render the final buffer.
     * @returns {Buffer} Rendered buffer.
     */
    render(): Buffer;
    /**
     * Get size of data written so far.
     * @returns {Number}
     */
    getSize(): number;
    /**
     * Seek to relative offset.
     * @param {Number} offset
     */
    seek(offset: number): void;
    /**
     * Destroy the buffer writer. Remove references to `ops`.
     */
    destroy(): void;
    /**
     * Write uint8.
     * @param {Number} value
     */
    writeU8(value: number): void;
    /**
     * Write uint16le.
     * @param {Number} value
     */
    writeU16(value: number): void;
    /**
     * Write uint16be.
     * @param {Number} value
     */
    writeU16BE(value: number): void;
    /**
     * Write uint32le.
     * @param {Number} value
     */
    writeU32(value: number): void;
    /**
     * Write uint32be.
     * @param {Number} value
     */
    writeU32BE(value: number): void;
    /**
     * Write uint64le.
     * @param {Number} value
     */
    writeU64(value: number): void;
    /**
     * Write uint64be.
     * @param {Number} value
     */
    writeU64BE(value: number): void;
    /**
     * Write int8.
     * @param {Number} value
     */
    writeI8(value: number): void;
    /**
     * Write int16le.
     * @param {Number} value
     */
    writeI16(value: number): void;
    /**
     * Write int16be.
     * @param {Number} value
     */
    writeI16BE(value: number): void;
    /**
     * Write int32le.
     * @param {Number} value
     */
    writeI32(value: number): void;
    /**
     * Write int32be.
     * @param {Number} value
     */
    writeI32BE(value: number): void;
    /**
     * Write int64le.
     * @param {Number} value
     */
    writeI64(value: number): void;
    /**
     * Write int64be.
     * @param {Number} value
     */
    writeI64BE(value: number): void;
    /**
     * Write float le.
     * @param {Number} value
     */
    writeFloat(value: number): void;
    /**
     * Write float be.
     * @param {Number} value
     */
    writeFloatBE(value: number): void;
    /**
     * Write double le.
     * @param {Number} value
     */
    writeDouble(value: number): void;
    /**
     * Write double be.
     * @param {Number} value
     */
    writeDoubleBE(value: number): void;
    /**
     * Write a varint.
     * @param {Number} value
     */
    writeVarint(value: number): void;
    /**
     * Write a varint (type 2).
     * @param {Number} value
     */
    writeVarint2(value: number): void;
    /**
     * Write bytes.
     * @param {Buffer} value
     */
    writeBytes(value: Buffer): void;
    /**
     * Write bytes with a varint length before them.
     * @param {Buffer} value
     */
    writeVarBytes(value: Buffer): void;
    /**
     * Copy bytes.
     * @param {Buffer} value
     * @param {Number} start
     * @param {Number} end
     */
    copy(value: Buffer, start: number, end: number): void;
    /**
     * Write string to buffer.
     * @param {String} value
     * @param {String?} enc - Any buffer-supported Encoding.
     */
    writeString(value: string | Buffer, enc?: BufferEncoding): void;
    /**
     * Write a 32 byte hash.
     * @param {Hash} value
     */
    writeHash(value: string | Buffer): void;
    /**
     * Write a string with a varint length before it.
     * @param {String}
     * @param {String?} enc - Any buffer-supported Encoding.
     */
    writeVarString(value: string, enc?: BufferEncoding): void;
    /**
     * Write a null-terminated string.
     * @param {String|Buffer}
     * @param {String?} enc - Any buffer-supported Encoding.
     */
    writeNullString(value: string | Buffer, enc?: BufferEncoding): void;
    /**
     * Calculate and write a checksum for the data written so far.
     */
    writeChecksum(): void;
    /**
     * Fill N bytes with value.
     * @param {Number} value
     * @param {Number} size
     */
    fill(value: number, size: number): void;
}
