import type { Candle } from './Candle';

export type WebState = 
{ state: "loading" } |
{ state: "success" ; candles: Candle[] } |
{ state: "error" ; message: string };