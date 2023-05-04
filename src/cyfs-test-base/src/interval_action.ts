export class IntervalAction {
    private m_timer?: NodeJS.Timer;

    begin(action: ()=>void, time?: number) {
        let offset: number = 2000;
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