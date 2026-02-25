import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const DEFAULT_API_PROXY_TARGET = "http://127.0.0.1:8000";
const API_PROXY_TARGET = (
	process.env.VITE_API_PROXY_TARGET ||
	process.env.VITE_API_BASE ||
	DEFAULT_API_PROXY_TARGET
).replace(/\/+$/, "");
const API_PROXY_PREFIX = "/api";
const apiProxy = {
	[API_PROXY_PREFIX]: {
		target: API_PROXY_TARGET,
		changeOrigin: true,
		rewrite: (path: string) => path.replace(/^\/api/, ""),
	},
};

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	base: process.env.VITE_BASE_PATH || "/",
	server: {
		hmr: true, // Automatically refresh/reload the page behind the scenes to reflect code changes.
		proxy: apiProxy,
	},
	preview: {
		// Prod like, if configured to run vite a prod/preview
		proxy: apiProxy,
	},
});
