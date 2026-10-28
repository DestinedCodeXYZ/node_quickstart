import { useContext } from "react";
import { CandleContext } from "../context/CandleStateContext";

export default function useCandleState() {
    const context = useContext(CandleContext);

    if (context === undefined) {
        throw new Error("useCandleState must be called within CandleContext.")
    }

    return context;
}