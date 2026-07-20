import { createAdminClient } from "../dist/admin/index.js";
import { RemoteError } from "../dist/transports/index.js";
import {
  createWebApp,
  createWebCaller,
  createWebTokenAuth,
  webRuntime,
} from "../dist/web/index.js";

const baseUrl = process.env.HOLM_SMOKE_URL?.trim();
if (!baseUrl) {
  console.log("Holm app smoke skipped: set HOLM_SMOKE_URL to a read-only local Holm origin.");
  process.exit(0);
}

const token = process.env.HOLM_SMOKE_TOKEN?.trim();
const auth = token ? createWebTokenAuth({ token }) : undefined;
const runtimeOptions = {
  baseUrl,
  cache: false,
  ...(auth === undefined ? {} : { auth }),
};
const app = createWebApp({
  runtime: runtimeOptions,
  navigation: false,
  uploads: false,
});
const admin = createAdminClient({
  runtime: webRuntime(runtimeOptions),
  caller: createWebCaller({
    principal: { kind: "operator" },
    origin: new URL(baseUrl).origin,
  }),
});

try {
  const health = await app.app.http.get("/.holm/status", {
    responseMode: "json",
    reason: "issue-007-read-only-holm-health-smoke",
  });
  if (!health || typeof health !== "object" || health.status !== "healthy") {
    throw new Error("Holm health smoke returned an unexpected payload.");
  }
  console.log(`Holm health smoke passed: ${String(health.version ?? "unknown version")}.`);
  const adminStatus = await admin.admin.system.status();
  if (!adminStatus || typeof adminStatus !== "object" || adminStatus.status !== "healthy") {
    throw new Error("Holm admin transport smoke returned an unexpected public status payload.");
  }
  console.log("Holm admin transport smoke passed: explicit operator caller reached /.holm/status.");

  try {
    const response = await app.app.http.requestRaw({
      method: "GET",
      url: "/api/me",
      responseMode: "json",
    }, { reason: "issue-007-read-only-holm-smoke" });
    const status = response.metadata && typeof response.metadata === "object"
      ? response.metadata.status
      : undefined;
    console.log(`Holm app smoke passed: GET /api/me${typeof status === "number" ? ` (${status})` : ""}.`);
  } catch (error) {
    if (error instanceof RemoteError && (error.status === 401 || error.status === 403)) {
      console.log(`Holm app smoke passed: GET /api/me reached Holm auth (${error.status}).`);
    } else if (error instanceof RemoteError && error.status === 404) {
      console.log("Holm app-route smoke skipped: the selected local host has no app /api/me route.");
    } else {
      throw error;
    }
  }
} finally {
  await Promise.allSettled([app.dispose(), admin.dispose()]);
}
