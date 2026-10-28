import { createContext, useState, type ReactNode } from "react";
import type { AuthContextValue } from "../types/Auth";
import type { AuthState } from "../types/Auth";
import { loginAuth } from "../api/loginAuth";
import { regAuth } from "../api/regAuth";
import { getErrorMessage } from "../api/getErrorMessage";
import type { LoginCredentials } from "../types/Login";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: {children: ReactNode}) {

    const [auth, setAuth] = useState<AuthState>({state: "unauthenticated"});

    async function login(credentials: LoginCredentials) {
        
        setAuth({state: "loading"});

        try {
            const data = await loginAuth(credentials);
            localStorage.setItem("token", data.token);
            setAuth({state: "success", username: data.username})
        } 
        
        catch(err) {
            setAuth({ state: "error", message: getErrorMessage(err) })   
        }
    }

    async function register(credentials: LoginCredentials) {
        setAuth({state: "loading"});

        try {
            const data = await regAuth(credentials);
            localStorage.setItem("token", data.token);
            setAuth({state: "success", username: data.username});
        } catch(err) {
            setAuth({ state: "error", message: getErrorMessage(err) });
        }
    }

    async function logout() {
        localStorage.removeItem("token");
        setAuth({state: "unauthenticated"});
    }

    return (
        <AuthContext.Provider value= {{auth, login, register, logout}}>
            { children }
        </AuthContext.Provider>
    )
}
    
