import { useState } from "react"  
import type { LoginProps } from "../types/Login";

export default function Login({onLogin}: LoginProps) {

    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');

    return (
        <div>
            <form onSubmit={(e) => {
                e.preventDefault();
                onLogin({
                    username: user,
                    password: pass
                });
            }}>
                <label>Username: </label>
                <input type="text" name="user" value={user} onChange={(e) => {setUser(e.target.value)}}></input><br/>
                <label>Password: </label>
                <input type="password" name="pass" value={pass} onChange={(e) => {setPass(e.target.value)}}></input><br/>
                <input type="submit" value="Login"></input>
            </form>
        </div>
    )
}