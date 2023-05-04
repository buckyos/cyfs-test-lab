/*!
 * reader.js - buffer reader for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */
/// <reference types="node" />
/**
 * An object that allows reading of buffers in a sane manner.
 * @alias module:utils.BufferReader
 * @constructor
 * @param {Buffer} data
 * @param {Boolean?} zeroCopy - Do not reallocate buffers when
 * slicing. Note that this can lead to memory leaks if not used
 * carefully.
 */
export declare class BufferReader {
    constructor(data: Buffer, zeroCopy?: boolean);
    private data;
    private offset;
    private zeroCopy;
    private stack;
    /**
     * Assertion.
     * @param {Boolean} value
     */
    assert(value: any): void;
    /**
     * Assertion.
     * @param {Boolean} value
     * @param {String} reason
     */
    enforce(value: boolean, reason: string): void;
    /**
     * Get total size of passed-in Buffer.
     * @returns {Buffer}
     */
    getSize(): number;
    /**
     * Calculate number of bytes left to read.
     * @returns {Number}
     */
    left(): number;
    /**
     * Seek to a position to read from by offset.
     * @param {Number} off - Offset (positive or negative).
     */
    seek(off: number): number;
    /**
     * Mark the current starting position.
     */
    start(): number;
    /**
     * Stop reading. Pop the start position off the stack
     * and calculate the size of the data read.
     * @returns {Number} Size.
     * @throws on empty stack.
     */
    end(): number;
    /**
     * Stop reading. Pop the start position off the stack
     * and return the data read.
     * @param {Bolean?} zeroCopy - Do a fast buffer
     * slice instead of allocating a new buffer (warning:
     * may cause memory leaks if not used with care).
     * @returns {Buffer} Data read.
     * @throws on empty stack.
     */
    endData(zeroCopy?: boolean): Buffer;
    /**
     * Destroy the reader. Remove references to the data.
     */
    destroy(): void;
    /**
     * Read uint8.
     * @returns {Number}
     */
    readU8(): number;
    /**
     * Read uint16le.
     * @returns {Number}
     */
    readU16(): number;
    /**
     * Read uint16be.
     * @returns {Number}
     */
    readU16BE(): number;
    /**
     * Read uint32le.
     * @returns {Number}
     */
    readU32(): number;
    /**
     * Read uint32be.
     * @returns {Number}
     */
    readU32BE(): number;
    /**
     * Read uint64le as a js number.
     * @returns {Number}
     * @throws on num > MAX_SAFE_INTEGER
     */
    readU64(): number;
    /**
     * Read uint64be as a js number.
     * @returns {Number}
     * @throws on num > MAX_SAFE_INTEGER
     */
    readU64BE(): number;
    /**
     * Read int8.
     * @returns {Number}
     */
    readI8(): number;
    /**
     * Read int16le.
     * @returns {Number}
     */
    readI16(): number;
    /**
     * Read int16be.
     * @returns {Number}
     */
    readI16BE(): number;
    /**
     * Read int32le.
     * @returns {Number}
     */
    readI32(): number;
    /**
     * Read int32be.
     * @returns {Number}
     */
    readI32BE(): number;
    /**
     * Read int64le as a js number.
     * @returns {Number}
     * @throws on num > MAX_SAFE_INTEGER
     */
    readI64(): number;
    /**
     * Read int64be as a js number.
     * @returns {Number}
     * @throws on num > MAX_SAFE_INTEGER
     */
    readI64BE(): number;
    /**
     * Read float le.
     * @returns {Number}
     */
    readFloat(): number;
    /**
     * Read float be.
     * @returns {Number}
     */
    readFloatBE(): number;
    /**
     * Read double float le.
     * @returns {Number}
     */
    readDouble(): number;
    /**
     * Read double float be.
     * @returns {Number}
     */
    readDoubleBE(): number;
    /**
     * Read a varint.
     * @returns {Number}
     */
    readVarint(): number;
    /**
     * Read a varint (type 2).
     * @returns {Number}
     */
    readVarint2(): number;
    /**
     * Read N bytes (will do a fast slice if zero copy).
     * @param {Number} size
     * @param {Bolean?} zeroCopy - Do a fast buffer
     * slice instead of allocating a new buffer (warning:
     * may cause memory leaks if not used with care).
     * @returns {Buffer}
     */
    readBytes(size: number, zeroCopy?: boolean): Buffer;
    /**
     * Read a varint number of bytes (will do a fast slice if zero copy).
     * @param {Bolean?} zeroCopy - Do a fast buffer
     * slice instead of allocating a new buffer (warning:
     * may cause memory leaks if not used with care).
     * @returns {Buffer}
     */
    readVarBytes(zeroCopy?: boolean): Buffer;
    /**
     * Read a string.
     * @param {String} enc - Any buffer-supported Encoding.
     * @param {Number} size
     * @returns {String}
     */
    readString(enc: BufferEncoding | undefined, size: number): string;
    /**
     * Read a 32-byte hash.
     * @param {String} enc - `"hex"` or `null`.
     * @returns {Hash|Buffer}
     */
    readHash(enc: string): string;
    readHash(): Buffer;
    /**
     * Read string of a varint length.
     * @param {String} enc - Any buffer-supported Encoding.
     * @param {Number?} limit - Size limit.
     * @returns {String}
     */
    readVarString(enc?: BufferEncoding, limit?: number): string;
    /**
     * Read a null-terminated string.
     * @param {String} enc - Any buffer-supported Encoding.
     * @returns {String}
     */
    readNullString(enc: BufferEncoding): string;
    /**
     * Create a checksum from the last start position.
     * @returns {Number} Checksum.
     */
    createChecksum(): number;
    /**
     * Verify a 4-byte checksum against a calculated checksum.
     * @returns {Number} checksum
     * @throws on bad checksum
     */
    verifyChecksum(): number;
}
