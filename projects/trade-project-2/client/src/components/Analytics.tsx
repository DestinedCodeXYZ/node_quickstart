import type { Candle } from '../types/Candle';
import { candleCalcs } from '../utils/candleCalcs';

export default function Analytics({candles}: {candles: Candle[]}) {

    const bullishCandles = candleCalcs("bullishCandles", candles);
    
    const bearishCandles = candleCalcs("bearishCandles", candles);

    const lowestLow = candleCalcs("lowestLow", candles);

    const highestHigh = candleCalcs("highestHigh", candles);

    const volAvg = candleCalcs("volAvg", candles);

    const avgCandleRange = candleCalcs("avgCandleRange", candles);

    return (
        <div>
            <div>
                <p> Candles: {candles.length}</p>
                <p> Bullish candles: {bullishCandles} - {(bullishCandles/candles.length * 100).toFixed(2)}%</p>
                <p> Bearish candles: {bearishCandles} - {(bearishCandles/candles.length * 100).toFixed(2)}%</p>
                <div>Lowest Low: {lowestLow} -- Highest High: {highestHigh}</div>
                <p>Average volume: {volAvg} <br/> Average range: {(avgCandleRange).toFixed(4)} </p>
            </div>
        </div>
    )
}