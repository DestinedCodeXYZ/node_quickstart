import type { Candle } from "../types/Candle.js";

export async function fetchData(url: string) {

try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP Error! status: ${response.status}`);
    }

    const data: Candle[] = await response.json();
    console.log(data);
    return data;

} 
    
catch (err) {
    console.log(`Error fetching data: ${err}`);
    throw new Error(`Error fetching data: ${err}`);
}
}
