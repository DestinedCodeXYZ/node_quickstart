import type { Candle } from "../types/Candle";

const validCalcs = [
    "bullishCandles", "bearishCandles", "lowestLow",
    "highestHigh", "volAvg", "avgCandleRange"
] as const

type CalcType = typeof validCalcs[number];

function isCalcType(calcType: string): calcType is CalcType {
    return validCalcs.some((validCalc) => validCalc === calcType);
}

export function candleCalcs(calcType: string, candles: Candle[]): number {
    if (!isCalcType(calcType)) {
        throw new Error("Invalid calculation type.")
    }

    if (candles.length === 0) {
        return 0;
    }

    switch (calcType) {
        case "bullishCandles":
            return Number(candles.filter((candle) => {
                return candle.open < candle.close
            }).length);

        case "bearishCandles":
            return Number(candles.filter((candle) => {
                return candle.open > candle.close
            }).length);

        case "lowestLow":
            return candles.reduce((candle, nextCandle) => {
                return Math.min(candle, nextCandle.low)
            }, Infinity);

        case "highestHigh":
            return candles.reduce((candle, nextCandle) => {
                return Math.max(candle, nextCandle.high)
            }, 0);

        case "volAvg":
            return Number(((candles.reduce((candle, nextCandle) => {
                return candle + nextCandle.volume
            }, 0)) / candles.length).toFixed(2))

        case "avgCandleRange":
            return Number(((candles.reduce( (sum, candle) => 
                (sum + (candle.high - candle.low)), 0
            )) / candles.length).toFixed(4))

        default:
            throw new Error("Invalid calculation type.")
    }

}