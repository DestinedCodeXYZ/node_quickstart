import { createContext, useState, type ReactNode } from "react";
import type { FilterParams, FilterContextValue } from "../types/Filter";

export const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({children}: {children: ReactNode}) {

    const [filters, setFilters] = useState<FilterParams>({
        instrument: "eurgbp",
        timeframe: "h1",
        from: "",
        to: "",
        limit: 100
    });

    return (
        <FilterContext.Provider value = {{filters, setFilters}}>
            { children }
        </FilterContext.Provider>
    )
}
