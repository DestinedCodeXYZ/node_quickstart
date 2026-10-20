import type { LoginResponse, LoginCredentials } from "./Login";

export type AuthState = 
{ state: "loading" } |
{ state: "success" ; data: LoginResponse } |
{ state: "error" ; message: string } 

export type AuthContextValue =  {
    auth: AuthState;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
}