import {
  createAdminClient,
  createAdminExtension,
  createHolm,
  createTransportRequest,
  createWebApp,
  createQueryResource,
  createInMemoryRuntimeAdapter,
  web,
  webRuntime,
} from "../../dist/holm.js";
import {
  createWebApp as createNarrowWebApp,
  createTransportRequest as createNarrowTransportRequest,
  webRuntime as narrowWebRuntime,
} from "../../dist/holm-web.js";

const fetcher: typeof fetch = async () => new Response('{"data":{"ok":true}}', {
  headers: { "content-type": "application/json" },
});
const adminExtension = createAdminExtension();
const runtime = webRuntime({ fetch: fetcher, cache: false });
const app = createWebApp({ runtime: { fetch: fetcher, cache: false }, navigation: false, uploads: false });
const request = createTransportRequest({ method: "GET", url: "/api/bundle" });
const query = createQueryResource({
  key: ["bundle"],
  source: { id: "runtime-web", surface: "web" },
  caller: { current: () => ({ surface: "web", principal: { kind: "browser-session" } }) },
  load: () => ({ ok: true }),
});
const testRuntime = createInMemoryRuntimeAdapter();
const adminClient = createAdminClient({
  runtime: testRuntime,
  caller: { current: () => ({ surface: "test", principal: { kind: "operator" } }) },
});
const holm = createHolm({
  runtime: testRuntime,
  caller: { current: () => ({ surface: "test", principal: { kind: "anonymous" } }) },
});
const namespaceRuntime: ReturnType<typeof web.webRuntime> = runtime;
const narrowRuntime = narrowWebRuntime({ fetch: fetcher, cache: false });
const narrowApp = createNarrowWebApp({ runtime: { fetch: fetcher, cache: false }, navigation: false, uploads: false });
const narrowRequest = createNarrowTransportRequest({ method: "POST", url: "/api/bundle", body: { mode: "json", value: { ok: true } } });

void adminExtension;
void runtime;
void app;
void request;
void query;
void testRuntime;
void adminClient;
void holm;
void namespaceRuntime;
void narrowRuntime;
void narrowApp;
void narrowRequest;
