// COMPONENTS
import CandleList from './components/CandleList';
import Loading from './components/Loading';
import IsError from './components/IsError';
import Analytics from './components/Analytics';
import Filter from './components/Filters';
import Login from './components/Login';

// API CALLS
import { getCandles } from './api/candles';
import { login } from './api/login';

// OTHER
import './App.css'
import type { CandleState } from './types/CandleState';
import type { AuthState } from './types/AuthState';
import { useState } from 'react';

import { BrowserRouter as Router, Route, Routes, BrowserRouter } from 'react-router-dom';

function App() {

  // Filter inputs
  const [instrument, setInstrument] = useState('eurusd');
  const [timeframe, setTimeFrame] = useState('h1');
  const [from, setFrom] = useState('2017-01-01T00:00');
  const [to, setTo] = useState('2017-01-02T00:00');
  const [limit, setLimit] = useState(100);

  const [candleState, setCandleState] = useState<CandleState>({state: "loading"});
  const [auth, setAuth] = useState<AuthState>({state: "loading"})

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

  async function loginAuth({username, password}: {username: string; password: string}) {

    setAuth({state: "loading"});

    try {
        await login({username, password});
        setAuth({state: "success", username: username}) // Due to change
        getData();
    } 
    
    catch(err) {
      console.log(`${err}`)
      const message = err instanceof Error ? err.message : "An unknown error has occured."
      setAuth({state: "error", message})
    }
  }

  return (
    <BrowserRouter>
      <>
      <h1><b>Market Data Explorer</b></h1>

      {auth.state !== "success" ? 
      <div>
        <Login onLogin={loginAuth} />
        {auth.state === "error" && <b>{auth.message}</b>} 
      </div>
      
      :
      
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
    </BrowserRouter>
    
  )
}

export default App
