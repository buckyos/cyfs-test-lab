//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {PeerInfoModel,PeerInfo} from "../../model/cyfs/cyfs_peer_info"

router.get("/text", (req, res) => {
    res.json({ msg: "testcase" });
  });

router.post('/add',
    async (req, res) => {
        console.info(`#receive CyfsAction add request,body = ${JSON.stringify(req.body)} `)
        const peerInfo:PeerInfoModel = {
          testcaseId: req.body.testcaseId,
          name: req.body.name,
          device_id: req.body.device_id,
          type: req.body.type,
          SDK_type: req.body.SDK_type,
          config: req.body.config,
        };
        let model = new PeerInfo();
        let result =await  model.add(peerInfo);
        return res.json(result)
    
    }
);
