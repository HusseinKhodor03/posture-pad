export const DEFAULT_HTTP_PORT = 3000;
export const DEFAULT_TCP_PORT = 9000;

export const HTTP_PORT = process.env.PORT || DEFAULT_HTTP_PORT;
export const TCP_PORT = process.env.TCP_PORT || DEFAULT_TCP_PORT;
export const FRONTEND_URL = process.env.FRONTEND_URL;

export const FRONTEND_PUBLIC_PATH = ["..", "frontend", "public"];
