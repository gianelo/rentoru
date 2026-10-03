import { handlers } from "@/modules/identity/infrastructure/auth";
import { authPageResponse } from "@/modules/identity/infrastructure/auth-page-response";

// Thin delivery adapter — translates HTTP into the Auth.js request/response
// cycle only. No business rule lives here (design.md, Technical Approach).
export const { POST } = handlers;
export const GET: typeof handlers.GET = async (request) =>
  authPageResponse(request, await handlers.GET(request));
