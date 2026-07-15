import { HolmError } from "../core/errors.js";
import type { OperationResponse } from "../core/runtime.js";
import type { ProtocolErrorOptions, RemoteErrorOptions, TransportResponseInput } from "./index.js";
export declare class RemoteError extends HolmError {
    constructor(options: RemoteErrorOptions);
}
export declare class ProtocolError extends HolmError {
    constructor(options?: ProtocolErrorOptions);
}
export declare function decodeTransportResponse(input: TransportResponseInput): OperationResponse;
//# sourceMappingURL=response.d.ts.map