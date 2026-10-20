import { api } from "./axiosClient";
import type { LoginResponse } from "../types/Login";

// Calls API and sets token on successful call

export async function handleLogin(credentials: { username: string; password: string }) {
    const { data } = await api.post<LoginResponse>("/login", credentials);

    localStorage.setItem("token", data.token);

    return data;
}