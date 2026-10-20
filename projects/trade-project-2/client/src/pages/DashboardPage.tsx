import CandleList from '../components/CandleList';
import Analytics from '../components/Analytics';
import Filter from '../components/Filters';
import { useState } from 'react';

import type { Candle } from '../types/Candle';
import type { CandleState } from '../types/CandleState';

import { getCandles } from '../api/candles';

  // Filter inputs
  

export default function DashboardPage() {

    const [instrument, setInstrument] = useState('eurusd');
    const [timeframe, setTimeFrame] = useState('h1');
    const [from, setFrom] = useState('2017-01-01T00:00');
    const [to, setTo] = useState('2017-01-02T00:00');
    const [limit, setLimit] = useState(100);

    const [candleState, setCandleState] = useState<CandleState>({state: "loading"});

    async function getData() {

    setCandleState({ state: "loading" })

        try {
            const data = await getCandles({
                instrument,
                timeframe,
                from: from ? `${from}Z` : undefined,
                to: to ? `${to}Z` : undefined,
                limit: limit || undefined,
            });

            setCandleState({ state: "success", candles: data});
        }

        catch (err) {
            console.log(`${err}`)
            const message = err instanceof Error ? err.message : "An unknown error has occured."
            setCandleState({state: "error", message})
        }
    }
    return (
        <div>
            { candleState.state === "success" && 
            <div>
                <Filter 
                instrument={instrument}
                timeframe={timeframe}
                from={from}
                to={to}
                limit={limit}
                
                changeInstrument={setInstrument}
                changeTimeframe={setTimeFrame}
                changeFrom={setFrom}
                changeTo={setTo}
                changeLimit={setLimit}/><br/>
                <button onClick={getData} value="Load Data"/>

                <Analytics candles={candleState.candles}/>
                <CandleList candles={candleState.candles}/>
            </div>}
        </div>
        
    )
    
}