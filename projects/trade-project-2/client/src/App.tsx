// COMPONENTS
import CandleList from './components/CandleList';
import Loading from './components/Loading';
import IsError from './components/IsError';
import Analytics from './components/Analytics';
import Filter from './components/Filters';
import Login from './components/Login';

// API CALLS
import { getCandles } from './api/candles';


// OTHER
import './App.css'
import type { CandleState } from './types/CandleState';

import { useState } from 'react';

import { BrowserRouter as Router, Route, Routes, BrowserRouter } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {





  return (
    <BrowserRouter> 
      <Routes>
        <Route path="/login" element={LoginPage} />
        <Route element={PrivateRoute}>
          <Route path="/candles" element={DashboardPage} />
        </Route>
      </Routes>
      <>
      <h1><b>Market Data Explorer</b></h1>

      {auth.state !== "success" && 
      <div>
        <Login onLogin={loginAuth} />
        {auth.state === "error" && <b>{auth.message}</b>} 
      </div> }
        
      </>
    </BrowserRouter>
    
  )
}

export default App
