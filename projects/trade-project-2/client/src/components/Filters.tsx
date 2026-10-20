import type { Filter } from "../types/Filter";

export default function Filter({instrument, timeframe, from, to, limit, changeInstrument, changeTimeframe, changeFrom, changeTo, changeLimit}: Filter){
    return (
        <div>
            <p>
                <input type="text"
                value={instrument}
                onChange={(e) => {changeInstrument(e.target.value)}}
                placeholder="Enter instrument" 
                />
                <br/>
                <input type="text"
                value={timeframe}
                onChange={(e) => {changeTimeframe(e.target.value)}}
                placeholder="Enter timeframe" 
                />
                <br/>
                <input type="datetime-local"
                value={from.slice(0,16)}
                onChange={(e) => {changeFrom(e.target.value)}}
                placeholder="Enter 'from' date" 
                />

                <input type="datetime-local"
                value={to.slice(0,16)}
                onChange={(e) => {changeTo(e.target.value)}}
                placeholder="Enter 'to' date" 
                />
                <br/>
                <input type="number"
                value={limit}
                onChange={(e) => {changeLimit(e.target.valueAsNumber)}}
                placeholder="Enter limit amount (max 10000)" 
                />
            </p>
        </div>
    )
}