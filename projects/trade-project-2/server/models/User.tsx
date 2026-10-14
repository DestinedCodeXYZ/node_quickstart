import mongoose from 'mongoose';

export interface User {
    timestamp: Date;
    username: string;
    password: string;
}

export const userSchema = new mongoose.Schema<User> ({

    timestamp: {
            type: Date,
            required: true
    },

    username: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    }
})
