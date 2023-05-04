export declare class IntervalAction {
    private m_timer?;
    begin(action: () => void, time?: number): void;
    end(): void;
}
