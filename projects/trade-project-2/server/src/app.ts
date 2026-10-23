import "./config/env.js";
import express from 'express';
import cors from 'cors';

import candleRoutes from "./routes/candleRoutes.js"
import loginRoute from "./routes/loginRoute.js";
import { requireAuth } from './middleware/requireAuth.js';
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.use(cors({
    origin: process.env.CORS_DEV_ORIGIN, // Allow all origins for development; adjust in production
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()}: ${req.method} ${req.url}`)
    next();
})

console.log("Mounting login router");

app.use("/api/login", loginRoute);

console.log("Mounting candle router");

app.use("/api/candles", requireAuth, candleRoutes);

app.use(errorHandler);

export default app;