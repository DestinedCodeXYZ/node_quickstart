import type { Request, Response } from "express";
import { getUserModel } from "../models/User.js";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { AppError } from "../classes/errorClasses.js";

export async function registerUser(req: Request, res: Response) {

        const { username, password } = req.body ?? {};
  
        // Validating user input
        if (!username || !password) {
          throw new AppError(400, "Missing username/password.");
        }
  
        if (typeof username !== "string" || typeof password !== "string" ) {
          throw new AppError(400, "Wrong username/password type received.");
        }
  
        if (username.length < 1 || password.length < 1) {
          throw new AppError(400, "Invalid user/password.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = getUserModel();
        
        // Usernames must be unique - check for existing username in DB before user creation
        const existingUser = await userData.findOne({ "username": username });
  
        if (existingUser) {
          throw new AppError(401, "Username taken - use another.");
        }

        const newUser = await new userData({timestamp: new Date().toISOString(), username: username, password: hashedPassword} )
        
        await newUser.save();
        
        // Sign token for first login
        const token = jwt.sign(
          { sub: newUser.id, username: newUser.username },
          process.env.JWT_TOKEN!,
          { expiresIn: "1h" },
        );

        return res.json({ token, username: newUser.username });

}