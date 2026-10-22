// Components
import Loading from "../components/Loading";
import IsError from "../components/IsError";
import Filter from "../components/Filters";
import Analytics from "../components/Analytics";
import CandleList from "../components/CandleList";

import { getCandles } from "../api/candles";
import { useState } from "react";
import type { CandleState } from "../types/CandleState";
import useAuth from "../hooks/useAuth";

export default function DashboardPage() {

    const { logout } = useAuth();
  // Filter inputs
    const [instrument, setInstrument] = useState('eurusd');
    const [timeframe, setTimeFrame] = useState('h1');
    const [from, setFrom] = useState('2017-01-01T00:00Z');
    const [to, setTo] = useState('2017-01-02T00:00Z');
    const [limit, setLimit] = useState(100);

    const [candleState, setCandleState] = useState<CandleState>({state: "loading"});

    // Function to get candle data on click.
    async function getData() {

        setCandleState({ state: "loading" })

        try {
            const data = await getCandles({instrument, timeframe, from, to, limit});
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
            <h1><b>Market Data Explorer</b></h1>
            <button onClick={logout}> Logout </button>
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
                changeLimit={setLimit}/>
            </div>

            <div>
                <button onClick={getData}>Load Candles</button>
            </div>

            <div>{candleState.state === "success" && <Analytics candles={candleState.candles}/>}</div>
            <div className="candleData"> 
                {candleState.state === "loading" ? <Loading/> : candleState.state === "error" ? <IsError error={candleState.message}/> : candleState.state === "success" && <CandleList candles={candleState.candles}/>}
            </div>
            </div>
    )
}