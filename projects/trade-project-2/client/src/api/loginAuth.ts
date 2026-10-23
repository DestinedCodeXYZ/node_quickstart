import { api } from "./axiosClient";
import type { LoginResponse } from "../types/Login";

export async function loginAuth(params: { username: string; password: string; }) {

  const { data } = await api.post<LoginResponse>("/login", params );
  return data;
}