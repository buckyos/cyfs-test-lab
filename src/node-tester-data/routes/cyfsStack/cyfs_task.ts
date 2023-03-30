//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {TaskModel,CyfsTask} from "../../model/cyfsStack/cyfs_task"

router.get("/text", (req, res) => {
    res.json({ msg: "testcase" });
  });

// router.post('/add',
//     async (req, res) => {
//         console.info(`#receive cyfs_task add request,body = ${JSON.stringify(req.body)} `)
//         const taskInfo:TaskModel = {
//             testcase_id : req.body.testcase_id,
//             task_id: req.body.task_id,
//             LN:req.body.LN,
//             RN:req.body.RN,
//             clients:req.body.clients,
//             action:req.body.action,
//             child_action:req.body.child_action,
//             expect: req.body.expect,
//             result: req.body.result,
//             state:req.body.state,
//             timeout:req.body.timeout,
//         };
//         let model = new CyfsTask();
//         let result =await  model.add(taskInfo);
//         return res.json(result)
    
//     }
// );
