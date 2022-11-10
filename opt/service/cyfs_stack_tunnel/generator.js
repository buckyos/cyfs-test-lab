"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringToUint8Array = exports.Uint8ArrayToString = exports.RandomGenerator = void 0;
const assert = require("assert");
const base_1 = require("../../base");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class RandomGenerator {
    static string(length = 32) {
        let maxPos = RandomGenerator.CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        while (Buffer.byteLength(result) < length) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        return result;
    }
    ;
    static integer(max, min = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
    }
    static async createRandomFile(pathDir, name, size) {
        if (!fs.pathExistsSync(pathDir)) {
            fs.mkdirpSync(pathDir);
        }
        let file = path.join(pathDir, name);
        const strRandom = RandomGenerator.string(1000);
        let len = Buffer.byteLength(strRandom, 'utf-8');
        while (size > len) {
            let err = fs.appendFileSync(file, strRandom);
            size = size - len;
        }
        fs.appendFileSync(file, RandomGenerator.string(size));
        assert(fs.pathExistsSync(file), `创建文件${path} 失败`);
    }
    static async createRandomDir(root, dirNumber, fileNumber, fileSize, deep = 1) {
        if (!fs.pathExistsSync(root)) {
            fs.mkdirpSync(root);
        }
        let dir_map = [];
        console.info(`开始生成随机文件名列表`);
        let list = [];
        for (let i = 0; i < fileNumber; i++) {
            let file_name = `${RandomGenerator.string(10)}.txt`;
            dir_map.push(file_name);
            list.push(RandomGenerator.createRandomFile(root, file_name, fileSize));
            await base_1.sleep(100);
        }
        for (let i in list) {
            await list[i];
        }
        return dir_map;
    }
}
exports.RandomGenerator = RandomGenerator;
// 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
RandomGenerator.CHAR_SET = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789'; //0123456789
;
function Uint8ArrayToString(fileData) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString;
}
exports.Uint8ArrayToString = Uint8ArrayToString;
function stringToUint8Array(str) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array;
}
exports.stringToUint8Array = stringToUint8Array;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvc2VydmljZS9jeWZzX3N0YWNrX3R1bm5lbC9nZW5lcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlDQUFrQztBQUNsQyxxQ0FBbUM7QUFDbkMsNkNBQStCO0FBQy9CLDJDQUE2QjtBQUU3QixNQUFhLGVBQWU7SUFJeEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFpQixFQUFFO1FBQzdCLElBQUksTUFBTSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQzdDLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUNoQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDOUU7UUFDRCxPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsTUFBTSxFQUFFO1lBQ3ZDLE1BQU0sSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDOUU7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBQUEsQ0FBQztJQUVGLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBVyxFQUFFLE1BQWMsQ0FBQztRQUN2QyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMzRCxJQUFJLE1BQU0sR0FBRyxHQUFHLEVBQUU7WUFDZCxNQUFNLEdBQUcsR0FBRyxDQUFDO1NBQ2hCO1FBQ0QsT0FB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LENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDeEMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDL0I7SUFFRCxJQUFJLGFBQWEsR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QyxPQUFPLGFBQWEsQ0FBQTtBQUN4QixDQUFDO0FBUkQsZ0RBUUMiLCJmaWxlIjoic2VydmljZS9jeWZzX3N0YWNrX3R1bm5lbC9nZW5lcmF0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0Jyk7XHJcbmltcG9ydCB7IHNsZWVwIH0gZnJvbSAnLi4vLi4vYmFzZSc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmcy1leHRyYVwiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUmFuZG9tR2VuZXJhdG9yIHtcclxuICAgIC8vIOm7mOiupOWOu+aOieS6huWuueaYk+a3t+a3hueahOWtl+espm9PTGwsOWdxLFZ2LFV1LEkxXHJcbiAgICBzdGF0aWMgQ0hBUl9TRVQ6IHN0cmluZyA9ICdBQkNERUZHSEpLTU5QUVJTVFdYWVphYmNkZWZoaWprbW5wcnN0d3h5ejAxMjM0NTY3ODknOyAvLzAxMjM0NTY3ODlcclxuXHJcbiAgICBzdGF0aWMgc3RyaW5nKGxlbmd0aDogbnVtYmVyID0gMzIpIHtcclxuICAgICAgICBsZXQgbWF4UG9zID0gUmFuZG9tR2VuZXJhdG9yLkNIQVJfU0VULmxlbmd0aDtcclxuICAgICAgICBsZXQgcmVzdWx0ID0gJyc7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICByZXN1bHQgKz0gUmFuZG9tR2VuZXJhdG9yLkNIQVJfU0VULmNoYXJBdChSYW5kb21HZW5lcmF0b3IuaW50ZWdlcihtYXhQb3MpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgd2hpbGUgKEJ1ZmZlci5ieXRlTGVuZ3RoKHJlc3VsdCkgPCBsZW5ndGgpIHtcclxuICAgICAgICAgICAgcmVzdWx0ICs9IFJhbmRvbUdlbmVyYXRvci5DSEFSX1NFVC5jaGFyQXQoUmFuZG9tR2VuZXJhdG9yLmludGVnZXIobWF4UG9zKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9O1xyXG5cclxuICAgIHN0YXRpYyBpbnRlZ2VyKG1heDogbnVtYmVyLCBtaW46IG51bWJlciA9IDApIHtcclxuICAgICAgICBsZXQgcmVzdWx0ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbikpICsgbWluO1xyXG4gICAgICAgIGlmIChyZXN1bHQgPiBtYXgpIHtcclxuICAgICAgICAgICAgcmVzdWx0ID0gbWF4O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG4gICAgc3RhdGljIGFzeW5jIGNyZWF0ZVJhbmRvbUZpbGUocGF0aERpcjogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIHNpemU6IG51bWJlcikge1xyXG4gICAgICAgIGlmICghZnMucGF0aEV4aXN0c1N5bmMocGF0aERpcikpIHtcclxuICAgICAgICAgICAgZnMubWtkaXJwU3luYyhwYXRoRGlyKVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgZmlsZSA9IHBhdGguam9pbihwYXRoRGlyLCBuYW1lKVxyXG4gICAgICAgIGNvbnN0IHN0clJhbmRvbSA9IFJhbmRvbUdlbmVyYXRvci5zdHJpbmcoMTAwMCk7XHJcbiAgICAgICAgbGV0IGxlbiA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN0clJhbmRvbSwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgd2hpbGUgKHNpemUgPiBsZW4pIHtcclxuICAgICAgICAgICAgbGV0IGVyciA9IGZzLmFwcGVuZEZpbGVTeW5jKGZpbGUsIHN0clJhbmRvbSk7XHJcbiAgICAgICAgICAgIHNpemUgPSBzaXplIC0gbGVuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmcy5hcHBlbmRGaWxlU3luYyhmaWxlLCBSYW5kb21HZW5lcmF0b3Iuc3RyaW5nKHNpemUpKTtcclxuICAgICAgICBhc3NlcnQoZnMucGF0aEV4aXN0c1N5bmMoZmlsZSksIGDliJvlu7rmlofku7Yke3BhdGh9IOWksei0pWApXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBhc3luYyBjcmVhdGVSYW5kb21EaXIocm9vdDogc3RyaW5nLCBkaXJOdW1iZXI6IG51bWJlciwgZmlsZU51bWJlcjogbnVtYmVyLCBmaWxlU2l6ZTogbnVtYmVyLCBkZWVwOiBudW1iZXIgPSAxKSB7XHJcbiAgICAgICAgaWYgKCFmcy5wYXRoRXhpc3RzU3luYyhyb290KSkge1xyXG4gICAgICAgICAgICBmcy5ta2RpcnBTeW5jKHJvb3QpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBkaXJfbWFwID0gW107XHJcbiAgICAgICAgY29uc29sZS5pbmZvKGDlvIDlp4vnlJ/miJDpmo/mnLrmlofku7blkI3liJfooahgKVxyXG4gICAgICAgIGxldCBsaXN0OiBBcnJheTxhbnk+ID0gW11cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpbGVOdW1iZXI7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgZmlsZV9uYW1lID0gYCR7UmFuZG9tR2VuZXJhdG9yLnN0cmluZygxMCl9LnR4dGA7XHJcbiAgICAgICAgICAgIGRpcl9tYXAucHVzaChmaWxlX25hbWUpO1xyXG4gICAgICAgICAgICBsaXN0LnB1c2goUmFuZG9tR2VuZXJhdG9yLmNyZWF0ZVJhbmRvbUZpbGUocm9vdCwgZmlsZV9uYW1lLCBmaWxlU2l6ZSkpXHJcbiAgICAgICAgICAgIGF3YWl0IHNsZWVwKDEwMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpIGluIGxpc3QpIHtcclxuICAgICAgICAgICAgYXdhaXQgbGlzdFtpXVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZGlyX21hcDtcclxuICAgIH1cclxuXHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gVWludDhBcnJheVRvU3RyaW5nKGZpbGVEYXRhOiBVaW50OEFycmF5KSB7XHJcbiAgICB2YXIgZGF0YVN0cmluZyA9IFwiXCI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbGVEYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgZGF0YVN0cmluZyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGZpbGVEYXRhW2ldKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZGF0YVN0cmluZ1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZ1RvVWludDhBcnJheShzdHI6IHN0cmluZykge1xyXG4gICAgdmFyIGFyciA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGogPSBzdHIubGVuZ3RoOyBpIDwgajsgKytpKSB7XHJcbiAgICAgICAgYXJyLnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB0bXBVaW50OEFycmF5ID0gbmV3IFVpbnQ4QXJyYXkoYXJyKTtcclxuICAgIHJldHVybiB0bXBVaW50OEFycmF5XHJcbn1cclxuXHJcbiJdfQ==
