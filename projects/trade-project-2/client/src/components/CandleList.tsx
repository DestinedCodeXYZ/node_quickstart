import type { Candle } from '../types/Candle';
import '../styles/CandleList.css';

export default function CandleList({candles}: {candles: Candle[] }) {

    return (
        <div className="candleTableFrame">
            <div className="candleTableScroll">
            <table >
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Open</th>
                            <th>High</th>
                            <th>Low</th>
                            <th>Close</th>
                            <th>Volume</th>
                        </tr> 
                    </thead>
                {candles.map((candle) => (
                    <tbody key={candle._id}>
                        <tr>
                            <td>{candle.timestamp}</td> 
                            <td>{candle.open}</td> 
                            <td>{candle.high}</td>
                            <td>{candle.low}</td>
                            <td>{candle.close}</td>
                            <td>{candle.volume}</td>
                        </tr>
                    </tbody>
                ))}
                </table>  
            </div>
        </div>  
    )
}