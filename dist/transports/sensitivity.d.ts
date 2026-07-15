import type { RedactedTransportDiagnostic, TransportRequest, TransportSensitivity, TransportSensitivityInput } from "./index.js";
export declare function normalizeTransportSensitivity(input?: TransportSensitivityInput): TransportSensitivity;
export declare function addSensitiveTransportHeader(sensitivity: TransportSensitivity, name: string): TransportSensitivity;
export declare function createOpaqueTransportKey(request: TransportRequest): string;
export declare function redactTransportRequestMetadata(request: TransportRequest): RedactedTransportDiagnostic;
//# sourceMappingURL=sensitivity.d.ts.map