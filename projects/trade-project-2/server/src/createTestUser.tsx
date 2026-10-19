import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import { getUserModel, userSchema } from '../models/User.js';
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from 'bcrypt';

dotenv.config({
  path: resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../.env"
  )
});

const password = "test";
const saltRounds = 10;



async function createTestUser() {

    const hashedPassword = bcrypt.hash(password, saltRounds);
    
    try {
        const databaseURI = process.env.DB_URI;

        if (!databaseURI) {
            throw new Error ("DB_URI isn't configured in the .env file")
        }

        await mongoose.connect(databaseURI);

        console.log("Successfully connected to MongoDB!");
        console.log(`Database: ${mongoose.connection.name}`);

        const user = getUserModel();

        const testUser = new user({timestamp: new Date().toISOString(), username: "TEST", password: hashedPassword })

        await testUser.save()

        mongoose.disconnect();

    }
    
    catch(err) {
        console.log(`ERROR: ${err}`);
    } 
}

createTestUser().catch((err) => { 
    console.log(`Failed to create user: ${err}`);
    process.exit(1);
})