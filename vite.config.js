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
                secure: false,
            },

            "/transactions": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/transaction": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/dashboard": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/upload": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/goals": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/investments": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/loans": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/payment": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/budget": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/user": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/tax": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/rbi": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/news": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/progress": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/test-ai": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },

            "/fraud": {
                target: backend,
                changeOrigin: true,
                secure: false,
            },
        },
    },
});