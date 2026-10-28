import type { FilterParams } from "./Filter";

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

export type CandleState = 
{ state: "loading" } |
{ state: "success" ; candles: Candle[] } |
{ state: "error" ; message: string } 

export type CandleContextValue = {
    candleState: CandleState;
    loadCandles: (params: FilterParams) => Promise<void>;
} 