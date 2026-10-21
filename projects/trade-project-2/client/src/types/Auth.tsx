import type { LoginResponse } from "./Login";

export type AuthContextValue = 
{ state: "loading" } |
{ state: "unauthenticated" } |
{ state: "success" ; data: LoginResponse } | // on successful auth, return token
{ state: "error" ; message: string } 
