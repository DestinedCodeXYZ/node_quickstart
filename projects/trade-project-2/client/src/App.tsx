import { useEffect, useState } from 'react'
import Filter from './components/Filters';
import './App.css'
import { fetchData } from './functions/fetchData';
import type { Candle } from './types/Candle';
import CandleList from './components/CandleList';
import Loading from './components/Loading';
import IsError from './components/IsError';
import Analytics from './components/Analytics';
import type { WebState } from './types/WebState';

function App() {

  const [instrument, setInstrument] = useState('eurusd');
  const [timeframe, setTimeFrame] = useState('h1');
  const [from, setFrom] = useState('2017-01-01T00:00');
  const [to, setTo] = useState('2017-01-02T00:00');
  const [limit, setLimit] = useState(100);

  const [webState, setWebState] = useState<WebState>({state: "loading"});

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

    setWebState({ state: "loading" })

    try {
      const data = await fetchData(url.toString());
      setWebState({ state: "success", candles: data});
    }

    catch (err) {
      console.log(`ERROR: ${err}`)
      if (err instanceof Error) {
        setWebState({state: "error", message: err.message});
      }

      else (console.log("An unknown error has occurred."))
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
      <div>{webState.state === "success" ? <Analytics candles={webState.candles}/> : <Analytics candles={[]}/>}</div>
      <div className="candleData"> 
        {webState.state === "loading" ? <Loading/> : webState.state === "error" ? <IsError error={webState.message}/> : <CandleList candles={webState.candles}/>}
      </div>
    </>
  )
}

export default App
