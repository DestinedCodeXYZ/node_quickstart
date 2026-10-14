// COMPONENTS
import CandleList from './components/CandleList';
import Loading from './components/Loading';
import IsError from './components/IsError';
import Analytics from './components/Analytics';
import Filter from './components/Filters';
import Login from './components/Login';

// FUNCTIONS
import { fetchData } from './functions/fetchData';
import { handleLogin } from "./functions/handleLogin";

// OTHER
import './App.css'
import type { CandleState } from './types/CandleState';
import type { AuthState } from './types/AuthState';
import { useEffect, useState } from 'react';


function App() {

  // Filter inputs
  const [instrument, setInstrument] = useState('eurusd');
  const [timeframe, setTimeFrame] = useState('h1');
  const [from, setFrom] = useState('2017-01-01T00:00');
  const [to, setTo] = useState('2017-01-02T00:00');
  const [limit, setLimit] = useState(100);

  const [candleState, setCandleState] = useState<CandleState>({state: "loading"});
  const [auth, setAuth] = useState<AuthState>({state: "loading"})

  const candlesUrl = new URL("http://localhost:3000/api/candles");
  const loginUrl = new URL("http://localhost:3000/api/auth/login");

  candlesUrl.searchParams.set("instrument", instrument);
  candlesUrl.searchParams.set("timeframe", timeframe);

  if (from) {
    candlesUrl.searchParams.set("from", from);
  }

  if (to) {
    candlesUrl.searchParams.set("to", to);
  }

  if (limit) {
    candlesUrl.searchParams.set("limit", limit.toString());
  }

  // Function to get candle data on click.
  async function getData() {

    setCandleState({ state: "loading" })

    try {
      const data = await fetchData(candlesUrl.toString());
      setCandleState({ state: "success", candles: data});
    }

    catch (err) {
      console.log(`ERROR: ${err}`)
      const message = err instanceof Error ? err.message : "An unknown error has occured."
      setCandleState({state: "error", message})
    }
  }

  async function loginAuth({username, password}: {username: string; password: string}) {

    setAuth({state: "loading"});

    try {
        const data = await handleLogin(loginUrl.toString(), username, password);
        setAuth({state: "success", username: username})
    } 
    
    catch(err) {
      console.log(`ERROR: ${err}`)
      const message = err instanceof Error ? err.message : "An unknown error has occured."
      setAuth({state: "error", message})
    }
  }

  useEffect(() => {
      getData()
  }, [])

  return (
    <>
    <h1>Market Data Explorer</h1>
    {auth.state === "loading" ? <Login onLogin={loginAuth}/> :
    
    <div>
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
    </div>}
      
    </>
  )
}

export default App
