//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {SystemInfo,SystemInfoModel} from "../../model/base/system_info"

router.get("/text", (req, res) => {
    res.json({ msg: "Agent" });
  });
  
router.post('/report',
    async (req, res) => {
        console.info(`#receive system_info report request,body = ${JSON.stringify(req.body)} `)
        if( !req.body.name){
            return res.json({err:true,log:"缺少输入参数"})
        }
        let save : SystemInfoModel = {
            name : req.body.name,
            cpu_usage: req.body.cpu_usage, 
            total_memory: req.body.total_memory, 
            used_memory:req.body.used_memory, 
            received_bytes: req.body.received_bytes, 
            transmitted_bytes: req.body.transmitted_bytes, 
            ssd_disk_total:req.body.ssd_disk_total, 
            ssd_disk_avail: req.body.ssd_disk_avail, 
            hdd_disk_total: req.body.hdd_disk_total, 
            hdd_disk_avail:req.body.hdd_disk_avail, 
            testcaseId:req.body.testcaseId,
        }
        let model = new SystemInfo();
        let result =await  model.report(save);
        return res.json(result)
    }
);

