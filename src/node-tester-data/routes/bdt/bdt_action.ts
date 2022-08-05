//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {BdtAction,ActionModel} from "../../model/bdt/bdt_action"

router.get("/text", (req, res) => {
    res.json({ msg: "task" });
  });
  
router.post('/add',
    async (req, res) => {
        console.info(`#receive bdt_action add request,body = ${JSON.stringify(req.body)} `)
        const testcaseInfo:ActionModel = {
            testcaseId : req.body.testcaseId,
            task_id: req.body.task_id,
            action_id : req.body.action_id,
            type: req.body.type,
            LN: req.body.LN,
            RN:req.body.RN,
            Users: req.body.Users,
            parent_action:req.body.parent_action,
            config: req.body.config,
            info: req.body.info,
            fileSize: req.body.fileSize ,
            chunkSize:req.body.chunkSize ,
            connect_time:req.body.connect_time ,
            send_time:req.body.send_time ,
            set_time:req.body.set_time ,
            result:req.body.result,
            expect:req.body.expect,
        };
        let model = new BdtAction();
        let result =await  model.add(testcaseInfo);
        console.info(`bdt_action add resp ${JSON.stringify(result)}`)
        return res.json(result)
    }
);


router.post('/addList',
    async (req, res) => {
        console.info(`#receive bdt_action addList request,body = ${JSON.stringify(req.body)} `)
        let actionList:Array<ActionModel> 
        try {
            actionList = req.body.list
        } catch (error) {
            return res.json({err:1,log:"error testcase action data"})
        }
        let model = new BdtAction();
        for(let i in actionList){
            let result =await  model.add(actionList[i]);
            console.info(`bdt_action add resp ${JSON.stringify(result)}`)
            if(result.err){
                return res.json(result)
            }
        }
        return res.json({err:0,log:"add action list success"})
    }
);
