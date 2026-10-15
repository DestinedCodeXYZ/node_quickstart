type LoginCredentials = {
    username: string;
    password: string
}

export type LoginProps = {
    onLogin: (creds: LoginCredentials) => void;
}
