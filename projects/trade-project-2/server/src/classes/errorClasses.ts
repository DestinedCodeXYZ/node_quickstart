const httpStatusCodes = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORISED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER: 500
}

export class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean | undefined;

    constructor (statusCode: number, description: string, isOperational?: boolean) {

        super(description)

        Object.setPrototypeOf(this, new.target.prototype)

        this.statusCode = statusCode
        this.isOperational = isOperational
        Error.captureStackTrace(this)
    }
}

