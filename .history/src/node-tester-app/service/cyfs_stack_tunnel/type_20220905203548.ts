export type BdtLpcCommand = {
    seq?: number; // 请求序列号
    bytes?: Buffer; // Buffer数据
    json: {name: string, id: string} & any
};
