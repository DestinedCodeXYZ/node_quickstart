import express from "express";
import { getCandles, getCandleById } from "../controllers/candleController.js";

const router = express.Router();

// Search query route
router.get("/", getCandles);

// Individual candle route
router.get("/:instrument/:timeframe/:id", getCandleById) 

export default router