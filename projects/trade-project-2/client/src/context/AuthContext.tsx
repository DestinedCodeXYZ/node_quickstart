import axios from "axios";
import { createContext, useState, type ReactNode } from "react";
import type { AuthContextValue } from "../types/Auth";
import type { AuthState } from "../types/Auth";
import { loginAuth } from "../api/loginAuth";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: {children: ReactNode}) {

    const [auth, setAuth] = useState<AuthState>({state: "unauthenticated"});

    async function login({username, password}: {username: string; password: string}) {
        
        setAuth({state: "loading"});

        try {
            const data = await loginAuth({username, password});
            localStorage.setItem("token", data.token);
            setAuth({state: "success", username: data.username})
        } 
        
        catch(err) {
            const message = axios.isAxiosError<{ error?: string }>(err)
            ? err.response?.data?.error ?? err.message
            : err instanceof Error
                ? err.message
                : "An unknown error has occurred.";

            setAuth({ state: "error", message })   
        }
    }

    async function logout() {
        localStorage.removeItem("token");
        setAuth({state: "unauthenticated"});
        console.log("Logging out...")
    }

    return (
        <AuthContext.Provider value= { {auth, login, logout} }>
            { children }
        </AuthContext.Provider>
    )
}
    
