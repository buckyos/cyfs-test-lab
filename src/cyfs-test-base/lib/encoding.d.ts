/*!
 * encoding.js - encoding utils for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */
/// <reference types="node" />
export declare class Encoding {
    /**
     * An empty buffer.
     * @const {Buffer}
     * @default
     */
    static DUMMY: Buffer;
    /**
     * A hash of all zeroes with a `1` at the
     * end (used for the SIGHASH_SINGLE bug).
     * @const {Buffer}
     * @default
     */
    static ONE_HASH: Buffer;
    /**
     * A hash of all zeroes.
     * @const {Buffer}
     * @default
     */
    static ZERO_HASH: Buffer;
    /**
     * A hash of all 0xff.
     * @const {Buffer}
     * @default
     */
    static MAX_HASH: Buffer;
    /**
     * A hash of all zeroes.
     * @const {String}
     * @default
     */
    static NULL_HASH: string;
    /**
     * A hash of all 0xff.
     * @const {String}
     * @default
     */
    static HIGH_HASH: string;
    /**
     * A hash of all zeroes.
     * @const {Buffer}
     * @default
     */
    static ZERO_HASH160: Buffer;
    /**
     * A hash of all 0xff.
     * @const {String}
     * @default
     */
    static MAX_HASH160: Buffer;
    /**
     * A hash of all zeroes.
     * @const {String}
     * @default
     */
    static NULL_HASH160: string;
    /**
     * A hash of all 0xff.
     * @const {String}
     * @default
     */
    static HIGH_HASH160: string;
    /**
     * A compressed pubkey of all zeroes.
     * @const {Buffer}
     * @default
     */
    static ZERO_KEY: Buffer;
    /**
     * A 73 byte signature of all zeroes.
     * @const {Buffer}
     * @default
     */
    static ZERO_SIG: Buffer;
    /**
     * A 64 byte signature of all zeroes.
     * @const {Buffer}
     * @default
     */
    static ZERO_SIG64: Buffer;
    /**
     * 4 zero bytes.
     * @const {Buffer}
     * @default
     */
    static ZERO_U32: Buffer;
    /**
     * 8 zero bytes.
     * @const {Buffer}
     * @default
     */
    static ZERO_U64: Buffer;
    /**
     * Read uint64le as a js number.
     * @param {Buffer} data
     * @param {Number} off
     * @returns {Number}
     * @throws on num > MAX_SAFE_INTEGER
     */
    static readU64(data: Buffer, off: number): number;
    /**
     * Read uint64be as a js number.
     * @param {Buffer} data
     * @param {Number} off
     * @returns {Number}
     * @throws on num > MAX_SAFE_INTEGER
     */
    static readU64BE(data: Buffer, off: number): number;
    /**
     * Read int64be as a js number.
     * @param {Buffer} data
     * @param {Number} off
     * @returns {Number}
     * @throws on num > MAX_SAFE_INTEGER
     */
    static readI64(data: Buffer, off: number): number;
    /**
     * Read int64be as a js number.
     * @param {Buffer} data
     * @param {Number} off
     * @returns {Number}
     * @throws on num > MAX_SAFE_INTEGER
     */
    static readI64BE(data: Buffer, off: number): number;
    /**
     * Write a javascript number as a uint64le.
     * @param {Buffer} dst
     * @param {Number} num
     * @param {Number} off
     * @returns {Number} Buffer offset.
     * @throws on num > MAX_SAFE_INTEGER
     */
    static writeU64(dst: Buffer, num: number, off: number): number;
    /**
     * Write a javascript number as a uint64be.
     * @param {Buffer} dst
     * @param {Number} num
     * @param {Number} off
     * @returns {Number} Buffer offset.
     * @throws on num > MAX_SAFE_INTEGER
     */
    static writeU64BE(dst: Buffer, num: number, off: number): number;
    /**
     * Write a javascript number as an int64le.
     * @param {Buffer} dst
     * @param {Number} num
     * @param {Number} off
     * @returns {Number} Buffer offset.
     * @throws on num > MAX_SAFE_INTEGER
     */
    static writeI64(dst: Buffer, num: number, off: number): number;
    /**
     * Write a javascript number as an int64be.
     * @param {Buffer} dst
     * @param {Number} num
     * @param {Number} off
     * @returns {Number} Buffer offset.
     * @throws on num > MAX_SAFE_INTEGER
     */
    static writeI64BE(dst: Buffer, num: number, off: number): number;
    /**
     * Read a varint.
     * @param {Buffer} data
     * @param {Number} off
     * @returns {Object}
     */
    static readVarint(data: Buffer, off: number): Varint;
    /**
     * Write a varint.
     * @param {Buffer} dst
     * @param {Number} num
     * @param {Number} off
     * @returns {Number} Buffer offset.
     */
    static writeVarint(dst: Buffer, num: number, off: number): number;
    /**
     * Calculate size of varint.
     * @param {Number} num
     * @returns {Number} size
     */
    static sizeVarint(num: number): 9 | 1 | 5 | 3;
    /**
     * Read a varint (type 2).
     * @param {Buffer} data
     * @param {Number} off
     * @returns {Object}
     */
    static readVarint2(data: Buffer, off: number): Varint;
    /**
     * Write a varint (type 2).
     * @param {Buffer} dst
     * @param {Number} num
     * @param {Number} off
     * @returns {Number} Buffer offset.
     */
    static writeVarint2(dst: Buffer, num: number, off: number): number;
    /**
     * Calculate size of varint (type 2).
     * @param {Number} num
     * @returns {Number} size
     */
    static sizeVarint2(num: number): number;
    /**
     * Serialize number as a u8.
     * @param {Number} num
     * @returns {Buffer}
     */
    static U8(num: number): Buffer;
    /**
     * Serialize number as a u32le.
     * @param {Number} num
     * @returns {Buffer}
     */
    static U32(num: number): Buffer;
    /**
     * Serialize number as a u32be.
     * @param {Number} num
     * @returns {Buffer}
     */
    static U32BE(num: number): Buffer;
    /**
     * Get size of varint-prefixed bytes.
     * @param {Buffer} data
     * @returns {Number}
     */
    static sizeVarBytes(data: Buffer): number;
    /**
     * Get size of varint-prefixed length.
     * @param {Number} len
     * @returns {Number}
     */
    static sizeVarlen(len: number): number;
    /**
     * Get size of varint-prefixed string.
     * @param {String} str
     * @returns {Number}
     */
    static sizeVarString(str: string, enc?: string): number;
}
/**
 * EncodingError
 * @constructor
 * @param {Number} offset
 * @param {String} reason
 */
export declare class EncodingError extends Error {
    type: string;
    constructor(offset: number | string, reason: string | undefined, start?: any);
}
declare class Varint {
    size: number;
    value: number;
    constructor(size: number, value: number);
}
export {};
