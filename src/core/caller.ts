import type { SurfaceKind } from "./runtime.js";
import { canonicalEncodeWireValue, copyWireValue, type WireObject } from "./wire-value.js";

export type PrincipalRef =
  | { readonly kind: "anonymous" }
  | { readonly kind: "browser-session" }
  | { readonly kind: "member"; readonly id: string }
  | { readonly kind: "operator"; readonly id?: string }
  | { readonly kind: "agent"; readonly memberId: string }
  | { readonly kind: "service"; readonly id: string };

export interface CallerAppContext {
  readonly id: string;
}

export interface CallerScopeContext {
  readonly id: string;
  readonly type?: string;
}

export interface CallerContext {
  readonly surface: SurfaceKind;
  readonly principal: PrincipalRef;
  readonly app?: CallerAppContext;
  readonly scope?: CallerScopeContext;
  readonly origin?: string;
}

export interface InvocationContext extends CallerContext {
  readonly invocationId: string;
  readonly startedAt: number;
  readonly reason?: string;
}

export interface CallerProvider {
  current(): CallerContext | Promise<CallerContext>;
  subscribe?(listener: () => void): () => void;
}

export interface CallerPartition {
  readonly runtime: {
    readonly id: string;
    readonly surface: SurfaceKind;
  };
  readonly capability: {
    readonly id: string;
    readonly major: number;
    readonly minMinor?: number;
  };
  readonly operation: string;
  readonly caller: CallerContext;
  readonly fingerprint: string;
}

export type CallerPartitionListener = (partition: CallerPartition) => void;

export type CallerTransitionListener = () => void;

export function onCallerTransition(
  provider: CallerProvider,
  listener: CallerTransitionListener,
): () => void {
  if (provider.subscribe === undefined) {
    return () => undefined;
  }
  return provider.subscribe(listener);
}

export function createStaticCallerProvider(context: CallerContext): CallerProvider {
  const normalized = normalizeCallerContext(context);
  return Object.freeze({
    current(): CallerContext {
      return normalizeCallerContext(normalized);
    },
  });
}

export async function resolveCallerContext(provider: CallerProvider): Promise<CallerContext> {
  return normalizeCallerContext(await provider.current());
}

export function createInvocationContext(
  context: CallerContext,
  invocationId: string,
  startedAt: number,
  reason?: string,
): InvocationContext {
  const normalized = normalizeCallerContext(context);
  return Object.freeze({
    ...normalized,
    invocationId,
    startedAt,
    ...(reason === undefined ? {} : { reason }),
  });
}

export function createCallerFingerprint(context: CallerContext): string {
  const encoded = canonicalEncodeWireValue(callerFingerprintMaterial(context));
  return `caller:v1:${hashFingerprint(encoded)}`;
}

export function normalizeCallerContext(context: CallerContext): CallerContext {
  return Object.freeze({
    surface: context.surface,
    principal: normalizePrincipal(context.principal),
    ...(context.app === undefined ? {} : { app: normalizeApp(context.app) }),
    ...(context.scope === undefined ? {} : { scope: normalizeScope(context.scope) }),
    ...(context.origin === undefined ? {} : { origin: context.origin }),
  });
}

function callerFingerprintMaterial(context: CallerContext): WireObject {
  const normalized = normalizeCallerContext(context);
  return copyWireValue({
    surface: normalized.surface,
    principal: normalized.principal,
    ...(normalized.app === undefined ? {} : { app: normalized.app }),
    ...(normalized.scope === undefined ? {} : { scope: normalized.scope }),
    ...(normalized.origin === undefined ? {} : { origin: normalized.origin }),
  }) as WireObject;
}

function normalizePrincipal(principal: PrincipalRef): PrincipalRef {
  switch (principal.kind) {
    case "anonymous":
      return Object.freeze({ kind: "anonymous" });
    case "browser-session":
      return Object.freeze({ kind: "browser-session" });
    case "member":
      return Object.freeze({ kind: "member", id: principal.id });
    case "operator":
      return Object.freeze({
        kind: "operator",
        ...(principal.id === undefined ? {} : { id: principal.id }),
      });
    case "agent":
      return Object.freeze({ kind: "agent", memberId: principal.memberId });
    case "service":
      return Object.freeze({ kind: "service", id: principal.id });
  }
}

function normalizeApp(app: CallerAppContext): CallerAppContext {
  return Object.freeze({ id: app.id });
}

function normalizeScope(scope: CallerScopeContext): CallerScopeContext {
  return Object.freeze({
    id: scope.id,
    ...(scope.type === undefined ? {} : { type: scope.type }),
  });
}

function hashFingerprint(value: string): string {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  let h3 = 0xc0decafe ^ value.length;
  let h4 = 0x9e3779b9 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 0x85ebca6b);
    h2 = Math.imul(h2 ^ code, 0xc2b2ae35);
    h3 = Math.imul(h3 ^ code, 0x27d4eb2f);
    h4 = Math.imul(h4 ^ code, 0x165667b1);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 0x27d4eb2f);
  h4 = Math.imul(h4 ^ (h4 >>> 13), 0x165667b1);

  return [h1 ^ h2, h2 ^ h3, h3 ^ h4, h4 ^ h1].map(toFingerprintLane).join("");
}

function toFingerprintLane(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}
