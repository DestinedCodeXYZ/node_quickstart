import mongoose from "mongoose";
import type { Request, Response, NextFunction } from "express";

import type { QueryFilter } from "mongoose";
import { getCandleCollection } from "../models/Candle.js";
import type { Candle } from "../models/Candle.js";
import { Api400Error, Api401Error, Api404Error, Api500Error } from "../classes/errorClasses.js";

const INSTRUMENTS = ["eurgbp", "eurusd", "gbpusd", "usatechidxusd"];
const TIMEFRAMES = ["m15", "h1", "h4"];

export async function getCandles(req: Request, res: Response, next: NextFunction) {

    try {

        const { instrument, timeframe, from, to, limit } = req.query;

        // Checking for required params
        if ( !instrument || !timeframe ) {
           throw new Api400Error("Missing instrument/timeframe")
        }

        if ( typeof instrument !== "string" || typeof timeframe !== "string" ) {
            throw new Api400Error("Invalid query parameters")
        }

        if ( !INSTRUMENTS.includes(instrument.toLowerCase()) || !TIMEFRAMES.includes(timeframe.toLowerCase()) ) {
           throw new Api400Error("Invalid query parameters")
        }

        const filter: QueryFilter<Candle> = {};

        // Checking for optional params
        if (from || to) {

            let parsedFrom: Date | undefined;
            let parsedTo: Date | undefined;

            filter.timestamp = {};

            if (from) {
                parsedFrom = new Date(String(from));
                if (isNaN(parsedFrom.getTime())) {
                    throw new Api400Error("Invalid 'from' date")
                }

                filter.timestamp.$gte = parsedFrom;
            }

            if (to) {
                parsedTo = new Date(String(to));
                if (isNaN(parsedTo.getTime())) {
                    throw new Api400Error("Invalid 'to' date")
                }

                filter.timestamp.$lte = parsedTo;
            }

            if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
                throw new Api400Error("'From' date cannot be later than 'to' date")
            }
        }
        
        let queryLimit = 100;
        let queryCap = 10000;

        if (limit) {

            if (typeof limit !== "string") {
                throw new Api400Error("Invalid limit parameter");
            }
            
            const parsedLimit = Number(limit);
            if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > queryCap) {
                throw new Api400Error("Invalid limit parameter");
            } 
            
            queryLimit = parsedLimit;
        }

        const collectionName = `candles_${instrument.toLowerCase()}_${timeframe.toLowerCase()}`;

        console.log(`Collection name: ${collectionName}`);

        const tradedata = getCandleCollection(collectionName);

        const candles = await tradedata.find(filter).limit(queryLimit).sort({timestamp: 1});

        console.log(`Fetched candles: ${candles.length}`);
        res.status(200).json(candles);
    }

    catch (err) {
        console.log(`Error fetching candles: ${err}`)
        throw new Api500Error("Internal Server Error")
    }
}

export async function getCandleById(req: Request, res: Response) {
    
    try {
        const { instrument, timeframe, id } = req.params;
    
        if (!instrument || !timeframe || !id) {
            return res.status(400).json({ error: "Missing parameter(s)"})
        }

        if ( typeof instrument !== "string" || typeof timeframe !== "string" ) {
            return res.status(400).json({error: "Invalid query parameters"})
        }

        if ( !INSTRUMENTS.includes(instrument.toLowerCase()) || !TIMEFRAMES.includes(timeframe.toLowerCase()) ) {
            return res.status(400).json({error: "Invalid query parameters"})
        }
    
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "Invalid id"})
        }
    
        const collectionName = `candles_${instrument.toString().toLowerCase()}_${timeframe.toString().toLowerCase()}`;
    
        console.log(`Collection name: ${collectionName}`);
    
        const tradedata = getCandleCollection(collectionName);
    
        const candle = await tradedata.findById(id);
    
        if (!candle) {
            res.status(404).json({ error: "No candle found."});
        } 
            
        else {
            console.log(`Fetched candle: ${candle}`)
            res.json(candle);
        }
    }

    catch(err) {
        console.log(`Error fetching candle: ${err}`)
        res.status(500).json({error: "Internal Server Error"})
    }
}
