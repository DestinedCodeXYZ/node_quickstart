import { Navigate } from 'react-router-dom';
import Register from '../components/Register';
import useAuth from '../hooks/useAuth';

export default function RegisterPage() {

    const { auth, register } = useAuth();

    return (
        <div>
            <h1> <b>Register</b> </h1>
            <Register onRegister={register} />
            {auth.state === "error" && <p className='authMsg'>{auth.message}</p>}
            {auth.state === "success" && <Navigate to="/candles" replace />}
        </div> 
    )
}