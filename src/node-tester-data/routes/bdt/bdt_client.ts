//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {BDTClientModel,BDTClient} from "../../model/bdt/bdt_client"

router.get("/text", (req, res) => {
    res.json({ msg: "testcase" });
  });

router.post('/add',
    async (req, res) => {
        console.info(`#receive bdt_client add request,body = ${JSON.stringify(req.body)} `)
        const client:BDTClientModel = {
            testcase_id : req.body.testcase_id,
            name: req.body.name,
            peerid : req.body.peerid, 
            peerInfo: req.body.peerInfo, 
            sn_resp_eps : req.body.sn_resp_eps,
            online_time : req.body.online_time,
            status : req.body.status,
        };
        let model = new BDTClient();
        let result =await  model.add(client);
        return res.json(result)
    
    }
);
router.post('/addList',
    async (req, res) => {
        console.info(`#receive bdt_client addList request,body = ${JSON.stringify(req.body)} `)
        let list :Array<BDTClientModel>  ;
        try {
            list = req.body.list 
        } catch (error) {
            return res.json({err:1,log:"error bdt client list data"})
        }
        let model = new BDTClient();
        for(let info of list){
            let result = await model.add(info);
            console.info(`bdt_client add resp ${JSON.stringify(result)}`)
            if(result.err){
                return res.json(result)
            }
        }
        return res.json({err:0,log:"add bdt client list success"})
    
    }
);

