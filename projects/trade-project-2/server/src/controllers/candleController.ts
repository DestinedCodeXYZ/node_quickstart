import mongoose from "mongoose";
import type { Request, Response } from "express";

import type { QueryFilter } from "mongoose";
import { getCandleCollection } from "../models/Candle.js";
import type { Candle } from "../models/Candle.js";
import { AppError } from "../classes/errorClasses.js";

const INSTRUMENTS = ["eurgbp", "eurusd", "gbpusd", "usatechidxusd"];
const TIMEFRAMES = ["m15", "h1", "h4"];

export async function getCandles(req: Request, res: Response) {

        const { instrument, timeframe, from, to, limit } = req.query;

        const filter: QueryFilter<Candle> = {};

        // Checking for required params
        if ( !instrument || !timeframe ) {
           throw new AppError(400, "Missing instrument/timeframe", true)
        }

        if ( typeof instrument !== "string" || typeof timeframe !== "string" ) {
            throw new AppError(400, "Invalid query parameters", true)
        }

        if ( !INSTRUMENTS.includes(instrument.toLowerCase()) || !TIMEFRAMES.includes(timeframe.toLowerCase()) ) {
           throw new AppError(400, "Invalid query parameters", true)
        }

        filter.instrument = instrument;
        filter.timeframe = timeframe;

        // Checking for optional params
        if (from || to) {

            let parsedFrom: Date | undefined;
            let parsedTo: Date | undefined;

            filter.timestamp = {};

            if (from) {
                parsedFrom = new Date(String(from));
                if (isNaN(parsedFrom.getTime())) {
                    throw new AppError(400, "Invalid 'from' date")
                }

                filter.timestamp.$gte = parsedFrom;
            }

            if (to) {
                parsedTo = new Date(String(to));
                if (isNaN(parsedTo.getTime())) {
                    throw new AppError(400, "Invalid 'to' date")
                }

                filter.timestamp.$lte = parsedTo;
            }

            if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
                throw new AppError(400, "'From' date cannot be later than 'to' date")
            }
        }
        
        let queryLimit = 100;
        let queryCap = 10000;

        if (limit) {

            if (typeof limit !== "string") {
                throw new AppError(400, "Invalid limit parameter");
            }
            
            const parsedLimit = Number(limit);
            if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > queryCap) {
                throw new AppError(400, "Invalid limit parameter");
            } 
            
            queryLimit = parsedLimit;
        }



    const tradedata = getCandleCollection("candles");

    const candles = await tradedata.find(filter).limit(queryLimit).sort({timestamp: 1});

    console.log(`Fetched candles: ${candles.length}`);
    res.status(200).json(candles);

}

export async function getCandleById(req: Request, res: Response) {

    const { instrument, timeframe, id } = req.params;
    
    if (!instrument || !timeframe || !id) {
        throw new AppError(400, "Missing parameter(s)", true);
    }

    if ( typeof instrument !== "string" || typeof timeframe !== "string" ) {
       throw new AppError(400, "Invalid query parameters", true);
    }

    if ( !INSTRUMENTS.includes(instrument.toLowerCase()) || !TIMEFRAMES.includes(timeframe.toLowerCase()) ) {
        throw new AppError(400, "Invalid query parameters", true)
    }
    
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError(400, "Invalid id", true)
    }
    
    const collectionName = `candles_${instrument.toLowerCase()}_${timeframe.toLowerCase()}`;
    
    const tradedata = getCandleCollection(collectionName);
    const candle = await tradedata.findById(id);
    
    if (!candle) {
        throw new AppError(404, "No candle found.", true);
    } 
            
    res.json(candle);
}
