import type { Request, Response, NextFunction } from "express";
import { getUserModel } from "../models/User.js";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { Api400Error, Api401Error, Api500Error } from "../classes/errorClasses.js";

export async function login(req: Request, res: Response) {

  try {
        const { username, password } = req.body
  
        if (!username || !password) {
          console.log("Missing username/password.");
          throw new Api400Error("Missing username/password.");
        }
  
        if (typeof username !== "string" || typeof password !== "string" ) {
          console.log("Wrong username/password type received.");
          throw new Api400Error("Wrong username/password type received.");
        }
  
        if (username.length < 1 || password.length < 1) {
          console.log("Invalid user/password");
          throw new Api400Error("Invalid user/password");
        }

        const userData = getUserModel();
          
        const user = await userData.findOne({ "username": username });
  
        if (!user) {
          throw new Api401Error("Invalid user/password");
        }
  
        const isValid = await bcrypt.compare(password, user.password);
  
        if (!isValid) {
          throw new Api401Error("Invalid user/password")
        }
  
        const token = jwt.sign(
          { sub: user.id, username: user.username },
          process.env.JWT_TOKEN!,
          { expiresIn: "1h" },
        );

        return res.json({ token, username: user.username });
      }
  
      catch(err) {
        console.log(err)
        throw new Api500Error("Internal server error");
      }
}
  

