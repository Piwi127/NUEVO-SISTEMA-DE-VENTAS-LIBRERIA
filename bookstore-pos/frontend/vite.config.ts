import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    include: [
      "xlsx",
      "@mui/material",
      "@mui/material/styles",
      "@mui/material/Paper",
      "@mui/material/Button",
      "@mui/material/TextField",
      "@mui/material/Dialog",
      "@mui/material/DialogActions",
      "@mui/material/DialogContent",
      "@mui/material/DialogTitle",
      "@mui/material/Alert",
      "@mui/material/Tabs",
      "@mui/material/Tab",
      "@mui/material/Menu",
      "@mui/material/MenuItem",
      "@mui/material/Table",
      "@mui/material/TableBody",
      "@mui/material/TableCell",
      "@mui/material/TableContainer",
      "@mui/material/TableHead",
      "@mui/material/TableRow",
      "@mui/material/Checkbox",
      "@mui/material/Switch",
      "@mui/material/Chip",
      "@mui/icons-material",
      "@mui/icons-material/Download",
      "@mui/icons-material/Menu",
      "@mui/icons-material/Logout",
      "@mui/icons-material/KeyboardArrowDownRounded",
      "@mui/icons-material/Storefront",
      "@tanstack/react-query",
      "react-router-dom",
      "react-hook-form",
      "@hookform/resolvers",
      "@hookform/resolvers/zod",
      "zod",
      "axios",
      "qrcode",
    ],
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ws": {
        target: "ws://127.0.0.1:8000",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
