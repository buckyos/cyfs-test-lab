/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.UseProtoBufDescContent = (function() {

    /**
     * Properties of a UseProtoBufDescContent.
     * @exports IUseProtoBufDescContent
     * @interface IUseProtoBufDescContent
     * @property {Uint8Array|null} [owner] UseProtoBufDescContent owner
     */

    /**
     * Constructs a new UseProtoBufDescContent.
     * @exports UseProtoBufDescContent
     * @classdesc Represents a UseProtoBufDescContent.
     * @implements IUseProtoBufDescContent
     * @constructor
     * @param {IUseProtoBufDescContent=} [properties] Properties to set
     */
    function UseProtoBufDescContent(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * UseProtoBufDescContent owner.
     * @member {Uint8Array} owner
     * @memberof UseProtoBufDescContent
     * @instance
     */
    UseProtoBufDescContent.prototype.owner = $util.newBuffer([]);

    /**
     * Creates a new UseProtoBufDescContent instance using the specified properties.
     * @function create
     * @memberof UseProtoBufDescContent
     * @static
     * @param {IUseProtoBufDescContent=} [properties] Properties to set
     * @returns {UseProtoBufDescContent} UseProtoBufDescContent instance
     */
    UseProtoBufDescContent.create = function create(properties) {
        return new UseProtoBufDescContent(properties);
    };

    /**
     * Encodes the specified UseProtoBufDescContent message. Does not implicitly {@link UseProtoBufDescContent.verify|verify} messages.
     * @function encode
     * @memberof UseProtoBufDescContent
     * @static
     * @param {IUseProtoBufDescContent} message UseProtoBufDescContent message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UseProtoBufDescContent.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.owner != null && Object.hasOwnProperty.call(message, "owner"))
            writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.owner);
        return writer;
    };

    /**
     * Encodes the specified UseProtoBufDescContent message, length delimited. Does not implicitly {@link UseProtoBufDescContent.verify|verify} messages.
     * @function encodeDelimited
     * @memberof UseProtoBufDescContent
     * @static
     * @param {IUseProtoBufDescContent} message UseProtoBufDescContent message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UseProtoBufDescContent.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a UseProtoBufDescContent message from the specified reader or buffer.
     * @function decode
     * @memberof UseProtoBufDescContent
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {UseProtoBufDescContent} UseProtoBufDescContent
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UseProtoBufDescContent.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.UseProtoBufDescContent();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.owner = reader.bytes();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a UseProtoBufDescContent message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof UseProtoBufDescContent
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {UseProtoBufDescContent} UseProtoBufDescContent
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UseProtoBufDescContent.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a UseProtoBufDescContent message.
     * @function verify
     * @memberof UseProtoBufDescContent
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    UseProtoBufDescContent.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.owner != null && message.hasOwnProperty("owner"))
            if (!(message.owner && typeof message.owner.length === "number" || $util.isString(message.owner)))
                return "owner: buffer expected";
        return null;
    };

    /**
     * Creates a UseProtoBufDescContent message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof UseProtoBufDescContent
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {UseProtoBufDescContent} UseProtoBufDescContent
     */
    UseProtoBufDescContent.fromObject = function fromObject(object) {
        if (object instanceof $root.UseProtoBufDescContent)
            return object;
        var message = new $root.UseProtoBufDescContent();
        if (object.owner != null)
            if (typeof object.owner === "string")
                $util.base64.decode(object.owner, message.owner = $util.newBuffer($util.base64.length(object.owner)), 0);
            else if (object.owner.length)
                message.owner = object.owner;
        return message;
    };

    /**
     * Creates a plain object from a UseProtoBufDescContent message. Also converts values to other types if specified.
     * @function toObject
     * @memberof UseProtoBufDescContent
     * @static
     * @param {UseProtoBufDescContent} message UseProtoBufDescContent
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    UseProtoBufDescContent.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults)
            if (options.bytes === String)
                object.owner = "";
            else {
                object.owner = [];
                if (options.bytes !== Array)
                    object.owner = $util.newBuffer(object.owner);
            }
        if (message.owner != null && message.hasOwnProperty("owner"))
            object.owner = options.bytes === String ? $util.base64.encode(message.owner, 0, message.owner.length) : options.bytes === Array ? Array.prototype.slice.call(message.owner) : message.owner;
        return object;
    };

    /**
     * Converts this UseProtoBufDescContent to JSON.
     * @function toJSON
     * @memberof UseProtoBufDescContent
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    UseProtoBufDescContent.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return UseProtoBufDescContent;
})();

$root.UseProtoBufBodyContent = (function() {

    /**
     * Properties of a UseProtoBufBodyContent.
     * @exports IUseProtoBufBodyContent
     * @interface IUseProtoBufBodyContent
     * @property {Array.<Uint8Array>|null} [ood_list] UseProtoBufBodyContent ood_list
     * @property {Array.<Uint8Array>|null} [known_device_list] UseProtoBufBodyContent known_device_list
     * @property {string|null} [ood_work_mode] UseProtoBufBodyContent ood_work_mode
     */

    /**
     * Constructs a new UseProtoBufBodyContent.
     * @exports UseProtoBufBodyContent
     * @classdesc Represents a UseProtoBufBodyContent.
     * @implements IUseProtoBufBodyContent
     * @constructor
     * @param {IUseProtoBufBodyContent=} [properties] Properties to set
     */
    function UseProtoBufBodyContent(properties) {
        this.ood_list = [];
        this.known_device_list = [];
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * UseProtoBufBodyContent ood_list.
     * @member {Array.<Uint8Array>} ood_list
     * @memberof UseProtoBufBodyContent
     * @instance
     */
    UseProtoBufBodyContent.prototype.ood_list = $util.emptyArray;

    /**
     * UseProtoBufBodyContent known_device_list.
     * @member {Array.<Uint8Array>} known_device_list
     * @memberof UseProtoBufBodyContent
     * @instance
     */
    UseProtoBufBodyContent.prototype.known_device_list = $util.emptyArray;

    /**
     * UseProtoBufBodyContent ood_work_mode.
     * @member {string|null|undefined} ood_work_mode
     * @memberof UseProtoBufBodyContent
     * @instance
     */
    UseProtoBufBodyContent.prototype.ood_work_mode = null;

    // OneOf field names bound to virtual getters and setters
    var $oneOfFields;

    /**
     * UseProtoBufBodyContent _ood_work_mode.
     * @member {"ood_work_mode"|undefined} _ood_work_mode
     * @memberof UseProtoBufBodyContent
     * @instance
     */
    Object.defineProperty(UseProtoBufBodyContent.prototype, "_ood_work_mode", {
        get: $util.oneOfGetter($oneOfFields = ["ood_work_mode"]),
        set: $util.oneOfSetter($oneOfFields)
    });

    /**
     * Creates a new UseProtoBufBodyContent instance using the specified properties.
     * @function create
     * @memberof UseProtoBufBodyContent
     * @static
     * @param {IUseProtoBufBodyContent=} [properties] Properties to set
     * @returns {UseProtoBufBodyContent} UseProtoBufBodyContent instance
     */
    UseProtoBufBodyContent.create = function create(properties) {
        return new UseProtoBufBodyContent(properties);
    };

    /**
     * Encodes the specified UseProtoBufBodyContent message. Does not implicitly {@link UseProtoBufBodyContent.verify|verify} messages.
     * @function encode
     * @memberof UseProtoBufBodyContent
     * @static
     * @param {IUseProtoBufBodyContent} message UseProtoBufBodyContent message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UseProtoBufBodyContent.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.ood_list != null && message.ood_list.length)
            for (var i = 0; i < message.ood_list.length; ++i)
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.ood_list[i]);
        if (message.known_device_list != null && message.known_device_list.length)
            for (var i = 0; i < message.known_device_list.length; ++i)
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.known_device_list[i]);
        if (message.ood_work_mode != null && Object.hasOwnProperty.call(message, "ood_work_mode"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.ood_work_mode);
        return writer;
    };

    /**
     * Encodes the specified UseProtoBufBodyContent message, length delimited. Does not implicitly {@link UseProtoBufBodyContent.verify|verify} messages.
     * @function encodeDelimited
     * @memberof UseProtoBufBodyContent
     * @static
     * @param {IUseProtoBufBodyContent} message UseProtoBufBodyContent message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    UseProtoBufBodyContent.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a UseProtoBufBodyContent message from the specified reader or buffer.
     * @function decode
     * @memberof UseProtoBufBodyContent
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {UseProtoBufBodyContent} UseProtoBufBodyContent
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UseProtoBufBodyContent.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.UseProtoBufBodyContent();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                if (!(message.ood_list && message.ood_list.length))
                    message.ood_list = [];
                message.ood_list.push(reader.bytes());
                break;
            case 2:
                if (!(message.known_device_list && message.known_device_list.length))
                    message.known_device_list = [];
                message.known_device_list.push(reader.bytes());
                break;
            case 3:
                message.ood_work_mode = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a UseProtoBufBodyContent message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof UseProtoBufBodyContent
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {UseProtoBufBodyContent} UseProtoBufBodyContent
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    UseProtoBufBodyContent.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a UseProtoBufBodyContent message.
     * @function verify
     * @memberof UseProtoBufBodyContent
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    UseProtoBufBodyContent.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        var properties = {};
        if (message.ood_list != null && message.hasOwnProperty("ood_list")) {
            if (!Array.isArray(message.ood_list))
                return "ood_list: array expected";
            for (var i = 0; i < message.ood_list.length; ++i)
                if (!(message.ood_list[i] && typeof message.ood_list[i].length === "number" || $util.isString(message.ood_list[i])))
                    return "ood_list: buffer[] expected";
        }
        if (message.known_device_list != null && message.hasOwnProperty("known_device_list")) {
            if (!Array.isArray(message.known_device_list))
                return "known_device_list: array expected";
            for (var i = 0; i < message.known_device_list.length; ++i)
                if (!(message.known_device_list[i] && typeof message.known_device_list[i].length === "number" || $util.isString(message.known_device_list[i])))
                    return "known_device_list: buffer[] expected";
        }
        if (message.ood_work_mode != null && message.hasOwnProperty("ood_work_mode")) {
            properties._ood_work_mode = 1;
            if (!$util.isString(message.ood_work_mode))
                return "ood_work_mode: string expected";
        }
        return null;
    };

    /**
     * Creates a UseProtoBufBodyContent message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof UseProtoBufBodyContent
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {UseProtoBufBodyContent} UseProtoBufBodyContent
     */
    UseProtoBufBodyContent.fromObject = function fromObject(object) {
        if (object instanceof $root.UseProtoBufBodyContent)
            return object;
        var message = new $root.UseProtoBufBodyContent();
        if (object.ood_list) {
            if (!Array.isArray(object.ood_list))
                throw TypeError(".UseProtoBufBodyContent.ood_list: array expected");
            message.ood_list = [];
            for (var i = 0; i < object.ood_list.length; ++i)
                if (typeof object.ood_list[i] === "string")
                    $util.base64.decode(object.ood_list[i], message.ood_list[i] = $util.newBuffer($util.base64.length(object.ood_list[i])), 0);
                else if (object.ood_list[i].length)
                    message.ood_list[i] = object.ood_list[i];
        }
        if (object.known_device_list) {
            if (!Array.isArray(object.known_device_list))
                throw TypeError(".UseProtoBufBodyContent.known_device_list: array expected");
            message.known_device_list = [];
            for (var i = 0; i < object.known_device_list.length; ++i)
                if (typeof object.known_device_list[i] === "string")
                    $util.base64.decode(object.known_device_list[i], message.known_device_list[i] = $util.newBuffer($util.base64.length(object.known_device_list[i])), 0);
                else if (object.known_device_list[i].length)
                    message.known_device_list[i] = object.known_device_list[i];
        }
        if (object.ood_work_mode != null)
            message.ood_work_mode = String(object.ood_work_mode);
        return message;
    };

    /**
     * Creates a plain object from a UseProtoBufBodyContent message. Also converts values to other types if specified.
     * @function toObject
     * @memberof UseProtoBufBodyContent
     * @static
     * @param {UseProtoBufBodyContent} message UseProtoBufBodyContent
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    UseProtoBufBodyContent.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.arrays || options.defaults) {
            object.ood_list = [];
            object.known_device_list = [];
        }
        if (message.ood_list && message.ood_list.length) {
            object.ood_list = [];
            for (var j = 0; j < message.ood_list.length; ++j)
                object.ood_list[j] = options.bytes === String ? $util.base64.encode(message.ood_list[j], 0, message.ood_list[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.ood_list[j]) : message.ood_list[j];
        }
        if (message.known_device_list && message.known_device_list.length) {
            object.known_device_list = [];
            for (var j = 0; j < message.known_device_list.length; ++j)
                object.known_device_list[j] = options.bytes === String ? $util.base64.encode(message.known_device_list[j], 0, message.known_device_list[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.known_device_list[j]) : message.known_device_list[j];
        }
        if (message.ood_work_mode != null && message.hasOwnProperty("ood_work_mode")) {
            object.ood_work_mode = message.ood_work_mode;
            if (options.oneofs)
                object._ood_work_mode = "ood_work_mode";
        }
        return object;
    };

    /**
     * Converts this UseProtoBufBodyContent to JSON.
     * @function toJSON
     * @memberof UseProtoBufBodyContent
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    UseProtoBufBodyContent.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return UseProtoBufBodyContent;
})();

module.exports = $root;
