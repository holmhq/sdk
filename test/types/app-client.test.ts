import {
  createAppExtension,
  type AppApi,
  type AppUploadService,
  type CompleteMagicLinkInput,
} from "../../src/app/index.js";
import {
  createHolm,
  createStaticCallerProvider,
  type RuntimeAdapter,
} from "../../src/core/index.js";

const runtime = {
  id: "type-runtime",
  surface: "test",
  clock: { now: () => 0 },
  scheduler: { schedule: () => ({ cancel: () => undefined }) },
  async start() {
    return [{ id: "holm.http.app", origin: "runtime", version: { major: 1, minor: 0 } }] as const;
  },
  async invoke(request) {
    return { requestId: request.requestId, payload: { ok: true } };
  },
  async dispose() {
    return undefined;
  },
} satisfies RuntimeAdapter;
const uploads: AppUploadService = {
  upload: (request) => ({ path: request.path }),
};
const extension = createAppExtension({ uploads });
const holm = createHolm({
  runtime,
  caller: createStaticCallerProvider({ surface: "test", principal: { kind: "anonymous" } }),
  extensions: [extension] as const,
});
const api: Readonly<AppApi> = holm.app;
const result: Promise<{ readonly ok: boolean }> = holm.app.http.get<{ readonly ok: boolean }>("/api/check");
const magicInput: CompleteMagicLinkInput = { email: "person@example.test", key: "123456" };
const page: Promise<{ readonly items: readonly string[]; readonly done: boolean }> = holm.app
  .paginate<string>("/api/items")
  .next();

// @ts-expect-error App HTTP params are finite scalar values.
holm.app.http.get("/api/check", { params: { nested: { no: true } } });

// @ts-expect-error Installed extension namespaces are readonly.
holm.app = api;

void result;
void magicInput;
void page;
