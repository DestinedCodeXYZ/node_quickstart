import mongoose from "mongoose";

import express from "express";
import { getUserModel } from "../models/User.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            console.log("Missing username/password.")
            return res.status(400).json({error: "Missing username/password."})
        }

        if (typeof username !== "string" || typeof password !== "string" ) {
            console.log("Wrong username/password type received.")
            return res.status(400).json({error: "Wrong username/password type received."})
        }

        if (username.length < 1 || password.length < 1) {
            console.log("Invalid user/password")
            return res.status(400).json({error: "Invalid user/password"})
        }
        
        console.log("1. Route reached.");
        
        const userData = getUserModel();
        
        console.log("3. Model created.");
        
        console.log("4. About to query MongoDB");
        
        const user = await userData.findOne({ "username": username });

        if (!user) {
            return res.status(401).json({error: "Invalid user/password"});
        }

        console.log(user.username);

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({error: "Invalid user/password"})
        }

        const token = jwt.sign(
        { sub: user.id, username: user.username },
        process.env.JWT_SECRET!,
        { expiresIn: "1h" },
        );

        res.json({ token, username: user.username });
        
        res.status(200).json({username: `${user.username}`})
    }

    catch(err) {
        console.log(err)
        res.status(500).json({error: "Internal server error"})
        }
    }
) 

export default router