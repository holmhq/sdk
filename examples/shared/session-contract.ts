import type {
  CacheSourceIdentity,
  CallerProvider,
  WireValue,
} from "@holmhq/sdk";
import type { MutationResource, QueryResource } from "@holmhq/sdk/state";
import { createMutationResource, createQueryResource } from "@holmhq/sdk/state";

/** The smallest app/auth surface needed by the framework-neutral example model. */
export interface SessionApp {
  readonly app: {
    readonly auth: {
      me<Result = WireValue>(): Promise<Result>;
      logout<Result = WireValue>(): Promise<Result>;
    };
    readonly http: {
      invalidateCache(): Promise<void>;
    };
  };
}

export interface SessionModelOptions {
  readonly app: SessionApp;
  readonly caller: CallerProvider;
  readonly source?: CacheSourceIdentity;
}

export interface SessionModel {
  readonly session: QueryResource<WireValue>;
  readonly signOut: MutationResource<Record<string, never>, WireValue>;
  dispose(): void;
}

const defaultSource = Object.freeze({
  id: "holm.example.session",
  surface: "web",
} as const satisfies CacheSourceIdentity);

/**
 * One semantic resource/action contract shared by the vanilla and React UIs.
 * The UI layer only reads immutable snapshots and subscribes to changes.
 */
export function createSessionModel(options: SessionModelOptions): SessionModel {
  const source = options.source ?? defaultSource;
  const session = createQueryResource<WireValue>({
    id: "example.session",
    key: ["app", "auth", "me"],
    source,
    caller: options.caller,
    load: () => options.app.app.auth.me(),
  });
  const signOut = createMutationResource<Record<string, never>, WireValue>({
    id: "example.sign-out",
    source,
    caller: options.caller,
    execute: async () => {
      try {
        return await options.app.app.auth.logout();
      } finally {
        try {
          await options.app.app.http.invalidateCache();
        } finally {
          session.reset({ reason: "example.sign-out" });
        }
      }
    },
  });

  return Object.freeze({
    session,
    signOut,
    dispose(): void {
      signOut.dispose();
      session.dispose();
    },
  });
}
