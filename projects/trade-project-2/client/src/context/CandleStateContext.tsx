// Types
import type { CandleContextValue, CandleState} from "../types/Candle";
import type { FilterParams } from "../types/Filter";

// API
import { getCandles } from "../api/candles";
import { getErrorMessage } from "../api/getErrorMessage";

//Other
import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export const CandleContext = createContext<CandleContextValue | undefined>(undefined);

export function CandleProvider({ children }: {children: ReactNode}) {

    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => abortControllerRef.current?.abort();
    }, []);

    const [candleState, setCandleState] = useState<CandleState>({state: "loading"});


        const loadCandles = useCallback(async (params: FilterParams) => {

            abortControllerRef.current?.abort();

            const controller = new AbortController();
            abortControllerRef.current = controller;

            setCandleState({state: "loading"});

            try{
                const data = await getCandles(params, controller.signal);
                if (abortControllerRef.current === controller) {
                    setCandleState({ state: "success", candles: data });
                }
            }

            catch(err) {
                if (controller.signal.aborted || abortControllerRef.current !== controller) {
                    return;
                }

                setCandleState({state: "error", message: getErrorMessage(err)})
            }

        }, [])
   
        return (
            <CandleContext.Provider value= { { candleState, loadCandles } }>
                { children }
            </CandleContext.Provider>
        )
}

