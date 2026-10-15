import type { LoginProps } from "./Login";

export type LoginAuth = 
{ state: "loading" } |
{ state: "success" ; data: LoginProps} |
{ state: "error" ; message: string } 
