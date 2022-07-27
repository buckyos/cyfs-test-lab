//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {AgentPerf,AgentPerfModel} from "../../model/base/agent_perf"

router.get("/text", (req, res) => {
    res.json({ msg: "Agent" });
  });
  
router.post('/report',
    async (req, res) => {
        console.info(`#receive agent_perf report request,body = ${JSON.stringify(req.body)} `)
        if( !req.body.name){
            return res.json({err:true,log:"缺少输入参数"})
        }
        let save : AgentPerfModel = {
            name : req.body.name,
            cpu: req.body.cpu, 
            mem: req.body.mem, 
            disk: req.body.disk, 
            disk_io: req.body.disk_io, 
            net_info: req.body.net_info, 
            net_stats: req.body.net_stats, 
            process: req.body.process,
        }
        let model = new AgentPerf();
        let result =await  model.report(save);
        return res.json(result)
    }
);

