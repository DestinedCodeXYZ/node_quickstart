import { Navigate, Outlet } from "react-router";
import { useAuth } from "../hooks/useAuth";

export default function PrivateRoute() {

    const { auth } = useAuth();
    const hasValidToken = auth.state === "success" && Boolean(auth.data.token);
    return hasValidToken ? <Outlet /> : <Navigate to="/login" replace />;
}