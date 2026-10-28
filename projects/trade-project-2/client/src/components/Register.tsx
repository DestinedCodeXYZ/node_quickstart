import { useState } from "react"  
import type { RegisterProps } from "../types/Register";
import '../styles/Register.css';
import useAuth from "../hooks/useAuth";
import Loading from "../components/Loading";

export default function Register({onRegister}: RegisterProps) {

    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');

    const { auth } = useAuth();

    return (
        <div>
            <form onSubmit={(e) => {
                e.preventDefault();
                onRegister({
                    username: user,
                    password: pass
                });
            }}>
                <label>
                    Username: 
                    <input type="text" name="user" value={user} onChange={(e) => {setUser(e.target.value)}}></input><br/>
                </label>
                
                <label>
                    Password: 
                    <input type="password" name="pass" value={pass} onChange={(e) => {setPass(e.target.value)}}></input><br/>
                </label>
                
                {auth.state === "loading" ? <Loading /> : <input type="submit" value="Register"></input>}

            </form>
        </div>
    )
}