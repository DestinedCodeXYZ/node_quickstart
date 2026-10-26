export type LoginCredentials = { // User input typing
    username: string;
    password: string
}

export type LoginProps = { // Type for props
    onLogin: (creds: LoginCredentials) => void;
}

export type LoginResponse = {
    token: string;
    username: string;
}

export type LoginAuth = // State types
{ state: "loading" } |
{ state: "success" ; data: LoginProps} |
{ state: "error" ; message: string } 