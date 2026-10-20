import '../styles/Login.css';
import Login from "../components/Login";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function LoginPage() {

    const { login, auth } = useAuth();

    if (auth.state === "success") {
        return <Navigate to="/candles" replace />;
    }

    return (
        <div>
            <Login onLogin={login}/>
            {auth.state === "error" && <p className = "authMsg">{auth.message}</p>}
        </div>
    )
}