"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceMain = void 0;
const peer_manager_1 = require("./peer_manager");
async function ServiceMain(_interface) {
    _interface.getLogger().info(`=========start service namespace=${JSON.stringify(_interface.getNamespace())}`);
    let manager = peer_manager_1.BdtPeerManager.createInstance(_interface);
    await manager.init();
    _interface.registerApi('startPeerClient', async (from, bytes, param) => {
        _interface.getLogger().debug(`remote call startPeer`);
        let startInfo = await manager.startPeer(param.RUST_LOG);
        if (startInfo.err) {
            return { err: startInfo.err, bytes: Buffer.from(''), value: {} };
        }
        return { err: startInfo.err, bytes: Buffer.from(""), value: { peerName: startInfo.peerName } };
    });
    // send command to bdt-tools
    _interface.registerApi('sendBdtLpcCommand', async (from, bytes, param) => {
        var _a, _b, _c, _d;
        _interface.getLogger().debug(`remote ${from.agentid} call sendBdtLpcCommand ${param.name}`);
        let result = await manager.sendBdtLpcCommand({ json: param, bytes });
        // set resp package
        let respBytes = Buffer.from('');
        let respJson = {};
        if ((_a = result.resp) === null || _a === void 0 ? void 0 : _a.bytes) {
            respBytes = (_b = result.resp) === null || _b === void 0 ? void 0 : _b.bytes;
        }
        if ((_c = result.resp) === null || _c === void 0 ? void 0 : _c.json) {
            respJson = (_d = result.resp) === null || _d === void 0 ? void 0 : _d.json;
        }
        return { err: result.err, bytes: respBytes, value: respJson };
    });
    // send command to bdt-tools ,local create handler,Listener event from bdt-tools
    _interface.registerApi('createBdtLpcListener', async (from, bytes, param) => {
        var _a, _b, _c, _d;
        _interface.getLogger().debug(`remote call createBdtLpcListener ${param.name} `);
        let result = await manager.createBdtLpcListener({ json: param, bytes });
        // set resp package
        let respBytes = Buffer.from('');
        let respJson = {};
        if ((_a = result.resp) === null || _a === void 0 ? void 0 : _a.bytes) {
            respBytes = (_b = result.resp) === null || _b === void 0 ? void 0 : _b.bytes;
        }
        if ((_c = result.resp) === null || _c === void 0 ? void 0 : _c.json) {
            respJson = (_d = result.resp) === null || _d === void 0 ? void 0 : _d.json;
        }
        return { err: result.err, bytes: respBytes, value: respJson };
    });
    // local util,it can start bdt-tools and create test data
    _interface.registerApi('utilRequest', async (from, bytes, param) => {
        var _a, _b, _c, _d;
        _interface.getLogger().debug(`remote ${from.agentid} call utilRequest ${param.name}`);
        _interface.getLogger().debug(`remote call createBdtLpcListener ${param.name} `);
        let result = await manager.utilRequest({ json: param, bytes });
        // set resp package
        let respBytes = Buffer.from('');
        let respJson = {};
        if ((_a = result.resp) === null || _a === void 0 ? void 0 : _a.bytes) {
            respBytes = (_b = result.resp) === null || _b === void 0 ? void 0 : _b.bytes;
        }
        if ((_c = result.resp) === null || _c === void 0 ? void 0 : _c.json) {
            respJson = (_d = result.resp) === null || _d === void 0 ? void 0 : _d.json;
        }
        return { err: result.err, bytes: respBytes, value: respJson };
    });
}
exports.ServiceMain = ServiceMain;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvc2VydmljZS9jeWZzX2JkdC9vbmxvYWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsaURBQThDO0FBR3ZDLEtBQUssVUFBVSxXQUFXLENBQUMsVUFBa0M7SUFDaEUsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDN0csSUFBSSxPQUFPLEdBQW1CLDZCQUFjLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3hFLE1BQU0sT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3JCLFVBQVUsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLElBQWUsRUFBRSxLQUFhLEVBQUUsS0FBVSxFQUFnQixFQUFFO1FBQ3pHLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUN0RCxJQUFJLFNBQVMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hELElBQUksU0FBUyxDQUFDLEdBQUcsRUFBRTtZQUNmLE9BQU8sRUFBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFDLENBQUM7U0FDbEU7UUFDRCxPQUFPLEVBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUMsRUFBQyxDQUFDO0lBQy9GLENBQUMsQ0FBQyxDQUFDO0lBR0gsNEJBQTRCO0lBQzVC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O1FBQ2xCLFVBQUcsTUFBTSxDQUFDLElBQUksMENBQUUsS0FBSyxFQUFDO1lBQ2xCLFNBQVMsU0FBRyxNQUFNLENBQUMsSUFBSSwwQ0FBRSxLQUFLLENBQUM7U0FDbEM7UUFDRCxVQUFHLE1BQU0sQ0FBQyxJQUFJLDBDQUFFLElBQUksRUFBQztZQUNqQixRQUFRLFNBQUcsTUFBTSxDQUFDLElBQUksMENBQUUsSUFBSSxDQUFDO1NBQ2hDO1FBQ0QsT0FBTyxFQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQyxDQUFDO0FBSVAsQ0FBQztBQS9ERCxrQ0ErREMiLCJmaWxlIjoic2VydmljZS9jeWZzX2JkdC9vbmxvYWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Vycm9yQ29kZSwgTmFtZXNwYWNlLCBCdWZmZXJXcml0ZXIsIFNlcnZpY2VDbGllbnRJbnRlcmZhY2UsIFJhbmRvbUdlbmVyYXRvciwgTmV0SGVscGVyLCBzbGVlcH0gZnJvbSAnLi4vLi4vYmFzZSc7XHJcbmltcG9ydCB7QmR0UGVlck1hbmFnZXJ9IGZyb20gJy4vcGVlcl9tYW5hZ2VyJztcclxuaW1wb3J0IHtCZHRQZWVyfSBmcm9tIFwiLi9wZWVyXCJcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBTZXJ2aWNlTWFpbihfaW50ZXJmYWNlOiBTZXJ2aWNlQ2xpZW50SW50ZXJmYWNlKSB7XHJcbiAgICBfaW50ZXJmYWNlLmdldExvZ2dlcigpLmluZm8oYD09PT09PT09PXN0YXJ0IHNlcnZpY2UgbmFtZXNwYWNlPSR7SlNPTi5zdHJpbmdpZnkoX2ludGVyZmFjZS5nZXROYW1lc3BhY2UoKSl9YCk7XHJcbiAgICBsZXQgbWFuYWdlcjogQmR0UGVlck1hbmFnZXIgPSBCZHRQZWVyTWFuYWdlci5jcmVhdGVJbnN0YW5jZShfaW50ZXJmYWNlKTtcclxuICAgIGF3YWl0IG1hbmFnZXIuaW5pdCgpO1xyXG4gICAgX2ludGVyZmFjZS5yZWdpc3RlckFwaSgnc3RhcnRQZWVyQ2xpZW50JywgYXN5bmMgKGZyb206IE5hbWVzcGFjZSwgYnl0ZXM6IEJ1ZmZlciwgcGFyYW06IGFueSk6IFByb21pc2U8YW55PiA9PiB7XHJcbiAgICAgICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5kZWJ1ZyhgcmVtb3RlIGNhbGwgc3RhcnRQZWVyYCk7XHJcbiAgICAgICAgbGV0IHN0YXJ0SW5mbyA9IGF3YWl0IG1hbmFnZXIuc3RhcnRQZWVyKHBhcmFtLlJVU1RfTE9HKTtcclxuICAgICAgICBpZiAoc3RhcnRJbmZvLmVycikge1xyXG4gICAgICAgICAgICByZXR1cm4ge2Vycjogc3RhcnRJbmZvLmVyciwgYnl0ZXM6IEJ1ZmZlci5mcm9tKCcnKSwgdmFsdWU6IHt9fTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHtlcnI6IHN0YXJ0SW5mby5lcnIsIGJ5dGVzOiBCdWZmZXIuZnJvbShcIlwiKSwgdmFsdWU6IHtwZWVyTmFtZTogc3RhcnRJbmZvLnBlZXJOYW1lfX07XHJcbiAgICB9KTtcclxuXHJcbiAgICBcclxuICAgIC8vIHNlbmQgY29tbWFuZCB0byBiZHQtdG9vbHNcclxuICAgIF9pbnRlcmZhY2UucmVnaXN0ZXJBcGkoJ3NlbmRCZHRMcGNDb21tYW5kJywgYXN5bmMgKGZyb206IE5hbWVzcGFjZSwgYnl0ZXM6IEJ1ZmZlciwgcGFyYW0gOiBhbnkpOiBQcm9taXNlPGFueT4gPT4ge1xyXG4gICAgICAgIF9pbnRlcmZhY2UuZ2V0TG9nZ2VyKCkuZGVidWcoYHJlbW90ZSAke2Zyb20uYWdlbnRpZH0gY2FsbCBzZW5kQmR0THBjQ29tbWFuZCAke3BhcmFtLm5hbWV9YCk7XHJcbiAgICAgICAgbGV0IHJlc3VsdCA9ICBhd2FpdCBtYW5hZ2VyLnNlbmRCZHRMcGNDb21tYW5kKHtqc29uOnBhcmFtLGJ5dGVzfSlcclxuICAgICAgICAvLyBzZXQgcmVzcCBwYWNrYWdlXHJcbiAgICAgICAgbGV0ICByZXNwQnl0ZXMgPSBCdWZmZXIuZnJvbSgnJyk7XHJcbiAgICAgICAgbGV0IHJlc3BKc29uID0ge307XHJcbiAgICAgICAgaWYocmVzdWx0LnJlc3A/LmJ5dGVzKXtcclxuICAgICAgICAgICAgcmVzcEJ5dGVzID0gcmVzdWx0LnJlc3A/LmJ5dGVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihyZXN1bHQucmVzcD8uanNvbil7XHJcbiAgICAgICAgICAgIHJlc3BKc29uID0gcmVzdWx0LnJlc3A/Lmpzb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7ZXJyOiByZXN1bHQuZXJyLCBieXRlczogcmVzcEJ5dGVzLCB2YWx1ZTogcmVzcEpzb259O1xyXG4gICAgfSk7XHJcbiAgICAvLyBzZW5kIGNvbW1hbmQgdG8gYmR0LXRvb2xzICxsb2NhbCBjcmVhdGUgaGFuZGxlcixMaXN0ZW5lciBldmVudCBmcm9tIGJkdC10b29sc1xyXG4gICAgX2ludGVyZmFjZS5yZWdpc3RlckFwaSgnY3JlYXRlQmR0THBjTGlzdGVuZXInLCBhc3luYyAoZnJvbTogTmFtZXNwYWNlLCBieXRlczogQnVmZmVyLCBwYXJhbTogYW55KTogUHJvbWlzZTxhbnk+ID0+IHtcclxuICAgICAgICBfaW50ZXJmYWNlLmdldExvZ2dlcigpLmRlYnVnKGByZW1vdGUgY2FsbCBjcmVhdGVCZHRMcGNMaXN0ZW5lciAke3BhcmFtLm5hbWV9IGApO1xyXG4gICAgICAgIGxldCByZXN1bHQgPSAgYXdhaXQgbWFuYWdlci5jcmVhdGVCZHRMcGNMaXN0ZW5lcih7anNvbjpwYXJhbSxieXRlc30pXHJcbiAgICAgICAgLy8gc2V0IHJlc3AgcGFja2FnZVxyXG4gICAgICAgIGxldCAgcmVzcEJ5dGVzID0gQnVmZmVyLmZyb20oJycpO1xyXG4gICAgICAgIGxldCByZXNwSnNvbiA9IHt9O1xyXG4gICAgICAgIGlmKHJlc3VsdC5yZXNwPy5ieXRlcyl7XHJcbiAgICAgICAgICAgIHJlc3BCeXRlcyA9IHJlc3VsdC5yZXNwPy5ieXRlcztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYocmVzdWx0LnJlc3A/Lmpzb24pe1xyXG4gICAgICAgICAgICByZXNwSnNvbiA9IHJlc3VsdC5yZXNwPy5qc29uO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge2VycjogcmVzdWx0LmVyciwgYnl0ZXM6IHJlc3BCeXRlcywgdmFsdWU6IHJlc3BKc29ufTtcclxuICAgIH0pO1xyXG4gICAgLy8gbG9jYWwgdXRpbCxpdCBjYW4gc3RhcnQgYmR0LXRvb2xzIGFuZCBjcmVhdGUgdGVzdCBkYXRhXHJcbiAgICBfaW50ZXJmYWNlLnJlZ2lzdGVyQXBpKCd1dGlsUmVxdWVzdCcsIGFzeW5jIChmcm9tOiBOYW1lc3BhY2UsIGJ5dGVzOiBCdWZmZXIsIHBhcmFtOiBhbnkpOiBQcm9taXNlPGFueT4gPT4ge1xyXG4gICAgICAgIF9pbnRlcmZhY2UuZ2V0TG9nZ2VyKCkuZGVidWcoYHJlbW90ZSAke2Zyb20uYWdlbnRpZH0gY2FsbCB1dGlsUmVxdWVzdCAke3BhcmFtLm5hbWV9YCk7XHJcbiAgICAgICAgX2ludGVyZmFjZS5nZXRMb2dnZXIoKS5kZWJ1ZyhgcmVtb3RlIGNhbGwgY3JlYXRlQmR0THBjTGlzdGVuZXIgJHtwYXJhbS5uYW1lfSBgKTtcclxuICAgICAgICBsZXQgcmVzdWx0ID0gIGF3YWl0IG1hbmFnZXIudXRpbFJlcXVlc3Qoe2pzb246cGFyYW0sYnl0ZXN9KVxyXG4gICAgICAgIC8vIHNldCByZXNwIHBhY2thZ2VcclxuICAgICAgICBsZXQgIHJlc3BCeXRlcyA9IEJ1ZmZlci5mcm9tKCcnKTtcclxuICAgICAgICBsZXQgcmVzcEpzb24gPSB7fTtcclxuICAgICAgICBpZihyZXN1bHQucmVzcD8uYnl0ZXMpe1xyXG4gICAgICAgICAgICByZXNwQnl0ZXMgPSByZXN1bHQucmVzcD8uYnl0ZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHJlc3VsdC5yZXNwPy5qc29uKXtcclxuICAgICAgICAgICAgcmVzcEpzb24gPSByZXN1bHQucmVzcD8uanNvbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHtlcnI6IHJlc3VsdC5lcnIsIGJ5dGVzOiByZXNwQnl0ZXMsIHZhbHVlOiByZXNwSnNvbn07XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgXHJcblxyXG59Il19
