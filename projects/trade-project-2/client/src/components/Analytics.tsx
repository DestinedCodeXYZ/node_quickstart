import type { Candle } from '../types/Candle';
import { candleCalcs } from '../utils/candleCalcs';
import '../styles/Analytics.css'

export default function Analytics({candles}: {candles: Candle[]}) {

    const bullishCandles = candleCalcs("bullishCandles", candles);
    
    const bearishCandles = candleCalcs("bearishCandles", candles);

    const lowestLow = candleCalcs("lowestLow", candles);

    const highestHigh = candleCalcs("highestHigh", candles);

    const volAvg = candleCalcs("volAvg", candles);

    const avgCandleRange = candleCalcs("avgCandleRange", candles);
    const bullishPercentage = candles.length === 0
        ? 0
        : (bullishCandles / candles.length) * 100;
    const bearishPercentage = candles.length === 0
        ? 0
        : (bearishCandles / candles.length) * 100;

    return (
        <div id='analytics'>
            <table>
                <caption>Market Analytics</caption>
                <tbody>
                    <tr>
                        <th scope="row">Candles</th>
                        <td>{candles.length}</td>
                    </tr>
                    <tr>
                        <th scope="row">Bullish candles</th>
                        <td>{bullishCandles} ({bullishPercentage.toFixed(2)}%)</td>
                    </tr>
                    <tr>
                        <th scope="row">Bearish candles</th>
                        <td>{bearishCandles} ({bearishPercentage.toFixed(2)}%)</td>
                    </tr>
                    <tr>
                        <th scope="row">Lowest low</th>
                        <td>{lowestLow}</td>
                    </tr>
                    <tr>
                        <th scope="row">Highest high</th>
                        <td>{highestHigh}</td>
                    </tr>
                    <tr>
                        <th scope="row">Average volume</th>
                        <td>{volAvg}</td>
                    </tr>
                    <tr>
                        <th scope="row">Average range</th>
                        <td>{avgCandleRange.toFixed(4)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}