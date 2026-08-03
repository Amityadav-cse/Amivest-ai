import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backend = "http://127.0.0.1:5000";

export default defineConfig({
    plugins: [react()],

    server: {
        host: "127.0.0.1",
        port: 5173,
        strictPort: true,

        proxy: {
            "/chat": {
                target: backend,
                changeOrigin: true,
            },

            "/transactions": {
                target: backend,
                changeOrigin: true,
            },

            "/transaction": {
                target: backend,
                changeOrigin: true,
            },

            "/dashboard": {
                target: backend,
                changeOrigin: true,
            },

            "/upload": {
                target: backend,
                changeOrigin: true,
            },

            "/goals": {
                target: backend,
                changeOrigin: true,
            },

            "/investments": {
                target: backend,
                changeOrigin: true,
            },

            "/loans": {
                target: backend,
                changeOrigin: true,
            },

            "/payment": {
                target: backend,
                changeOrigin: true,
            },

            "/budget": {
                target: backend,
                changeOrigin: true,
            },

            "/user": {
                target: backend,
                changeOrigin: true,
            },

            "/tax": {
                target: backend,
                changeOrigin: true,
            },

            "/rbi": {
                target: backend,
                changeOrigin: true,
            },

            "/news": {
                target: backend,
                changeOrigin: true,
            },

            "/progress": {
                target: backend,
                changeOrigin: true,
            },

            "/test-ai": {
                target: backend,
                changeOrigin: true,
            },

            "/fraud": {
                target: backend,
                changeOrigin: true,
            }
        }
    }
});