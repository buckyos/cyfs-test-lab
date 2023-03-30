const path = require('path');
const koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
// const koaStatic = require('koa-static');
// const mount = require('koa-mount');

const {middlewareHandleError, middlewareCORS} = require('./common/network.js');
const base = require('./common/base');

async function RunAgentControl(agentMgr, Config) {

    const app = new koa();
    const router = new Router();

    const getRequestProcessor = (fun, method) => {
        const onRequest = async (ctx) => {
            base.blog.info(method, 'request:', JSON.stringify(ctx.request.body));
            await fun(ctx);
            base.blog.info(method, 'responce:', JSON.stringify(ctx.body));
        };
        return onRequest;
    };

    router.post('/agent/update', getRequestProcessor((ctx) => agentMgr.handleAgentUpdate(ctx), '/agent/update'));
    router.post('/agent/remove', getRequestProcessor((ctx) => agentMgr.handleAgentRemove(ctx), '/agent/remove'));
    router.post('/agent/list', getRequestProcessor((ctx) => agentMgr.handleAgentList(ctx), '/agent/list'));
    router.post('/agent/worklist', getRequestProcessor((ctx) => agentMgr.handleAgentWorkList(ctx), '/agent/worklist'));
    router.post('/agent/detail', getRequestProcessor((ctx) => agentMgr.handleAgentDetail(ctx), '/agent/detail'));
    router.post('/service/add', getRequestProcessor((ctx) => agentMgr.handleServiceAdd(ctx), '/service/add'));
    router.post('/service/remove', getRequestProcessor((ctx) => agentMgr.handleServiceRemove(ctx), '/service/remove'));
    router.post('/service/update', getRequestProcessor((ctx) => agentMgr.handleServiceUpdate(ctx), '/service/update'));
    router.post('/service/list', getRequestProcessor((ctx) => agentMgr.handleServiceList(ctx), '/service/list'));
    router.post('/service/listmini', getRequestProcessor((ctx) => agentMgr.handleServiceListMini(ctx), '/service/listmini'));
    router.post('/service/detail', getRequestProcessor((ctx) => agentMgr.handleServiceDetail(ctx), '/service/detail'));
    router.post('/service/stop', getRequestProcessor((ctx) => agentMgr.handleServiceStop(ctx), '/service/stop'));
    router.post('/task/add', getRequestProcessor((ctx) => agentMgr.handleTaskAdd(ctx), '/task/add'));
    router.post('/task/remove', getRequestProcessor((ctx) => agentMgr.handleTaskRemove(ctx), '/task/remove'));
    router.post('/task/update', getRequestProcessor((ctx) => agentMgr.handleTaskUpdate(ctx), '/task/update'));
    router.post('/task/list', getRequestProcessor((ctx) => agentMgr.handleTaskList(ctx), '/task/list'));
    router.post('/task/listmini', getRequestProcessor((ctx) => agentMgr.handleTaskListMini(ctx), '/task/listmini'));
    router.post('/task/detail', getRequestProcessor((ctx) => agentMgr.handleTaskDetail(ctx), '/task/detail'));
    router.post('/job/add', getRequestProcessor((ctx) => agentMgr.handleJobAdd(ctx), '/job/add'));
    router.post('/job/remove', getRequestProcessor((ctx) => agentMgr.handleJobRemove(ctx), '/job/remove'));
    router.post('/job/update', getRequestProcessor((ctx) => agentMgr.handleJobUpdate(ctx), '/job/update'));
    router.post('/job/list', getRequestProcessor((ctx) => agentMgr.handleJobList(ctx), '/job/list'));
    router.post('/job/listtask', getRequestProcessor((ctx) => agentMgr.handleJobListTask(ctx), '/job/listtask'));
    router.post('/job/taskresult', getRequestProcessor((ctx) => agentMgr.handleTaskResult(ctx), '/job/taskresult'));
    router.post('/job/start', getRequestProcessor((ctx) => agentMgr.handleJobStart(ctx), '/job/start'));
    router.post('/job/stop', getRequestProcessor((ctx) => agentMgr.handleJobStop(ctx), '/job/stop'));

    router.post('/system/query', getRequestProcessor((ctx) => agentMgr.handleSystemQuery(ctx), '/system/query'));
    router.post('/system/prepublish', getRequestProcessor((ctx) => agentMgr.handleSystemPrePublish(ctx), '/system/prepublish'));
    router.post('/system/publish', getRequestProcessor((ctx) => agentMgr.handleSystemPublish(ctx), '/system/publish'));
    router.post('/system/lastpublish', getRequestProcessor((ctx) => agentMgr.handleSystemLastPublish(ctx), '/system/lastpublish'));

    app.use(middlewareHandleError());
    app.use(middlewareCORS());

    app.use(bodyParser());
    app.use(router.routes());

    let port = Config.control.port || 1109;
    base.blog.info('Listen on port: http://127.0.0.1:' + port);
    app.listen(port, '127.0.0.1');
}

module.exports = RunAgentControl;