export * from "./testcaseInfo"
export * from "./text"
export * from "./testReporter"
export * from "./agent"
export * from "./type"
// Dec App object的Type一定从32768开始，不大于65535
export const CustumObjectType = {
    Testcase: 38498,
    GitText : 38499,
    TestcaseResult: 38500,
    TestReporter:38501,
    Agent:38502,
    
}


// export type requestFileData = {
//     owner: string,
//     file_name: string,
//     id: string,
//     branch: string,
// }



// export type requestRepositoryNew = {
//     owner: string,
//     author_id: string,
//     name: string,
//     description: string,
//     is_private: number,
// }

// export type ResponseRepository = {
//     owner: string,
//     id: string,
//     name: string,
//     description: string,
//     is_private: number,
//     init: number,
//     binary_id: string,
//     date?: string
//     fork_from: string,
//     fork_repository?: ResponseRepository,
// }

// export type ResponseCommit = {
//     owner: string,
//     id: string,
//     oid: string,
//     message: string,
//     parent: string,
//     author: any,
//     date: string,
// }

// export type RequestCommits = {
//     owner: string,
//     id: string,
//     branch: string,
// }

// export type responseOptionsAuthor = {
//     id: string,
//     name: string,
// }

// export type responseUser = {
//     id: string,
//     name: string,
//     email: string,
//     date: string,
// }

// export type ResponseOrganizationList = {
//     id: string,
//     name: string,
//     email: string,
//     date: string,
// }

// export type ResponseIssue = {
//     id: string,
//     user_id: string,
//     title: string,
//     content: string,
//     status: string,
//     date: string,
//     issues?: ResponseIssue[]
//     commentLength?: number
// }

// export type ResponseIssueList = {
//     list: ResponseIssue[],
//     open: number,
//     close: number,
//     mine: number,
//     other: number,
// }

// export type ResponseMerge = {
//     id: string,
//     title: string,
//     originBranch: string,
//     targetBranch: string,
//     mergeType: string,
//     status: string,
//     date: string,
// }

// export type ResponseMergeList = {
//     list: ResponseMerge[],
//     open: number,
//     close: number,
//     mine: number,
//     other: number,
// }

// export type RequestRepositoryMergeCompare = {
//     owner: string,
//     id: string,
//     target: string,
//     origin: string,
// }

// export type RequestRepositoryMergeCreate = RequestRepositoryMergeCompare & {
//     user_id: string,
//     title: string,
//     mergeType: string,
// }


// export type RequestRepositoryMergeDetail = {
//     owner: string,
//     id: string,
//     merge_id: string,
// }

// export type RequestRepositoryHome = {
//     owner: string,
//     id: string,
//     branch: string,
// }

// export type RequestRepositoryCommit = {
//     owner: string,
//     id: string,
//     commitId: string,
// }



// export type RequestRepositoryFork = {
//     owner: string,
//     id: string,
//     user_id: string,
//     ood: string,
// }

// export type FileData = {
//     fileType: string,
//     file: string,
//     commit: string,
//     author: string,
//     date: string,
//     message: string
// }

// export type RequestIssueCreate = {
//     owner: string,
//     id: string,
//     title: string,
//     content: string,
//     user_id: string,
// }

// export type RequestIssueDetail = {
//     owner: string,
//     id: string,
//     issue_id: string,
// }

// export type RequestRepoIssue = {
//     owner: string,
//     id: string,
// }

// export type RequestUserInit = {
//     owner: string,
//     name: string,
//     email: string,
// }

// export type RequestOrganizationCreate = RequestUserInit

// export type RequestRepositoryPush = {
//     id:                 string,  // 仓库object id
//     binary:             string,
//     runtimeDeviceId:    string,
//     user_id:            string, //上传的用户
// }

// export type RequestRepositoryPushV2 = {
//     id:                 string,  // 仓库object id
//     packFileId:         string,
//     refs:               string,
//     runtimeDeviceId:    string,
//     user_id:            string, //上传的用户
// }

// export type RequestRepositoryPushHead = {
//     id:                 string,  // 仓库object id
//     branch:             string,
//     user_id:            string, //上传的用户
// }

// export type RequestRepositoryFetch = {
//     id:                 string,  // 仓库object id
//     hash:               string,
//     localHash:          string,
//     ref:                string
//     user_id:            string, //上传的用户
// }


// export type RequestRepositoryTrans = {
//     id:                 string,  // 仓库object id
//     binary:             string,
//     runtimeDeviceId:    string,
//     target:             string,
// }

// export type RequestUserSetting = {
//     userId: string,
//     owner: string,
//     name: string,
//     email: string,
// }

export type RequestTargetCommonResponse = {
    err: boolean,
    data: any
    msg: string,
}

// export type ResponseFileCommit = { commit: string, author: string, date: string, message: string }
// export type ResponseFileLineContent = { line: number, content: string }

// export type ResponseFile = {
//     fileType: string,
//     content: ResponseFileLineContent[],
//     bigFile: boolean,
//     notSupport: boolean,
//     info: ResponseFileCommit & {
//         fileSize: number
//     },
// }

// export type ResponseFineRepository = {
//     repo: string,
//     device: string,
// }


// export type ResponseAddFile = {
//     err: boolean,
//     msg: string,
//     file_id?: string,
// }

// export type ResponseCheckUser = {
//     userInit: boolean,
//     user?: ServiceResponseUserData,
// }


// export type ServiceResponseUserData = {
//     userId: string,
//     name: string,
//     email: string,
//     date: string,
// }


export type GetObjectResponse = {
    err: boolean,
    object: any,
    message: string,
}

// export type RequestRepoIssueComment = {
//     issue_id: string,
//     id: string,
//     owner: string,
//     content: string,
//     user_id: string,
// }
