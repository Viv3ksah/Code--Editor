const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3000";
const WS_URL =
  import.meta.env.VITE_WS_URL?.replace(/\/$/, "") || "ws://localhost:5000";

/** @deprecated use API_URL / WS_URL — kept for older imports */
export const IP_ADDRESS = "localhost";

export { API_URL, WS_URL };
