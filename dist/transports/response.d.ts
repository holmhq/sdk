import { HolmError, ProtocolError } from "../core/errors.js";
export { ProtocolError };
import type { OperationResponse } from "../core/runtime.js";
import type { RemoteErrorOptions, TransportResponseInput } from "./index.js";
export declare class RemoteError extends HolmError {
    constructor(options: RemoteErrorOptions);
}
export declare function decodeTransportResponse(input: TransportResponseInput): OperationResponse;
//# sourceMappingURL=response.d.ts.map