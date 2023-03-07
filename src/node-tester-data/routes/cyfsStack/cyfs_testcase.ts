//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {CyfsTestcase,TestcaseModel} from "../../model/cyfsStack/cyfs_testcase"

router.get("/text", (req, res) => {
    res.json({ msg: "testcase" });
  });

// router.post('/add',
//     async (req, res) => {
//         console.info(`#receive cyfs_testcase add request,body = ${JSON.stringify(req.body)} `)
//         const testcaseInfo:TestcaseModel = {
//             testcase_name: req.body.testcase_name,
//             testcase_id : req.body.testcase_id,
//             remark: req.body.remark,
//             agentList:req.body.agentList,
//             taskList:String(req.body.taskList),
//             environment:req.body.environment,
//             taskMult:  String(req.body.taskMult) ,
//             result:   String(req.body.result),
//             errorList:req.body.errorList,
//             success : req.body.success!,
//             failed : req.body.failed!,
//             test_date : req.body.test_date!,
//         };
//         let model = new CyfsTestcase();
//         let result =await  model.add(testcaseInfo);
//         return res.json(result)
    
//     }
// );
