import { createContext } from "react";
import type { AuthContextValue } from "../types/Auth";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
