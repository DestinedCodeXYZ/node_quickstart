export type LoginCredentials = { // Submitted by user
    username: string;
    password: string;
}

export type LoginProps = { // Props for login component -- might get replaced
    onLogin: (creds: LoginCredentials) => void;
}

export type LoginResponse = { // Returned by backend (api)
    token: string;
    username: string;
};
