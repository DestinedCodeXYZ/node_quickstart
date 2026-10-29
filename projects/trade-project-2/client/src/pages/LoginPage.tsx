import { Navigate } from 'react-router-dom';
import Login from '../components/Login';
import useAuth from '../hooks/useAuth';

export default function LoginPage() {

    const { auth, login } = useAuth();

    return (
        <div>
            <h1 className="dbPageTitle"><b>Market Data Explorer</b> </h1>
            <Login onLogin={login} />
            {auth.state === "error" && <p className='authMsg'>{auth.message}</p>}
            {auth.state === "success" && <Navigate to="/candles"/>}
        </div> 
    )
}