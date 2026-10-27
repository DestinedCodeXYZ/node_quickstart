import type { Request, Response } from "express";
import { getUserModel } from "../models/User.js";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { AppError } from "../classes/errorClasses.js";

export async function login(req: Request, res: Response) {

        const { username, password } = req.body ?? {};
  
        if (!username || !password) {
          throw new AppError(400, "Missing username/password.");
        }
  
        if (typeof username !== "string" || typeof password !== "string" ) {
          throw new AppError(400, "Wrong username/password type received.");
        }
  
        if (username.length < 1 || password.length < 1) {
          throw new AppError(400, "Invalid user/password.");
        }

        const userData = getUserModel();
          
        const user = await userData.findOne({ "username": username });
  
        if (!user) {
          throw new AppError(401, "Invalid user/password.");
        }
  
        const isValid = await bcrypt.compare(password, user.password);
  
        if (!isValid) {
          throw new AppError(401, "Invalid user/password.")
        }
  
        const token = jwt.sign(
          { sub: user.id, username: user.username },
          process.env.JWT_TOKEN!,
          { expiresIn: "1h" },
        );

        return res.json({ token, username: user.username });

}
  

