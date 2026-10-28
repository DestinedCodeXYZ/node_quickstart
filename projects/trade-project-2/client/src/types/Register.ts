import type { LoginCredentials } from "./Login";

export type RegisterProps = {
    onRegister: (credentials: LoginCredentials) => void;
}

export type RegResponse = {
    token: string;
    username: string;
}
