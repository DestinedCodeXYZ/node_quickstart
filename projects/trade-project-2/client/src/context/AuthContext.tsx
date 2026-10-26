import { createContext, useState, type ReactNode } from "react";
import type { AuthContextValue } from "../types/Auth";
import type { AuthState } from "../types/Auth";
import { loginAuth } from "../api/loginAuth";
import { getErrorMessage } from "../api/getErrorMessage";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: {children: ReactNode}) {

    const [auth, setAuth] = useState<AuthState>({state: "unauthenticated"});

    async function login({username, password}: {username: string; password: string}) {
        
        setAuth({state: "loading"});

        try {
            const data = await loginAuth({username, password});
            localStorage.setItem("token", data.token);
            setAuth({state: "success", username: data.username})
            console.log("Logged in successfully!")
        } 
        
        catch(err) {
            setAuth({ state: "error", message: getErrorMessage(err) })   
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
    
