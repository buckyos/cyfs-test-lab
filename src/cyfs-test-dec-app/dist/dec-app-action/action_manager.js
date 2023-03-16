"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionManager = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const common_1 = require("../common");
class ActionManager {
    constructor() {
        this.history_action = [];
        this.current_action = {
            testcase_id: `Testcase-${common_1.RandomGenerator.string(10)}-${Date.now()}`,
            action_list: []
        };
    }
    //单例模式
    static createInstance() {
        if (!ActionManager.manager) {
            ActionManager.manager = new ActionManager();
        }
        return ActionManager.manager;
    }
    record_action(action) {
        this.current_action.action_list.push(action);
    }
    update_current_testcase_id(testcase_id) {
        this.current_action.testcase_id = testcase_id;
    }
    report_current_actions() {
        let current_action = JSON.parse(JSON.stringify(this.current_action));
        this.current_action = {
            testcase_id: `Testcase-${common_1.RandomGenerator.string(10)}-${Date.now()}`,
            action_list: []
        };
        this.history_action.push(current_action);
        return current_action;
    }
    save_history_to_file(save_path) {
        fs.writeFileSync(path.join(save_path, `./test_action_data.json`), JSON.stringify(this.history_action));
    }
}
exports.ActionManager = ActionManager;
