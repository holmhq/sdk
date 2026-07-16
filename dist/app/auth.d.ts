import type { WireValue } from "../core/wire-value.js";
import type { AppHttpClient } from "./http.js";
export interface AppNavigationService {
    assign(href: string): void;
}
export interface AppAuthNavigationOptions {
    readonly redirect?: string;
}
export interface AppQrScannerOptions extends AppAuthNavigationOptions {
    readonly appId?: string;
}
export interface StartAnonymousOptions {
    readonly appId?: string;
}
export interface RequestMagicLinkOptions extends AppAuthNavigationOptions {
    readonly appId?: string;
}
export type CompleteMagicLinkInput = string | {
    readonly token: string;
} | {
    readonly email: string;
    readonly key: string;
};
export interface AppAuthApi {
    me<Result = WireValue>(): Promise<Result>;
    loginHref(options?: AppAuthNavigationOptions): string;
    login(options?: AppAuthNavigationOptions): string;
    qrScannerHref(options?: AppQrScannerOptions): string;
    scanQRCode(options?: AppQrScannerOptions): string;
    startAnonymous<Result = WireValue>(options?: StartAnonymousOptions): Promise<Result>;
    promoteAnonymous<Result = WireValue>(options?: StartAnonymousOptions): Promise<Result>;
    requestMagicLink<Result = WireValue>(email: string, options?: RequestMagicLinkOptions): Promise<Result>;
    completeMagicLink<Result = WireValue>(input: CompleteMagicLinkInput): Promise<Result>;
    logout<Result = WireValue>(): Promise<Result>;
}
export declare function createAppAuthApi(http: AppHttpClient, navigation: AppNavigationService | undefined): AppAuthApi;
//# sourceMappingURL=auth.d.ts.map