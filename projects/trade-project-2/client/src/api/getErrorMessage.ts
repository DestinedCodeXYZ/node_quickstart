import axios from "axios";

export function getErrorMessage(err: unknown): string {
    if (axios.isAxiosError<{ error?: string }>(err)) {
        if (!err.response) {
            return "Can't reach the server.";   // no response at all (server down, no internet)
        }
        return err.response.data?.error ?? "Something went wrong.";
    }
    return "Something went wrong.";
}