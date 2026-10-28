import express from "express";
import rateLimit from "express-rate-limit";

const app = express();

export const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: "Too many requests! Try again later."
})