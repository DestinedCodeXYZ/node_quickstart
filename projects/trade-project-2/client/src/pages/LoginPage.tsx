import Login from '../components/Login';
import { login } from '../api/login';

import type { AuthState } from '../types/AuthState';
import { useState } from 'react';

export default function LoginPage() {

    const [auth, setAuth] = useState<AuthState>({state: "loading"})


    async function loginAuth({username, password}: {username: string; password: string}) {

    setAuth({state: "loading"});

        try {
            await login({username, password});
            setAuth({state: "success", username: username}) // Due to change

        } 
    
        catch(err) {
            console.log(`${err}`)
            const message = err instanceof Error ? err.message : "An unknown error has occured."
            setAuth({state: "error", message})
        }
    }

    return (
        <div>
            <Login onLogin={loginAuth} />
            {auth.state === "error" && <p className="authMsg">{auth.message}</p>}
        </div>
    )
}