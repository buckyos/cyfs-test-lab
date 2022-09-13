import * as jspb from "google-protobuf";
/** Properties of a UseProtoBufDescContent. */

export class UseProtoBufDescContent extends jspb.Message {
    getOwner(): Uint8Array | string;
    getOwner_asU8(): Uint8Array;
    getOwner_asB64(): string;
    setOwner(value: Uint8Array | string): void;
  
    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UseProtoBufDescContent.AsObject;
    static toObject(includeInstance: boolean, msg: UseProtoBufDescContent): UseProtoBufDescContent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UseProtoBufDescContent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UseProtoBufDescContent;
    static deserializeBinaryFromReader(message: UseProtoBufDescContent, reader: jspb.BinaryReader): UseProtoBufDescContent;
  }

export namespace UseProtoBufDescContent {
  export type AsObject = {
    owner: Uint8Array | string,
  }
}

export class UseProtoBufBodyContent extends jspb.Message {
  clearOodListList(): void;
  getOodListList(): Array<Uint8Array | string>;
  getOodListList_asU8(): Array<Uint8Array>;
  getOodListList_asB64(): Array<string>;
  setOodListList(value: Array<Uint8Array | string>): void;
  addOodList(value: Uint8Array | string, index?: number): Uint8Array | string;

  clearKnownDeviceListList(): void;
  getKnownDeviceListList(): Array<Uint8Array | string>;
  getKnownDeviceListList_asU8(): Array<Uint8Array>;
  getKnownDeviceListList_asB64(): Array<string>;
  setKnownDeviceListList(value: Array<Uint8Array | string>): void;
  addKnownDeviceList(value: Uint8Array | string, index?: number): Uint8Array | string;

  hasOodWorkMode(): boolean;
  clearOodWorkMode(): void;
  getOodWorkMode(): string;
  setOodWorkMode(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UseProtoBufBodyContent.AsObject;
  static toObject(includeInstance: boolean, msg: UseProtoBufBodyContent): UseProtoBufBodyContent.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: UseProtoBufBodyContent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UseProtoBufBodyContent;
  static deserializeBinaryFromReader(message: UseProtoBufBodyContent, reader: jspb.BinaryReader): UseProtoBufBodyContent;
}

export namespace UseProtoBufBodyContent {
  export type AsObject = {
    oodListList: Array<Uint8Array | string>,
    knownDeviceListList: Array<Uint8Array | string>,
    oodWorkMode: string,
  }
}