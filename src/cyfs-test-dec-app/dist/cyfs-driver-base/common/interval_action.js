"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntervalAction = void 0;
class IntervalAction {
    begin(action, time) {
        let offset = 2000;
        if (time) {
            offset = time;
        }
        this.m_timer = setInterval(() => {
            action();
        }, offset);
    }
    end() {
        if (this.m_timer) {
            clearInterval(this.m_timer);
            this.m_timer = undefined;
        }
    }
}
exports.IntervalAction = IntervalAction;
