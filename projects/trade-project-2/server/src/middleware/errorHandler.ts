import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { BaseError } from "../classes/errorClasses.js";

export const errorHandler: ErrorRequestHandler = 
(err, _req: Request, res: Response, _next: NextFunction) => {

    if (err instanceof BaseError) {
        return res.status(err.statusCode).json({error :err.message})
    }

    console.error(err);
    return res.status(500).json({error: "Internal Server Error."})
}