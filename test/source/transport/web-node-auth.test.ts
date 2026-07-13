import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  applyTransportAuth,
  createTransportRequest,
  redactAuthenticatedTransport,
} from "../../../src/transports/index.js";
import { createNodeTokenAuth } from "../../../src/node/index.js";
import { createWebSessionAuth } from "../../../src/web/index.js";

test("transport web session auth keeps cookie proof private and diagnostic-safe", async () => {
  const auth = createWebSessionAuth({ credentials: "include" });
  const request = createTransportRequest({ method: "GET", url: "/api/me", responseMode: "json" });
  const applied = await applyTransportAuth(request, auth);

  assert.equal(applied.privateProof?.kind, "web-session");
  assert.equal(applied.privateProof?.kind === "web-session" ? applied.privateProof.credentials : undefined, "include");
  assert.deepEqual(applied.request.headers, {});
  assert.deepEqual(applied.diagnostic.auth, { kind: "web-session", credentials: "include" });
  assert.equal(JSON.stringify(applied.diagnostic).includes("cookie"), false);
});

test("transport node token auth resolves fresh bearer proof and redacts diagnostics", async () => {
  let token = "first-secret";
  const auth = createNodeTokenAuth({ token: () => token, scheme: "Bearer" });
  const request = createTransportRequest({
    method: "POST",
    url: "/api/admin",
    headers: { "x-trace": "trace-1" },
    body: { mode: "json", value: { ok: true } },
    responseMode: "json",
  });

  const first = await applyTransportAuth(request, auth);
  token = "second-secret";
  const second = await applyTransportAuth(request, auth);

  assert.equal(first.request.headers.authorization, "Bearer first-secret");
  assert.equal(second.request.headers.authorization, "Bearer second-secret");
  assert.deepEqual(first.diagnostic.auth, { kind: "bearer", scheme: "Bearer" });
  assert.deepEqual(first.diagnostic.headers, { authorization: "[redacted]", "x-trace": "trace-1" });
  assert.equal(JSON.stringify(first.diagnostic).includes("first-secret"), false);
  assert.equal(JSON.stringify(second.diagnostic).includes("second-secret"), false);
  assert.equal(request.headers.authorization, undefined);
});



test("transport generic header auth applies private proof and redacted header diagnostics", async () => {
  const request = createTransportRequest({ method: "GET", url: "/api/header", responseMode: "json" });
  const applied = await applyTransportAuth(request, {
    current: () => ({ kind: "header", name: "X-Api-Key", value: "header-secret" }),
  });

  assert.equal(applied.request.headers["x-api-key"], "header-secret");
  assert.equal(applied.privateProof?.kind, "header");
  assert.deepEqual(applied.diagnostic.auth, { kind: "header", header: "x-api-key" });
  assert.deepEqual(applied.diagnostic.headers, { "x-api-key": "[redacted]" });
});

test("transport auth rejects invalid provider proofs at the auth boundary", async () => {
  const request = createTransportRequest({ method: "GET", url: "/api/auth", responseMode: "json" });

  await assert.rejects(
    () => applyTransportAuth(request, { current: () => ({ kind: "web-session", credentials: "bad" }) as never }),
    /credentials/,
  );
  await assert.rejects(
    () => applyTransportAuth(request, { current: () => ({ kind: "bearer", scheme: " ", token: "secret" }) as never }),
    /scheme/,
  );
  await assert.rejects(
    () => applyTransportAuth(request, { current: () => ({ kind: "bearer", scheme: "Bearer", token: " " }) as never }),
    /token/,
  );
  await assert.rejects(
    () => applyTransportAuth(request, { current: () => ({ kind: "header", name: " ", value: "secret" }) as never }),
    /header name/,
  );
  await assert.rejects(
    () => applyTransportAuth(request, { current: () => ({ kind: "header", name: "x-api-key", value: " " }) as never }),
    /header value/,
  );
});


test("transport auth helpers omit missing proofs and reject empty node tokens", async () => {
  const anonymous = await applyTransportAuth(
    createTransportRequest({ method: "GET", url: "/api/public", responseMode: "raw" }),
    { current: () => undefined },
  );

  assert.equal(anonymous.privateProof, undefined);
  assert.equal(anonymous.diagnostic.auth, undefined);
  const defaultWebAuth = createWebSessionAuth();
  const staticNodeAuth = createNodeTokenAuth({ token: "static-secret" });

  assert.deepEqual((await applyTransportAuth(anonymous.request, defaultWebAuth)).diagnostic.auth, {
    kind: "web-session",
    credentials: "same-origin",
  });
  assert.equal((await applyTransportAuth(anonymous.request, staticNodeAuth)).request.headers.authorization, "Bearer static-secret");
  assert.throws(() => createNodeTokenAuth({ token: () => "" }), /token/);
  assert.throws(() => createNodeTokenAuth({ token: "secret", scheme: " " }), /scheme/);
  assert.throws(() => createWebSessionAuth({ credentials: "always" as never }), /credentials/);
  assert.equal(redactAuthenticatedTransport(anonymous).url, "/api/public");
});
