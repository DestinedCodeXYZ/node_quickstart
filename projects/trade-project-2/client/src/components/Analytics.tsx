import type { Candle } from '../types/Candle';

export default function Analytics({candles}: {candles: Candle[]}) {

    const bullishCandles = candles.filter((candle) => {
        return candle.open < candle.close
    });
    
    const bearishCandles = candles.filter((candle) => {
        return candle.open > candle.close
    });

    for (const candle in candles)

    return (
        <div>
            <div>
                <p> Candles: {candles.length}</p>
                <p> Bullish candles: {bullishCandles.length} - {(bullishCandles.length/candles.length * 100).toFixed(2)}%</p>
                <p> Bearish candles: {bearishCandles.length} - {(bearishCandles.length/candles.length * 100).toFixed(2)}%</p>
                
            </div>
        </div>
        
    )
}