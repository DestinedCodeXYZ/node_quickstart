export interface Candle {
    _id: string;
    timestamp: string;
    instrument: string;
    priceSide: string;
    timeFrame: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}