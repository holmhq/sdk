import { createHolm } from "../core/create-holm.js";
import { createAdminExtension, } from "./extension.js";
export function createAdminClient(options) {
    const extension = createAdminExtension({
        ...(options.requestId === undefined ? {} : { requestId: options.requestId }),
        ...(options.uploads === undefined ? {} : { uploads: options.uploads }),
    });
    return createHolm({
        runtime: options.runtime,
        caller: options.caller,
        extensions: [extension],
        ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
        ...(options.onCallerPartition === undefined ? {} : { onCallerPartition: options.onCallerPartition }),
    });
}
//# sourceMappingURL=factory.js.map