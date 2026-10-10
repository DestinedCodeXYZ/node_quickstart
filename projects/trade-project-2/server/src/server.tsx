import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import candleRoutes from "../routes/candleRoutes.js"

dotenv.config({
  path: resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../.env"
  )
});

const app = express();

app.use(cors({
    origin: "*", // Allow all origins for development; adjust in production
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

console.log("Mounting candle router")
app.use("/api/candles", candleRoutes);

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()}: ${req.method} ${req.url}`)
    next();
})

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