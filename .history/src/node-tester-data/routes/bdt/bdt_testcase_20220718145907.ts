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
            TestcaseName: req.body.TestcaseName,
            testcaseId : req.body.testcaseId,
            remark: req.body.remark,
            agentList:req.body.agentList,
            taskList:req.body.taskList,
            environment:req.body.environment,
            taskMult:  String(req.body.taskMult) ,
            result:   String(req.body.result),
            errorList:req.body.errorList,
            success : req.body.success!,
            failed : req.body.failed!,
            date : req.body.date,
        };
        let model = new BdtTestcase();
        let result =await  model.add(testcaseInfo);
        return res.json(result)
    
    }
);
