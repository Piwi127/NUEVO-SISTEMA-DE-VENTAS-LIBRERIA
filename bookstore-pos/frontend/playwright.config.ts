import { defineConfig, devices } from "@playwright/test";

const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 4173);
const backendPort = Number(process.env.E2E_BACKEND_PORT || 8010);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${frontendPort}`;
process.env.E2E_API_URL = process.env.E2E_API_URL || `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 12_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `.venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port ${backendPort}`,
      cwd: "../backend",
      url: `http://127.0.0.1:${backendPort}/healthz`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        BOOTSTRAP_DEV_ADMIN: "true",
        BOOTSTRAP_ADMIN_USERNAME: process.env.E2E_USERNAME || "e2e_admin",
        BOOTSTRAP_ADMIN_PASSWORD: process.env.E2E_PASSWORD || "E2EAdmin1234",
        CORS_ORIGINS: `http://127.0.0.1:${frontendPort},http://localhost:${frontendPort}`,
      },
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      cwd: ".",
      url: `http://127.0.0.1:${frontendPort}/login`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_URL: process.env.E2E_API_URL || `http://127.0.0.1:${backendPort}`,
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
