import type { LoginCredentials } from "./Login";

export type AuthState = 
{ state: "loading" } |
{ state: "unauthenticated" } |
{ state: "success" ; username: string } |
{ state: "error" ; message: string } 

export type AuthContextValue = {
    auth: AuthState;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>
} 
