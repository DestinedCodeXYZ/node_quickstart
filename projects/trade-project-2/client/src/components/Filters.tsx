import type { FilterProps } from "../types/Filter";

export default function Filter({instrument, timeframe, from, to, limit, changeInstrument, changeTimeframe, changeFrom, changeTo, changeLimit}: FilterProps){
    return (
        <div>
            <p>
                <label> Instrument:
                    <input type="text"
                    value={instrument}
                    onChange={(e) => {changeInstrument(e.target.value)}}
                    placeholder="Enter instrument" 
                    />
                </label>
                <br/>
                <label> Timeframe:
                    <input type="text"
                    value={timeframe}
                    onChange={(e) => {changeTimeframe(e.target.value)}}
                    placeholder="Enter timeframe" 
                    />
                </label>
                <br/>
                <label> Start:
                    <input type="datetime-local"
                    value={from.slice(0,16)}
                    onChange={(e) => {changeFrom(e.target.value)}}
                    placeholder="Enter 'from' date" 
                    />
                </label>
                <br/>
                <label> End:
                    <input type="datetime-local"
                    value={to.slice(0,16)}
                    onChange={(e) => {changeTo(e.target.value)}}
                    placeholder="Enter 'to' date" 
                    />
                </label>
                <br/>
                <label> Limit
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