import { useContext } from "react";
import { FilterContext } from "../context/FilterContext";

export default function useFilters() {
    const context = useContext(FilterContext);
    
        if (context === undefined) {
            throw new Error("useFilters must be called within FilterContext.")
        }
    
        return context;
}