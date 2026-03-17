import { describe, expect, it } from "vitest";

import { isRecoverableModuleLoadError } from "@/app/utils/moduleLoadRecovery";

describe("isRecoverableModuleLoadError", () => {
  it("detects dynamic import fetch failures", () => {
    expect(isRecoverableModuleLoadError(new TypeError("Failed to fetch dynamically imported module: http://localhost:5173/src/pages/Test.tsx"))).toBe(true);
    expect(isRecoverableModuleLoadError("Importing a module script failed.")).toBe(true);
  });

  it("detects stale optimized dependency errors", () => {
    expect(isRecoverableModuleLoadError(new Error("Outdated Optimize Dep"))).toBe(true);
  });

  it("ignores unrelated runtime errors", () => {
    expect(isRecoverableModuleLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isRecoverableModuleLoadError(null)).toBe(false);
  });
});
