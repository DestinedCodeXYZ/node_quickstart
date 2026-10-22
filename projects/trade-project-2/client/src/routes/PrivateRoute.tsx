import { Navigate, Outlet } from "react-router";
import useAuth from "../hooks/useAuth";

export default function PrivateRoute() {
  const token = localStorage.getItem("token");

  const { auth } = useAuth();
  const isAuthenticated = auth.state === "success" || token !== null;
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}