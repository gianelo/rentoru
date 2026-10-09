import { defineConfig } from "@playwright/test";
import attached from "./owned-contact-attached-playwright.config";

// Inherit attach ownership, isolation and browser guards; never spawn an app here.
export default defineConfig({ ...attached, testMatch: "publicar-titulo.spec.ts" });
