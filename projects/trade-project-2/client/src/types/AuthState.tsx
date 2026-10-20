export type AuthState = 
{ state: "loading" } |
{ state: "success" ; username: string } |
{ state: "error" ; message: string } 