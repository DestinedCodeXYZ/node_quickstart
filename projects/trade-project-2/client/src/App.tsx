import { useEffect, useState } from 'react'
import Filter from './components/Filters';
import './App.css'
import { fetchData } from './functions/fetchData';
import type { Candle } from './types/Candle';
import CandleList from './components/CandleList';
import Loading from './components/Loading';
import IsError from './components/IsError';
import Analytics from './components/Analytics';

function App() {

  const [instrument, setInstrument] = useState('eurusd');
  const [timeframe, setTimeFrame] = useState('h1');
  const [from, setFrom] = useState('2017-01-01T00:00');
  const [to, setTo] = useState('2017-01-02T00:00');
  const [limit, setLimit] = useState(100);
  const [candles, setCandles] = useState<Candle[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchData(url.toString());
      setCandles(data);
    }

    catch (err) {
      console.log(`ERROR: ${err}`)
      if (err instanceof Error) {
        setError(err.message);
      }

      else (console.log("An unknown error has occurred."))
    }

    finally { setIsLoading(false) }

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
      <div><Analytics candles={candles}/></div>
      <div className="candleData"> 
        {isLoading ? <Loading/> : error ? <IsError error={error}/> : <CandleList candles={candles}/>}
      </div>
    </>
  )
}

export default App
