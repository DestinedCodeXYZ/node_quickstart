import { createContext, useState } from 'react';
import { handleLogin } from '../api/login';
import type { ReactNode } from 'react';
import type { AuthState, AuthContextValue } from '../types/Auth';
import type { LoginCredentials } from '../types/Login';



export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export const AuthProvider = ({ children }: { children: ReactNode }) => {

    const [auth, setAuth] = useState<AuthState>({state: "loading"})

    async function login({username, password}: LoginCredentials) {

            try {
                const data = await handleLogin({username, password});
                setAuth({state: "success", data}) // Instead it sets token here?
                
            } 
            
            catch(err) {
            console.log(`${err}`)
            const message = err instanceof Error ? err.message : "An unknown error has occured."
            setAuth({state: "error", message})
            }
        } 

        function logout() {

            try {
                localStorage.removeItem("token");
                setAuth({state: "loading"})
            }
            
            catch(err) {
                console.log(`${err}`);
                const message = err instanceof Error ? err.message : "An unknown error has occured."
                setAuth({state: "error", message})
            }
        }

    return (
        <AuthContext.Provider value={{ auth, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

  