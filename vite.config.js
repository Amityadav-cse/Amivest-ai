import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],

    server: {
        host: "127.0.0.1",
        port: 5173,
        strictPort: true,

        proxy: {
            // Frontend:
            //   /api/loans/analysis
            //
            // Backend:
            //   /loans/analysis
            "/api": {
                target: "http://127.0.0.1:5000",
                changeOrigin: true,
                secure: false,

                // IMPORTANT:
                // Remove /api before sending request to Flask.
                rewrite: (path) => path.replace(/^\/api/, ""),
            },

            // Flask auth endpoints are at root:
            // /login
            // /register
            // /session
            // etc.
            "/login": {
                target: "http://127.0.0.1:5000",
                changeOrigin: true,
                secure: false,
            },

            "/register": {
                target: "http://127.0.0.1:5000",
                changeOrigin: true,
                secure: false,
            },

            "/session": {
                target: "http://127.0.0.1:5000",
                changeOrigin: true,
                secure: false,
            },

            "/logout": {
                target: "http://127.0.0.1:5000",
                changeOrigin: true,
                secure: false,
            },

            "/debug-session": {
                target: "http://127.0.0.1:5000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});