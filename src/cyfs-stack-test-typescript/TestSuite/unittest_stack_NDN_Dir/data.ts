import {testSuiteJson} from '../../common' 
export const datas :testSuiteJson = {
system:"cyfs-stack",
module : "NDN_Dir",
testcaseList : [
{id:"NDN_dir_handler_001",name:"#dir 下载通过Router 调用 start_task下载，上传端：device1 下载端:跨zone ood 正常流程"},
{id:"NDN_dir_zone_fileNum_005",name:"#dir 下载,文件数量为10000"},
{id:"NDN_dir_zone_fileNum_004",name:"#dir 下载,文件数量为1000"},
{id:"NDN_dir_zone_fileNum_003",name:"#dir 下载,文件数量为100"},
{id:"NDN_dir_zone_fileNum_002",name:"#dir 下载,文件数量为10"},
{id:"NDN_dir_zone_fileNum_001",name:"#dir 下载,文件数量为1"},
{id:"NDN_dir_zone_router_008",name:"#dir 下载通过Router 调用 start_task下载，上传端：ood 下载端:跨zone device1 正常流程"},
{id:"NDN_dir_zone_router_007",name:"#dir 下载通过Router 调用 start_task下载，上传端：ood 下载端:跨zone ood 正常流程"},
{id:"NDN_dir_zone_router_006",name:"#dir 下载通过Router 调用 start_task下载，上传端：ood 下载端:同zone device2 正常流程"},
{id:"NDN_dir_zone_router_005",name:"#dir 下载通过Router 调用 start_task下载，上传端：device1 下载端:跨zone device1 正常流程"},
{id:"NDN_dir_zone_router_004",name:"#dir 下载通过Router 调用 start_task下载，上传端：device1 下载端:跨zone ood 正常流程"},
{id:"NDN_dir_zone_router_003",name:"#dir 下载通过Router 调用 start_task下载，上传端：device1 下载端:同zone device2 正常流程"},
{id:"NDN_dir_zone_router_002",name:"#dir 下载通过Router 调用 start_task下载，上传端：device1 下载端:同zone ood 正常流程"},
{id:"NDN_dir_zone_router_001",name:"#dir 下载通过NDN 调用 start_task下载，上传端：device1 下载端：本地 正常流程"},
{id:"NDN_dir_zone_ndn_004",name:"#dir 下载通过Router 调用 start_task下载，上传端：ood 下载端：同Zone device2 正常流程"},
{id:"NDN_dir_zone_ndn_003",name:"#dir 下载通过NDN 调用 start_task下载，上传端：device1 下载端：同Zone device2 正常流程"},
{id:"NDN_dir_zone_ndn_002",name:"#dir 下载通过NDN 调用 start_task下载，上传端：device1 下载端：同Zone OOD 正常流程"},
{id:"NDN_dir_zone_ndn_001",name:"#dir 下载通过NDN 调用 start_task下载，上传端：device1 下载端：本地 正常流程"},
{id:"NDN_dir_zone_ndc_001",name:"#dir 下载通过NDC 调用 start_task 正常流程"},
]
}