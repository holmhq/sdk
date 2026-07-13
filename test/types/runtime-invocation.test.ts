import {
  createStaticCallerProvider,
  type CallerContext,
  type InvocationContext,
  type OperationRequest,
  type RuntimeAdapter,
} from "../../src/core/index.js";

const callerContext: CallerContext = {
  surface: "test",
  principal: { kind: "member", id: "member-1" },
  app: { id: "app-1" },
};
const caller = createStaticCallerProvider(callerContext);

const invocation: InvocationContext = {
  ...callerContext,
  invocationId: "req-1",
  startedAt: 1,
};

const runtime: RuntimeAdapter = {
  id: "runtime-test",
  surface: "test",
  clock: { now: () => 1 },
  scheduler: { schedule: () => ({ cancel: () => undefined }) },
  async start() {
    return [];
  },
  async invoke(request) {
    return { requestId: request.requestId, payload: null };
  },
  async dispose() {
    return undefined;
  },
};

// @ts-expect-error operation requests are readonly envelopes.
({} as OperationRequest).payload = null;

// @ts-expect-error auth proof must remain adapter-private, not caller context.
callerContext.token = "secret";

void caller;
void invocation;
void runtime;
