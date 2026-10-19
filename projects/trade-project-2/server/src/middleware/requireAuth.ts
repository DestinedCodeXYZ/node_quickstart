import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    res.locals.user = jwt.verify(token, process.env.JWT_TOKEN!);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}