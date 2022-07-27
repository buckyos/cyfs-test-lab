//主要用于Login登录 register 注册
import express from "express";
export const router = express.Router();
import {ErrorInfo,ErrorModel} from "../../model/base/error_info"

router.get("/text", (req, res) => {
    res.json({ msg: "Agent" });
  });
  
router.post('/report',
    async (req, res) => {
        console.info(`#receive error report request,body = ${JSON.stringify(req.body)} `)
        if( !req.body.agent || !req.body.error_message || !req.body.testcase){
            return res.json({err:true,log:"缺少输入参数"})
        }
        let info:ErrorModel = {
            agent: req.body.agent,
            error_message: req.body.error_message, 
            error_stack: req.body.error_stack,
            testcase: req.body.testcase ,
        }
        let model = new ErrorInfo();
        let result =await  model.report(info);
        return res.json(result)
    }
);