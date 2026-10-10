export interface Filter {
    instrument: string;
    timeframe: string;
    from: string;
    to: string;
    limit: number;

    changeInstrument: (value: string) => void;
    changeTimeframe: (value: string) => void;
    changeFrom: (value: string) => void;
    changeTo: (value: string) => void;
    changeLimit: (value: number) => void;
}