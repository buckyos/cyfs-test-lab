export type BdtLpcCommand = {
    seq?: number;
    bytes?: Buffer;
    json: {name: string, id: string} & any
};
