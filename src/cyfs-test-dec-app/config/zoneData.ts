
/**
 zone-simulator
| 设备  | bdt-port | http-port | ws-port |
| :----: | :----: | :----: | :----: |
|zone1-ood1   | 20001 | 21000 | 21001 |  
|zone1-device1| 20002 | 21002 | 21003 |
|zone2-device2| 20003 | 21004 | 21005 |
|zone2-ood1   | 20010 | 21010 | 21011 |  
|zone2-device1| 20011 | 21012 | 21013 |
|zone2-device2| 20012 | 21014 | 21015 |

### 运行时需要修改为本地peerId

zone1 as follows:
people:5r4MYfFQ1fLntmJfXz3VCd9wj863znAnT1pSvAhoFLAr
ood:5aSixgMDJvqTefcLUh9kupMUncuzcniNiUPJboMLYaCw
device1:5aSixgPghYRhgT6E3Dk3McttNaVNj3aM8k8Gdw6JdJ6h
device2:5aSixgRXgRYb3ivvLXtxaa3LJ4kYP6yVTYfhnWcJd7mF

zone2 as follows:
people:5r4MYfFdvQMboPwUzuyQoirhMgFK3uGfm2KqL2qSmrZa
ood:5aSixgM6yUqNzEkxvELPzisASg4q15RtpxBTWKBTwEQ9
device1:5aSixgPCAiMtvqcXYYcugzn8AbEftqCDhGjRvTSTQaLe
device2:5aSixgRxra4hgcmSt1vVqq34XrxBPy2zw7fG5GFV8dHf

**/ 
// simulator 模拟器存放位置
export const simulatorPath = `E:\\git_test\\cyfs_stack2\\cyfs_node\\zone-simulator.exe`
export const DATA_PATH = "C:\\cyfs\\\data\\zone-simulator";
export const CONFIG_PATH = "C:\\cyfs\\etc\\zone-simulator";
export const LOG_PATH = "C:\\cyfs\\log\\app\\zone-simulator";
export const simulator  = {
    zone1:{
        ood:{
            name : "zone1_ood",
            bdt_port:20001,
            http_port:21000,
            ws_port: 21001,
        },
        device1:{
            name : "zone1_device1",
            bdt_port:20002,
            http_port:21002,
            ws_port: 21003,
        },
        device2:{
            name : "zone1_device2",
            bdt_port:20003,
            http_port:21004,
            ws_port: 21005,
        },
        standby_ood:{
            name : "zone1_standby_ood",
            bdt_port:20004,
            http_port:21006,
            ws_port: 21007,
        }
        
    },
    zone2:{
        ood:{
            name : "zone2_ood",
            bdt_port:20010,
            http_port:21010,
            ws_port: 21011,
        },
        device1:{
            name : "zone2_device1",
            bdt_port:20011,
            http_port:21012,
            ws_port: 21013,
        },
        device2:{
            name : "zone2_device2",
            bdt_port:20012,
            http_port:21014,
            ws_port: 21015,
        },
        standby_ood:{
            name : "zone2_standby_ood",
            bdt_port:20013,
            http_port:21016,
            ws_port: 21017,
        }
    }
}

