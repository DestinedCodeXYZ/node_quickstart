import { useEffect, useState } from 'react'
import Filter from './components/Filters';
import './App.css'
import { fetchData } from './functions/fetchData';
import CandleList from './components/CandleList';
import Loading from './components/Loading';
import IsError from './components/IsError';
import Analytics from './components/Analytics';
import type { CandleState } from './types/CandleState';
import Login from './components/Login';

function App() {

  // Filter inputs
  const [instrument, setInstrument] = useState('eurusd');
  const [timeframe, setTimeFrame] = useState('h1');
  const [from, setFrom] = useState('2017-01-01T00:00');
  const [to, setTo] = useState('2017-01-02T00:00');
  const [limit, setLimit] = useState(100);

  const [candleState, setCandleState] = useState<CandleState>({state: "loading"});
  const [auth, setAuth] = useState(false)

  const url = new URL("http://localhost:3000/api/candles");
  url.searchParams.set("instrument", instrument);
  url.searchParams.set("timeframe", timeframe);

  if (from) {
    url.searchParams.set("from", from);
  }

  if (to) {
    url.searchParams.set("to", to);
  }

  if (limit) {
    url.searchParams.set("limit", limit.toString());
  }

  async function getData() {

    setCandleState({ state: "loading" })

    try {
      const data = await fetchData(url.toString());
      setCandleState({ state: "success", candles: data});
    }

    catch (err) {
      console.log(`ERROR: ${err}`)
      const message = err instanceof Error ? err.message : "An unknown error has occured."
      setCandleState({state: "error", message})
    }
  }

  useEffect(() => {
      getData()
  }, [])

  return (
    <>
      <h1>Market Data Explorer</h1>
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
      
    </>
  )
}

export default App
