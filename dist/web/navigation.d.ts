import type { AppNavigationService } from "../app/auth.js";
export interface WebLocationLike {
    href: string;
    assign?(href: string): void;
}
export declare function createWebNavigation(location?: WebLocationLike | null | undefined): AppNavigationService;
//# sourceMappingURL=navigation.d.ts.map