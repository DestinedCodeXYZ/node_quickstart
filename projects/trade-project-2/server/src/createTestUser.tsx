import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import { userSchema } from '../models/User.js';
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

let hashedPassword: string;

bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
        console.error(err)
        return;
    }

    console.log(hash)
    hashedPassword = hash;
}) 

async function createTestUser() {
    try {
        const databaseURI = process.env.DB_URI;

        if (!databaseURI) {
            throw new Error ("DB_URI isn't configured in the .env file")
        }

        await mongoose.connect(databaseURI);

        console.log("Successfully connected to MongoDB!");
        console.log(`Database: ${mongoose.connection.name}`);

        const user = mongoose.model('User', userSchema);

        
        const testUser = new user({timestamp: new Date().toISOString(), username: "TEST", password: hashedPassword })

        await testUser.save()

    }
    
    catch(err) {
        console.log(`ERROR: ${err}`);
    } finally { return 1 }
}

createTestUser().catch((err) => { 
    console.log(`Failed to start server: ${err}`);
    process.exit(1);
})