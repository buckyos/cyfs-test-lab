import express from "express";
import bodyParser from "body-parser";
import * as bdtTestcase from "./routes/bdt/bdt_testcase";
import * as bdt_action from "./routes/bdt/bdt_action";
import * as bdt_task from "./routes/bdt/bdt_task";
import * as bdt_agent from "./routes/bdt/bdt_agent";
import * as bdt_client from "./routes/bdt/bdt_client";
import * as agent from "./routes/base/agent";
import * as perf from "./routes/base/agent_perf";
import * as system_info from "./routes/base/system_info";
import * as nft_info from "./routes/nft/nft_info";
import * as error from "./routes/base/error_info";
import * as cyfs_action from "./routes/cyfs/cyfs_action";
import * as cyfs_task from "./routes/cyfs/cyfs_task";
import * as cyfs_testcase from "./routes/cyfs/cyfs_testcase";
import * as cyfs_peer_info from "./routes/cyfs/cyfs_peer_info";

const app = express();

app.get('/', (req, res) => {
	res.send('Hello World');
});

//使用body-parser中间件
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


// 使用routes
app.use("/api/bdt/testcase", bdtTestcase.router);

app.use("/api/bdt/action", bdt_action.router);

app.use("/api/bdt/task", bdt_task.router);

app.use("/api/bdt/agent", bdt_agent.router);

app.use("/api/bdt/client", bdt_client.router);

app.use("/api/base/agent", agent.router);

app.use("/api/base/error", error.router);

app.use("/api/base/perf", perf.router);

app.use("/api/base/system_info", system_info.router);

app.use("/api/nft/nft_info", nft_info.router);

app.use("/api/cyfs/cyfs_action", cyfs_action.router);

app.use("/api/cyfs/cyfs_task", cyfs_task.router);

app.use("/api/cyfs/cyfs_testcase", cyfs_testcase.router);

app.use("/api/cyfs/cyfs_peer_info", cyfs_peer_info.router);

const port = process.env.PORT || 5000; //地址

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
