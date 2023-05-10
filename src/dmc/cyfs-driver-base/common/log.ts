export class Logger {
    info: (s: any)=>void;
    debug: (s: any)=>void;
    error: (s: any)=>void;
    private m_dir: string = '';
    constructor(info: (s: any)=>void, debug: (s: any)=>void, error: (s: any)=>void, dir: string) {
        this.info = info;
        this.debug = debug;
        this.error = error;
        this.m_dir = dir;
    }

    dir(): string {
        return this.m_dir;
    }
}

