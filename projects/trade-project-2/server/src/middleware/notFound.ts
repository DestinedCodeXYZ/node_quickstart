import { Api404Error } from "../classes/errorClasses.js";
import type { Request, Response } from "express";

export function notFound(req: Request, res: Response) {
    throw new Api404Error(`Route not found: ${req.method} ${req.originalUrl}`)
}