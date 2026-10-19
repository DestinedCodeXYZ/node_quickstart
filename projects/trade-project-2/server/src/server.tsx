import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Routes & middleware
import candleRoutes from "../routes/candleRoutes.js"
import loginRoute from "../routes/loginRoute.js";
import { requireAuth } from '../middleware/requireAuth.js';

dotenv.config({
  path: resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../.env"
  )
});

const app = express();

app.use(cors({
    origin: process.env.CORS_DEV_ORIGIN, // Allow all origins for development; adjust in production
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()}: ${req.method} ${req.url}`)
    next();
})

console.log("Mounting login router");

app.use("/api/auth/login", loginRoute);

console.log("Mounting candle router");

app.use("/api/candles", requireAuth, candleRoutes);

async function startServer() {
    const databaseURI = process.env.DB_URI;

    if (!databaseURI) {
        throw new Error ("DB_URI isn't configured in the .env file")
    }

    await mongoose.connect(databaseURI);
    console.log("Successfully connected to MongoDB!")
    console.log(`Database: ${mongoose.connection.name}`)

    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server is running on port ${process.env.PORT || 3000}`);
    })

}

startServer().catch((err) => { 
    console.log(`Failed to start server: ${err}`);
    process.exit(1);
})