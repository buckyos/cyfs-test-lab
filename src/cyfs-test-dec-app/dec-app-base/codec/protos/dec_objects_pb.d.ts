// package: 
// file: dec_objects.proto

import * as jspb from "google-protobuf";

export class TextDescContent extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getHeader(): string;
  setHeader(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TextDescContent.AsObject;
  static toObject(includeInstance: boolean, msg: TextDescContent): TextDescContent.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TextDescContent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TextDescContent;
  static deserializeBinaryFromReader(message: TextDescContent, reader: jspb.BinaryReader): TextDescContent;
}

export namespace TextDescContent {
  export type AsObject = {
    id: string,
    header: string,
  }
}

export class TextContent extends jspb.Message {
  getValue(): string;
  setValue(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TextContent.AsObject;
  static toObject(includeInstance: boolean, msg: TextContent): TextContent.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TextContent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TextContent;
  static deserializeBinaryFromReader(message: TextContent, reader: jspb.BinaryReader): TextContent;
}

export namespace TextContent {
  export type AsObject = {
    value: string,
  }
}

export class HandlerRequestDescContent extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getRequestType(): string;
  setRequestType(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HandlerRequestDescContent.AsObject;
  static toObject(includeInstance: boolean, msg: HandlerRequestDescContent): HandlerRequestDescContent.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HandlerRequestDescContent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HandlerRequestDescContent;
  static deserializeBinaryFromReader(message: HandlerRequestDescContent, reader: jspb.BinaryReader): HandlerRequestDescContent;
}

export namespace HandlerRequestDescContent {
  export type AsObject = {
    id: string,
    requestType: string,
  }
}

export class HandlerRequestContent extends jspb.Message {
  getRequestJson(): string;
  setRequestJson(value: string): void;

  hasRequestBuffer(): boolean;
  clearRequestBuffer(): void;
  getRequestBuffer(): Uint8Array | string;
  getRequestBuffer_asU8(): Uint8Array;
  getRequestBuffer_asB64(): string;
  setRequestBuffer(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): HandlerRequestContent.AsObject;
  static toObject(includeInstance: boolean, msg: HandlerRequestContent): HandlerRequestContent.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: HandlerRequestContent, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): HandlerRequestContent;
  static deserializeBinaryFromReader(message: HandlerRequestContent, reader: jspb.BinaryReader): HandlerRequestContent;
}

export namespace HandlerRequestContent {
  export type AsObject = {
    requestJson: string,
    requestBuffer: Uint8Array | string,
  }
}

