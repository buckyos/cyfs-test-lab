//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {BdtTestcase,TestcaseModel} from "../../model/bdt/bdt_testcase"

router.get("/text", (req, res) => {
    res.json({ msg: "testcase" });
  });

router.post('/add',
    async (req, res) => {
        console.info(`#receive bdt_testcase add request,body = ${JSON.stringify(req.body)} `)
        const testcaseInfo:TestcaseModel = {
            TestcaseName: req.body.testcase_name,
            testcaseId : req.body.testcase_id,
            remark: req.body.remark,
            agentList:req.body.agentList,
            environment:req.body.environment,
            taskMult:  String(req.body.taskMult) ,
            result:   String(req.body.result),
            errorList:req.body.errorList,
            total:req.body.total,
            success : req.body.success!,
            failed : req.body.failed!,
            date : req.body.date,
        };
        let model = new BdtTestcase();
        let result =await  model.add(testcaseInfo);
        return res.json(result)
    
    }
);
