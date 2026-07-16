export interface AppSurfaceBootstrap {
    readonly analytics?: string;
    readonly settings?: string;
    readonly members?: string;
    readonly account?: string;
    readonly login?: string;
    readonly logout?: string;
    readonly browserEvents?: string;
    readonly browser_events?: string;
}
export interface AppSurfaceRedirectOptions {
    readonly redirect?: string;
}
export interface AppSurfaceApi {
    analyticsUrl(): string | null;
    settingsUrl(): string | null;
    membersUrl(): string | null;
    accountUrl(): string | null;
    loginUrl(options?: string | AppSurfaceRedirectOptions): string | null;
    logoutUrl(options?: string | AppSurfaceRedirectOptions): string | null;
    browserEventsUrl(): string | null;
}
interface NormalizedAppSurfaces {
    readonly analytics: string | null;
    readonly settings: string | null;
    readonly members: string | null;
    readonly account: string | null;
    readonly login: string | null;
    readonly logout: string | null;
    readonly browserEvents: string | null;
}
export declare function createAppSurfaceApi(surfaces?: AppSurfaceBootstrap): AppSurfaceApi;
export declare function normalizeAppSurfaces(surfaces?: AppSurfaceBootstrap): NormalizedAppSurfaces;
export {};
//# sourceMappingURL=surface.d.ts.map