const httpStatusCodes = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORISED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER: 500
}

export class BaseError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor (name: string, statusCode: number, isOperational: boolean, description: string) {

        super(description)

        Object.setPrototypeOf(this, new.target.prototype)

        this.name = name
        this.statusCode = statusCode
        this.isOperational = isOperational
        Error.captureStackTrace(this)
    }
}

export class Api400Error extends BaseError {

    constructor (
    description = "Bad Request - Missing/invalid parameters.",
    statusCode = httpStatusCodes.BAD_REQUEST,
    isOperational = true
    ) {
        super("Api400Error", statusCode, isOperational, description)
    }
}

export class Api401Error extends BaseError {

    constructor (
    description = 'Unauthorised.',
    statusCode = httpStatusCodes.UNAUTHORISED,
    isOperational = true
    ) {
        super("Api401Error", statusCode, isOperational, description)
    }
}

export class Api404Error extends BaseError {

    constructor (
    description = 'Resource(s) not found.',
    statusCode = httpStatusCodes.NOT_FOUND,
    isOperational = true
    ) {
        super("Api404Error", statusCode, isOperational, description)
    }
}

export class Api500Error extends BaseError {

    constructor (
    description = 'Internal Server Error.',
    statusCode = httpStatusCodes.INTERNAL_SERVER,
    isOperational = true
    ) {
        super("Api500Error", statusCode, isOperational, description)
    }
}
