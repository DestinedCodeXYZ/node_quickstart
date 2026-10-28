import { api } from "./axiosClient";
import type { RegResponse } from "../types/Register";

export async function regAuth(params: { username: string; password: string; }) {

  const { data } = await api.post<RegResponse>("/register", params );
  return data;
  
}