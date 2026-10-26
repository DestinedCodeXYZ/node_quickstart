import { expect, test } from "vitest"
import { candleCalcs } from "../utils/candleCalcs"
import type { Candle } from "../types/Candle"

const candles: Candle[] = [
    {
        _id: "6ab2a790e78d90a76294bd42",
        timestamp: new Date('2017-01-01T22:00:00.000+00:00').toISOString(),
        instrument: "eurusd",
        priceSide: "bid",
        timeFrame: "h1",
        open: 1.05148,
        high: 1.05238,
        low: 1.05148,
        close: 1.05177,
        volume: 166.34
    }, 

    {
        _id: "6ab2a790e78d90a76294bd43",
        timestamp: new Date('2017-01-01T23:00:00.000+00:00').toISOString(),
        instrument: "eurusd",
        priceSide: "bid",
        timeFrame: "h1",
        open: 1.05179,
        high: 1.05288,
        low: 1.05178,
        close: 1.0523,
        volume: 186.51
    }, 

    {
        _id: "6ab2a790e78d90a76294bd42",
        timestamp: new Date('2017-01-02T00:00:00.000+00:00').toISOString(),
        instrument: "eurusd",
        priceSide: "bid",
        timeFrame: "h1",
        open: 1.0523,
        high: 1.0526,
        low: 1.05194,
        close: 1.05206,
        volume: 130.95
    }, 
]

test("Returns the number of bullish candles", () => {
    expect(candleCalcs("bullishCandles", candles)).toBe(2)
})

test("Returns the number of bearish candles", () => {
    expect(candleCalcs("bearishCandles", candles)).toBe(1)
})

test("Returns the lowest low", () => {
    expect(candleCalcs("lowestLow", candles)).toBe(1.05148)
})

test("Returns the highest high", () => {
    expect(candleCalcs("highestHigh", candles)).toBe(1.05288)
})

test("Returns the volume average", () => {
    expect(candleCalcs("volAvg", candles)).toBe(161.27)
})

test("Returns the average candle range", () => {
    expect(candleCalcs("avgCandleRange", candles)).toBe(0.0009)
})