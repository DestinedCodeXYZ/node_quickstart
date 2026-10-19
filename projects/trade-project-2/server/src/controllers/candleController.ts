import mongoose from "mongoose";
import type { Request, Response, NextFunction } from "express";

import type { QueryFilter } from "mongoose";
import { getCandleCollection } from "../models/Candle.js";
import type { Candle } from "../models/Candle.js";


export async function getCandles(req: Request, res: Response) {

    try {

        const { instrument, timeframe, from, to, limit } = req.query;

        // Checking for required params
        if ( !instrument || !timeframe ) {
            return res.status(400).json({error: "Missing instrument/timeframe"})
        }

        if ( typeof instrument !== "string" || typeof timeframe !== "string" ) {
            return res.status(400).json({error: "Invalid query parameters"})
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
                    return res.status(400).json({ error: "Invalid 'from' date"})
                }

                filter.timestamp.$gte = parsedFrom;
            }

            if (to) {
                parsedTo = new Date(String(to));
                if (isNaN(parsedTo.getTime())) {
                    return res.status(400).json({ error: "Invalid 'to' date"})
                }

                filter.timestamp.$lte = parsedTo;
            }

            if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
                return res.status(400).json({error: "'From' date cannot be later than 'to' date"})
            }
        }
        
        let queryLimit = 100;
        let queryCap = 10000;

        if (limit) {

            if (typeof limit !== "string") {
                return res.status(400).json ({
                    error: "Invalid limit parameter"
                });
            }
            
            const parsedLimit = Number(limit);
            if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > queryCap) {
                return res.status(400).json({error: "Invalid limit parameter"})
            } 
            
            queryLimit = parsedLimit;
        }

        console.log("1. Route reached.");

        const collectionName = `candles_${instrument.toLowerCase()}_${timeframe.toLowerCase()}`;

        console.log(`2. Collection name: ${collectionName}`);

        const tradedata = getCandleCollection(collectionName);

        console.log("3. Model created.");

        console.log("4. About to query MongoDB");

        const candles = await tradedata.find(filter).limit(queryLimit).sort({timestamp: 1});

        if (candles.length === 0) {
            res.status(404).json({ error: "No candles found."});
        } 
        
        else {
            console.log(`Fetched candles: ${candles.length}`)
            res.json(candles);
        }

        }

    catch (err) {
        console.log(`Error fetching candles: ${err}`)
        res.status(500).json({error: "Internal Server Error"})
    }
}

export async function getCandleById(req: Request, res: Response) {
    
    try {
        const { instrument, timeframe, id } = req.params;
    
        if (!instrument || !timeframe || !id) {
            return res.status(400).json({ error: "Missing parameter(s)"})
        }
    
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ error: "Invalid id"})
        }
    
        console.log("1. Route reached.");
    
        const collectionName = `candles_${instrument.toString().toLowerCase()}_${timeframe.toString().toLowerCase()}`;
    
        console.log(`2. Collection name: ${collectionName}`);
    
        const tradedata = getCandleCollection(collectionName);
    
        console.log("3. Model created.");
    
        console.log("4. About to query MongoDB");
    
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

    }
}
