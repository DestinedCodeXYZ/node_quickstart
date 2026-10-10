import mongoose from "mongoose";

export interface Candle {
    timestamp: Date;
    instrument: string;
    priceSide: string;
    timeFrame: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const candleSchema = new mongoose.Schema<Candle>({
    timestamp: {
        type: Date,
        required: true
    },

    instrument: {
        type: String,
        required: true
    },

    priceSide: {
        type: String,
        required: true
    },

    open: {
        type: Number,
        required: true
    },

    high: {
        type: Number,
        required: true
    },

    low: {
        type: Number,
        required: true
    },

    close: {
        type: Number,
        required: true
    },

    volume: {
        type: Number,
        required: true
    },

    timeFrame: {
        type: String,
        required: true
    }
})

export function getCandleCollection( collectionName: string ): mongoose.Model<Candle> {
    return (
        mongoose.models[collectionName] as mongoose.Model<Candle> ||
        mongoose.model<Candle>(collectionName, candleSchema, collectionName)
    )
}