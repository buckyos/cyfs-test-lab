import {StackType, testSuiteJson} from '../../common'

export const datas :testSuiteJson = {
    system: "cyfs-stack",
    stack_type: StackType.Runtime,
    module: "NDN_File",
    testcaseList : [
        {id:"NDN_file_second_001",name:"#file 通过Router 调用 start_task 下载1Mb正常流程"},
    ]
}