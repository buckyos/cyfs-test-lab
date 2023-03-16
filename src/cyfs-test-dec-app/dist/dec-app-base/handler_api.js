"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidParamError = exports.NotFoundError = exports.HandlerType = void 0;
const common_1 = require("../common");
var HandlerType;
(function (HandlerType) {
    HandlerType["TransFile"] = "trans-file";
    HandlerType["PrepareTransFile"] = "prepare-trans-file";
    HandlerType["UpdateContext"] = "update-context";
    HandlerType["AddContext"] = "add-context";
    HandlerType["ShareFileAddAccess"] = "share-file-add-access";
})(HandlerType = exports.HandlerType || (exports.HandlerType = {}));
exports.NotFoundError = {
    NotFound: {
        result: common_1.ErrorCode.notFound,
        msg: "NotFoundError"
    }
};
exports.InvalidParamError = {
    NotFound: {
        result: common_1.ErrorCode.invalidParam,
        msg: "InvalidParamError"
    }
};
