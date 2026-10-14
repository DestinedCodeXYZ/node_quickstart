import type { Candle } from './Candle';


export type CandleState = 
{ state: "loading" } |
{ state: "success" ; candles: Candle[] } |
{ state: "error" ; message: string } 
