import type { Request, Response } from "express";
import { Api400Error, Api401Error, Api404Error, Api500Error } from "../classes/errorClasses.js";

export async function errorHandler(req: Request, res: Response) {

    try {
        switch (res.statusCode) {
            case 400:
                throw res.json({error: "Bad Request - Missing/invalid parameters."});
            
            case 401:
                throw res.json({error: "Unauthorized."});

            case 404: 
                throw res.json({error: "Resource not found."});
        }
    }

    catch(err) {
        console.error(err);
    }
    
}