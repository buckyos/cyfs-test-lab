"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.join = void 0;
function join(...paths) {
    let data = "";
    let chart = "\\";
    if (paths[0].includes("/")) {
        chart = "/";
    }
    let frist = true;
    for (let index of paths) {
        if (frist) {
            data = index;
            frist = false;
        }
        else {
            data = data + chart + index;
        }
    }
    return data;
}
exports.join = join;
