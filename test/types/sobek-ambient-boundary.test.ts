import { createCallerFingerprint, createInvocationContext } from "../../src/core/index.js";
import {
  createFakeSobekInjectedRuntime,
  sobekRuntime,
  UnsupportedSobekRuntimeServiceError,
  type SobekInjectedRequest,
  type SobekRuntimeAdapter,
} from "../../src/sobek/index.js";

const caller = {
  surface: "server" as const,
  principal: { kind: "service" as const, id: "sobek-type" },
  app: { id: "app-type" },
};
const invocationCaller = createInvocationContext(caller, "req-type", 1, "type-test");
const request = {
  requestId: "req-type",
  method: "GET",
  path: "/api/type",
  query: {},
  headers: {},
  caller: invocationCaller,
} satisfies SobekInjectedRequest;
const fake = createFakeSobekInjectedRuntime({ handler: () => ({ status: 200, body: { ok: true } }) });
const runtime: SobekRuntimeAdapter = sobekRuntime({ runtime: fake });
const fingerprint: string = createCallerFingerprint(caller);
const error = new UnsupportedSobekRuntimeServiceError({ adapter: runtime.id, service: "runtime" });

// @ts-expect-error Sobek/core type tests compile without DOM ambient types.
type SobekDocument = Document;

// @ts-expect-error Sobek/core type tests compile without Node ambient types.
const sobekProcess = process;

// @ts-expect-error Sobek runtime surface is the server surface, not web.
const wrongSurface: "web" = runtime.surface;

void request;
void fake;
void runtime;
void fingerprint;
void error;
void sobekProcess;
void wrongSurface;
