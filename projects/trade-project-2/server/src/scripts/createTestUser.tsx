import "../config/env.js";
import mongoose from 'mongoose';
import { getUserModel } from '../models/User.js';
import bcrypt from 'bcrypt';

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