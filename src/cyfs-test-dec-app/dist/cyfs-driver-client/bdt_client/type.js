"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionAbstract = exports.BDTERROR = exports.NAT_Type = void 0;
var NAT_Type;
(function (NAT_Type) {
    NAT_Type[NAT_Type["Public"] = 0] = "Public";
    NAT_Type[NAT_Type["FullCone"] = 1] = "FullCone";
    NAT_Type[NAT_Type["RestrictedCone"] = 1] = "RestrictedCone";
    NAT_Type[NAT_Type["PortRestrictedCone"] = 2] = "PortRestrictedCone";
    NAT_Type[NAT_Type["Symmetric"] = 3] = "Symmetric";
})(NAT_Type = exports.NAT_Type || (exports.NAT_Type = {}));
//错误编码
exports.BDTERROR = {
    success: 0,
    AgentError: 1,
    reportDataFailed: 3,
    testDataError: 4,
    timeout: 5,
    Expection: 6,
    NATExpectError: 15,
    optExpectError: 16,
    NotFound: 104,
    ConnCloesd: 105,
    ExpectionResult: 500,
    perfTestError: 501,
    // BDT 操作报错
    BDTTimeout: 1000,
    AddDeviceError: 1001,
    BDTClientTimeout: 1002,
    CalculateChunkError: 1003,
    SetChunkError: 1004,
    InterestChunkError: 1005,
    CheckChunkError: 1005,
    connnetFailed: 1006,
    acceptFailed: 1007,
    confirmFailed: 1008,
    sendDataFailed: 1009,
    recvDataFailed: 1010,
    initPeerFailed: 1011,
    destoryPeerFailed: 1012,
    setChunckFailed: 1013,
    interestChunkFailed: 1014,
    sendFileByChunkFailed: 1015,
    CloseConnectionFailed: 1016,
    DestoryStackFailed: 1017,
    RNCheckConnFailed: 1018,
    // 测试数据生成类型的报错
    RandFileError: 20000,
    GetCachePathError: 20001,
};
;
class ActionAbstract {
}
exports.ActionAbstract = ActionAbstract;
