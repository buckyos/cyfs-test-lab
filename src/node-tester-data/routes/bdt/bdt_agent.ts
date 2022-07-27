//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {BDTAgentModel,BdtAgent} from "../../model/bdt/bdt_agent"

router.get("/text", (req, res) => {
    res.json({ msg: "testcase" });
  });

router.post('/add',
    async (req, res) => {
        console.info(`#receive bdt_agent add request,body = ${JSON.stringify(req.body)} `)
        const testcaseInfo:BDTAgentModel = {
            testcaseId : req.body.testcaseId,
            name: req.body.name,
            NAT: req.body.NAT,
            eps: req.body.eps ,
            agentMult: req.body.agentMult,
            resp_ep_type: req.body.resp_ep_type,
            agentid: req.body.agentid,
            logType: req.body.logType ,
            report_time: req.body.report_time ,
            chunk_cache: req.body.chunk_cache ,
            firstQA_answer: req.body.firstQA_answer,
            PN: req.body.PN,
        };
        let model = new BdtAgent();
        let result =await  model.add(testcaseInfo);
        return res.json(result)
    
    }
);
