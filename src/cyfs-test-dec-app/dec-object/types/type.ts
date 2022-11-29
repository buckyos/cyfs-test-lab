import * as cyfs from "../../cyfs"

export enum CustumObjectType {
    Testcase = 20000,
    Task = 20001,
    Action = 20002,
}

export type TestcaseDescType = {
    testcaseName: cyfs.BuckyString;
}

export type TestcaseBodyType = {
    remark: cyfs.BuckyString;
    environment: cyfs.BuckyString;
    taskMult: cyfs.BuckyNumber;
    total: cyfs.BuckyNumber;
    success: cyfs.BuckyNumber;
    failed: cyfs.BuckyNumber;
    result: cyfs.BuckyString;
    errorList: cyfs.BuckyString;
    createTime: cyfs.BuckyString;
}
export type TestcaseType = {
    desc: TestcaseDescType,
    body: TestcaseBodyType
}


export type TaskDescType = {
    testcaseName: cyfs.BuckyString;
}

export type TaskeBodyType = {
    remark: cyfs.BuckyString;
    environment: cyfs.BuckyString;
    taskMult: cyfs.BuckyNumber;
    total: cyfs.BuckyNumber;
    success: cyfs.BuckyNumber;
    failed: cyfs.BuckyNumber;
    result: cyfs.BuckyString;
    errorList: cyfs.BuckyString;
    createTime: cyfs.BuckyString;
}
export type TaskType = {
    desc: TaskDescType,
    body: TaskeBodyType
}

