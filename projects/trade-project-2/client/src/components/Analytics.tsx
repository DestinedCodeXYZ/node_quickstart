import type { Candle } from '../types/Candle';

export default function Analytics({candles}: {candles: Candle[]}) {

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

    return (
        <div>
            <div>
                <p> Candles: {candles.length}</p>
                <p> Bullish candles: {bullishCandles.length} - {(bullishCandles.length/candles.length * 100).toFixed(2)}%</p>
                <p> Bearish candles: {bearishCandles.length} - {(bearishCandles.length/candles.length * 100).toFixed(2)}%</p>
                <div>Lowest Low: {lowestLow} -- Highest High: {highestHigh}</div>
                <p>Average volume: {volAvg} <br/> Average range: {avgCandleRange.toFixed(4)} </p>
            </div>
        </div>
    )
}