import * as $protobuf from "protobufjs";
/** Properties of a UseProtoBufDescContent. */
export interface IUseProtoBufDescContent {

    /** UseProtoBufDescContent owner */
    owner?: (Uint8Array|null);
}

/** Represents a UseProtoBufDescContent. */
export class UseProtoBufDescContent implements IUseProtoBufDescContent {

    /**
     * Constructs a new UseProtoBufDescContent.
     * @param [properties] Properties to set
     */
    constructor(properties?: IUseProtoBufDescContent);

    /** UseProtoBufDescContent owner. */
    public owner: Uint8Array;

    /**
     * Creates a new UseProtoBufDescContent instance using the specified properties.
     * @param [properties] Properties to set
     * @returns UseProtoBufDescContent instance
     */
    public static create(properties?: IUseProtoBufDescContent): UseProtoBufDescContent;

    /**
     * Encodes the specified UseProtoBufDescContent message. Does not implicitly {@link UseProtoBufDescContent.verify|verify} messages.
     * @param message UseProtoBufDescContent message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IUseProtoBufDescContent, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified UseProtoBufDescContent message, length delimited. Does not implicitly {@link UseProtoBufDescContent.verify|verify} messages.
     * @param message UseProtoBufDescContent message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IUseProtoBufDescContent, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a UseProtoBufDescContent message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns UseProtoBufDescContent
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): UseProtoBufDescContent;

    /**
     * Decodes a UseProtoBufDescContent message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns UseProtoBufDescContent
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): UseProtoBufDescContent;

    /**
     * Verifies a UseProtoBufDescContent message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a UseProtoBufDescContent message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns UseProtoBufDescContent
     */
    public static fromObject(object: { [k: string]: any }): UseProtoBufDescContent;

    /**
     * Creates a plain object from a UseProtoBufDescContent message. Also converts values to other types if specified.
     * @param message UseProtoBufDescContent
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: UseProtoBufDescContent, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this UseProtoBufDescContent to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a UseProtoBufBodyContent. */
export interface IUseProtoBufBodyContent {

    /** UseProtoBufBodyContent ood_list */
    ood_list?: (Uint8Array[]|null);

    /** UseProtoBufBodyContent known_device_list */
    known_device_list?: (Uint8Array[]|null);

    /** UseProtoBufBodyContent ood_work_mode */
    ood_work_mode?: (string|null);
}

/** Represents a UseProtoBufBodyContent. */
export class UseProtoBufBodyContent implements IUseProtoBufBodyContent {

    /**
     * Constructs a new UseProtoBufBodyContent.
     * @param [properties] Properties to set
     */
    constructor(properties?: IUseProtoBufBodyContent);

    /** UseProtoBufBodyContent ood_list. */
    public ood_list: Uint8Array[];

    /** UseProtoBufBodyContent known_device_list. */
    public known_device_list: Uint8Array[];

    /** UseProtoBufBodyContent ood_work_mode. */
    public ood_work_mode?: (string|null);

    /** UseProtoBufBodyContent _ood_work_mode. */
    public _ood_work_mode?: "ood_work_mode";

    /**
     * Creates a new UseProtoBufBodyContent instance using the specified properties.
     * @param [properties] Properties to set
     * @returns UseProtoBufBodyContent instance
     */
    public static create(properties?: IUseProtoBufBodyContent): UseProtoBufBodyContent;

    /**
     * Encodes the specified UseProtoBufBodyContent message. Does not implicitly {@link UseProtoBufBodyContent.verify|verify} messages.
     * @param message UseProtoBufBodyContent message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IUseProtoBufBodyContent, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified UseProtoBufBodyContent message, length delimited. Does not implicitly {@link UseProtoBufBodyContent.verify|verify} messages.
     * @param message UseProtoBufBodyContent message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IUseProtoBufBodyContent, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a UseProtoBufBodyContent message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns UseProtoBufBodyContent
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): UseProtoBufBodyContent;

    /**
     * Decodes a UseProtoBufBodyContent message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns UseProtoBufBodyContent
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): UseProtoBufBodyContent;

    /**
     * Verifies a UseProtoBufBodyContent message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a UseProtoBufBodyContent message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns UseProtoBufBodyContent
     */
    public static fromObject(object: { [k: string]: any }): UseProtoBufBodyContent;

    /**
     * Creates a plain object from a UseProtoBufBodyContent message. Also converts values to other types if specified.
     * @param message UseProtoBufBodyContent
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: UseProtoBufBodyContent, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this UseProtoBufBodyContent to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}
