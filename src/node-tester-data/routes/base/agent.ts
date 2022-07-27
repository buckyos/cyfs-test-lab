//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {Agent,AgentModel} from "../../model/base/agent"

router.get("/text", (req, res) => {
    res.json({ msg: "Agent" });
  });
  
router.post('/add',
    async (req, res) => {
        console.info(`#receive agent add request,body = ${JSON.stringify(req.body)} `)
        if( !req.body.name || !req.body.type || !req.body.agentinfo){
            return res.json({err:true,log:"缺少输入参数"})
        }
        let model = new Agent();
        let result =await  model.createAgent(req.body.name,req.body.type,req.body.agentinfo);
        return res.json(result)
    }
);
router.post('/list',
    async (req, res) => {
        console.info(`#receive agent list request,body = ${JSON.stringify(req.body)} `)
        let model = new Agent();
        let result =await  model.agentList(Number(req.body.page_index),Number(req.body.page_size));
        return res.json(result)
    }
);
router.post('/online',
    async (req, res) => {
        console.info(`#receive agent add request,body = ${JSON.stringify(req.body)} `)
        if(!req.body.name){
            return res.json({err:true,log:`缺少输入参数${JSON.stringify(req)}`})
        }
        let model = new Agent();
        let result =await  model.online(req.body.name);
        return res.json(result)
    }
);
