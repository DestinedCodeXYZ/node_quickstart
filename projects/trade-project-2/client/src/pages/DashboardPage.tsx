// Components
import Loading from "../components/Loading";
import IsError from "../components/IsError";
import Filter from "../components/Filters";
import Analytics from "../components/Analytics";
import CandleList from "../components/CandleList";

// Styles
import "../styles/DashboardPage.css"

// Hooks
import useAuth from "../hooks/useAuth";
import useFilters from "../hooks/useFilters";
import useCandleState from "../hooks/useCandleState";

// Other
import { useEffect, useRef } from "react";

export default function DashboardPage() {

    const { logout } = useAuth();

  // Filter inputs
    const { filters, setFilters } = useFilters();
    const { candleState, loadCandles } = useCandleState();

    const intialFilters = useRef(filters);

    useEffect(() => {
        loadCandles(intialFilters.current)
    }, [loadCandles])

    return (
        <div>
            <h1 className="dbPageTitle"><b>Market Data Explorer</b> </h1>
            <button className="button" onClick={logout} > Logout </button>
            <div className="filterFrame">
                <Filter
                instrument={filters.instrument}
                timeframe={filters.timeframe}
                from={filters.from}
                to={filters.to}
                limit={filters.limit}
                  
                changeInstrument={(instrument) => setFilters((current) => ({ ...current, instrument}))}
                changeTimeframe={(timeframe) => setFilters((current) => ({ ...current, timeframe}))}
                changeFrom={(from) => setFilters((current) => ({ ...current, from}))}
                changeTo={(to) => setFilters((current) => ({ ...current, to}))}
                changeLimit={(limit) => setFilters((current) => ({ ...current, limit}))} 
                />    
            </div>


            <div>
                {candleState.state === "success" && <Analytics candles={candleState.candles}/>}
            </div>
            <div className="candleData"> 
                    {candleState.state === "loading" ? <Loading/> : 
                    candleState.state === "error" ? <IsError error={candleState.message}/> : 
                    candleState.state === "success" && candleState.candles.length > 0 && <CandleList candles={candleState.candles}/>}
            </div>
        </div>
    )
}