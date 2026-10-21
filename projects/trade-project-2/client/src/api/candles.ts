import { api } from "./axiosClient";
import type { Candle } from "../types/Candle";

export async function getCandles(params: {
  instrument: string;
  timeframe: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { data } = await api.get<Candle[]>("/candles", { params });
  return data;
}