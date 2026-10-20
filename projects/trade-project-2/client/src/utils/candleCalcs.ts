import type { Candle } from '../types/Candle';

export default function candleCalcs({candles}: {candles: Candle[]}) {
    const bullishCandles = candles.filter((candle) => {
        return candle.open < candle.close
    });
    
    const bearishCandles = candles.filter((candle) => {
        return candle.open > candle.close
    });

    const lowestLow = candles.reduce((candle, nextCandle) => {
       return Math.min(candle, nextCandle.low)
    }, Infinity);

    const highestHigh = candles.reduce((candle, nextCandle) => {
       return Math.max(candle, nextCandle.high)
    }, 0);

    const volAvg = ((candles.reduce((candle, nextCandle) => {
        return candle + nextCandle.volume
    }, 0)) / candles.length).toFixed(2)

    const avgCandleRange = candles.length === 0 ?
    0
    : candles.reduce(
        (sum, candle) => 
        sum + (candle.high - candle.low), 0
    )

    
}