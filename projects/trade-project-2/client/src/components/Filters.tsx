import type { FilterProps } from "../types/Filter";

export default function Filter({instrument, timeframe, from, to, limit, changeInstrument, changeTimeframe, changeFrom, changeTo, changeLimit}: FilterProps){
    
    const INSTRUMENTS = ["eurgbp", "eurusd", "gbpusd", "usatechidxusd" ];
    const TIMEFRAMES = ["m15", "h1", "h4"];
    
    return (
        <div>
            <p>
                
                <label> 
                    Instrument:
                    <select value = {instrument} 
                    onChange={(e) => {changeInstrument(e.target.value)}}>
                        <option value="eurgbp">EURGBP</option>
                        <option value="eurusd">EURUSD</option>
                        <option value="gbpusd">GBPUSD</option>
                        <option value="usatechidxusd">USATECHIDXUSD</option>
                    </select>
                
                <br/>
                 Timeframe:
                    <select value = {timeframe} 
                    onChange={(e) => {changeTimeframe(e.target.value)}}>
                        <option value="m15">m15</option>
                        <option value="h1">h1</option>
                        <option value="h4">h4</option>
                    </select>
                
                <br/>
                 Start:
                    <input type="datetime-local"
                    value={from.slice(0,16)}
                    onChange={(e) => {changeFrom(e.target.value)}}
                    placeholder="Enter 'from' date" 
                    />
                
                <br/>
                 End:
                    <input type="datetime-local"
                    value={to.slice(0,16)}
                    onChange={(e) => {changeTo(e.target.value)}}
                    placeholder="Enter 'to' date" 
                    />
                
                <br/>
                 Limit:
                    <input type="number"
                    value={limit}
                    onChange={(e) => {changeLimit(e.target.valueAsNumber)}}
                    placeholder="Enter limit amount (max 10000)" 
                    />
                </label>   
            </p>
        </div>
    )
}