import "./config/env.js";
import express from 'express';
import cors from 'cors';

// Routes
import candleRoutes from "./routes/candleRoutes.js";
import loginRoute from "./routes/loginRoute.js";
import registerRoute from "./routes/registerRoute.js";

// Middleware
import { requireAuth } from './middleware/requireAuth.js';
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { limiter } from "./middleware/rateLimiter.js";

const app = express();

app.use(express.json());

app.use(cors({
    origin: process.env.CORS_DEV_ORIGIN, // Allow all origins for development; adjust in production
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(limiter)

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()}: ${req.method} ${req.url}`)
    next();
})

app.use("/api/register", registerRoute);

app.use("/api/login", loginRoute);

app.use("/api/candles", requireAuth, candleRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;