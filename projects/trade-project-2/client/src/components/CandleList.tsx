import type { Candle } from '../types/Candle';
import './CandleList.css';

export default function CandleList({candles}: {candles: Candle[] }) {

    return (
        <div className="candleTableFrame">
            <div className="candleTableScroll">
            <table >
                    <tr>
                        <th>Timestamp</th>
                        <th>Open</th>
                        <th>High</th>
                        <th>Low</th>
                        <th>Close</th>
                        <th>Volume</th>
                    </tr>
                {candles.map((candle) => (
                    <tr key={candle._id}>
                        <td >{candle.timestamp}</td> 
                        <td >{candle.open}</td> 
                        <td >{candle.high}</td>
                        <td >{candle.low}</td>
                        <td >{candle.close}</td>
                        <td >{candle.volume}</td>
                    </tr>
                ))}
                </table>  
            </div>
        </div>
        
        
    )
}