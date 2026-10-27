import type { NextFunction, Request, Response } from "express";
import { AppError } from "../classes/errorClasses.js";

export const errorHandler = 
(err: unknown, _req: Request, res: Response, _next: NextFunction) => {

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({error :err.message})
    }

    if (err instanceof SyntaxError) {
        return res.status(400).json({error: "Malformed JSON in request body"})
    }

    console.error(err);
    return res.status(500).json({error: "Internal Server Error."})
}