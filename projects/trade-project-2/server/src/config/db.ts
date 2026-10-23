import mongoose from "mongoose";

export async function dbConnect(dbURI: string | undefined) {

    if (!dbURI) {
            throw new Error ("DB_URI isn't configured in the .env file")
        }
    
        await mongoose.connect(dbURI);
        console.log("Successfully connected to MongoDB!")
        console.log(`Database: ${mongoose.connection.name}`)

}