import type { TransportAuthProvider } from "../transports/index.js";
export type WebSessionCredentials = "same-origin" | "include" | "omit";
export interface WebSessionAuthOptions {
    readonly credentials?: WebSessionCredentials;
}
export interface WebTokenAuthOptions {
    readonly token: string | (() => string);
    readonly scheme?: string;
}
export declare function createWebSessionAuth(options?: WebSessionAuthOptions): TransportAuthProvider;
export declare function createWebTokenAuth(options: WebTokenAuthOptions): TransportAuthProvider;
//# sourceMappingURL=auth.d.ts.map