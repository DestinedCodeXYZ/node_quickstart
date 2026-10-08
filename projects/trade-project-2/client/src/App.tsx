import { useState } from 'react'
import './App.css'

function App() {

  const [instrument, setInstrument] = useState('');
  const [timeframe, setTimeFrame] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState('');
  const [candles, setCandles] = useState('');

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
    url.searchParams.set("limit", limit);
  }

  return (
    <>
      <div>Market Data Explorer</div>
    </>
  )
}

export default App
