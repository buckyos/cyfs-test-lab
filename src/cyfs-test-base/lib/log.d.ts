export declare class Logger {
    info: (s: any) => void;
    debug: (s: any) => void;
    error: (s: any) => void;
    private m_dir;
    constructor(info: (s: any) => void, debug: (s: any) => void, error: (s: any) => void, dir: string);
    dir(): string;
}
