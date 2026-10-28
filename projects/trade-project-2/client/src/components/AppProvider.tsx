import type { ReactNode } from "react";
import { AuthProvider } from '../context/AuthContext';
import { CandleProvider } from '../context/CandleStateContext';
import { FilterProvider } from '../context/FilterContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FilterProvider>
        <CandleProvider>{children}</CandleProvider>
      </FilterProvider>
    </AuthProvider>
  );
}