import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Api401Error } from "../classes/errorClasses.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    throw new Api401Error("Can't find valid token.")
  }

  try {
    res.locals.user = jwt.verify(token, process.env.JWT_TOKEN!);
    
  } catch {
    throw new Api401Error("Can't find valid token.")
  }
  
  next();
}