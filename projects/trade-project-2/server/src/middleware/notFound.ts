import { AppError } from "../classes/errorClasses.js";
import type { Request, Response } from "express";

export function notFound(req: Request, res: Response) {
    throw new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`)
}