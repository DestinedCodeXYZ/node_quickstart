import type { Candle } from '../types/Candle';
import './CandleList.css';

export default function CandleList({candles}: {candles: Candle[] }) {

    return (
        <table>
            <tr>
                <th>Timestamp</th>
                <th>Open</th>
                <th>High</th>
                <th>Low</th>
                <th>Close</th>
                <th>Volume</th>
            </tr>
        {candles.map((candle) => (
            <tr>
                <>
                    <td key={candle._id}>{candle.timestamp}</td> 
                    <td key={candle._id}>{candle.open}</td> 
                    <td key={candle._id}>{candle.high}</td>
                    <td key={candle._id}>{candle.low}</td>
                    <td key={candle._id}>{candle.close}</td>
                    <td key={candle._id}>{candle.volume}</td>
                </> 
            </tr>
        ))}
        </table>
    )
}