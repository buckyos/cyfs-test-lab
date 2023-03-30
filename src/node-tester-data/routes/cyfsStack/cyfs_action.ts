//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {ActionModel,CyfsAction} from "../../model/cyfsStack/cyfs_action"

router.get("/text", (req, res) => {
    res.json({ msg: "testcase" });
  });

// router.post('/add',
//     async (req, res) => {
//         console.info(`#receive CyfsAction add request,body = ${JSON.stringify(req.body)} `)
//         const actionInfo:ActionModel = {
//             testcase_id: req.body.testcase_id,
//             task_id:req.body.task_id,
//             action_id: req.body.action_id,
//             parent_action:req.body.parent_action,
//             type: req.body.type,
//             source: req.body.source,
//             target: req.body.target,
//             input_data: req.body.input_data,
//             timeout: req.body.timeout,
//             data_size: req.body.data_size,
//             opt_time: req.body.opt_time,
//             cache_size: req.body.cache_size,
//             result: req.body.result,
//             expect: req.body.expect,
//         };
//         let model = new CyfsAction();
//         let result =await  model.add(actionInfo);
//         return res.json(result)
    
//     }
// );
