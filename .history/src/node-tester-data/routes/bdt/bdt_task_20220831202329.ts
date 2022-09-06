//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {BdtTask,TaskModel} from "../../model/bdt/bdt_task"

router.get("/text", (req, res) => {
    res.json({ msg: "task" });
  });
  
router.post('/add',
    async (req, res) => {
        console.info(`#receive bdt_task add request,body = ${JSON.stringify(req.body)} `)
        const testcaseInfo:TaskModel = {
            testcaseId : req.body.testcaseId,
            task_id: req.body.task_id,
            LN:req.body.LN,
            RN:req.body.RN,
            Users: req.body.Users,
            result: req.body.result,
            state:req.body.state,
            expect_status:req.body.expect_status,
        };
        let model = new BdtTask();
        let result =await  model.add(testcaseInfo);
        return res.json(result)
    
    }
);
router.post('/addList',
    async (req, res) => {
        console.info(`#receive bdt_task addList request,body = ${JSON.stringify(req.body)} `)
        let 
        const testcaseInfo:TaskModel = {
            testcaseId : req.body.testcaseId,
            task_id: req.body.task_id,
            LN:req.body.LN,
            RN:req.body.RN,
            Users: req.body.Users,
            result: req.body.result,
            state:req.body.state,
            expect_status:req.body.expect_status,
        };
        let model = new BdtTask();
        let result =await  model.add(testcaseInfo);
        return res.json(result)
    
    }
);
router.post('/add_action',
    async (req, res) => {
        console.info(`#receive bdt_task add request,body = ${JSON.stringify(req.body)} `)
        const testcaseInfo:TaskModel = {
              testcaseId : req.body.testcaseId,
              task_id: req.body.task_id,
              LN:req.body.LN,
              RN:req.body.RN,
              Users: req.body.Users,
              result: req.body.result,
              state:req.body.state,
              expect_status:req.body.expect_status,
        };
        let model = new BdtTask();
        let result =await  model.add(testcaseInfo);
        return res.json(result)
    
    }
);
