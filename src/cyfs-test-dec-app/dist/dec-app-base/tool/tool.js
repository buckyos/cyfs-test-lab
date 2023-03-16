"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.string_to_Uint8Array = exports.Uint8Array_to_string = void 0;
function Uint8Array_to_string(fileData) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString;
}
exports.Uint8Array_to_string = Uint8Array_to_string;
function string_to_Uint8Array(str) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array;
}
exports.string_to_Uint8Array = string_to_Uint8Array;
