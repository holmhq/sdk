import { type ReadonlyBytes } from "../core/index.js";
import {
  createReadonlyBytesUploadSource,
  createUploadFile,
  type UploadFile,
} from "../transports/upload.js";

export interface NodeUploadFileOptions {
  readonly field: string;
  readonly name: string;
  readonly bytes: ArrayLike<number> | Iterable<number> | ReadonlyBytes;
  readonly type?: string;
}

export function createNodeUploadFile(options: NodeUploadFileOptions): UploadFile<ReadonlyBytes> {
  return createUploadFile({
    field: options.field,
    name: options.name,
    type: options.type ?? "application/octet-stream",
    source: createReadonlyBytesUploadSource(options.bytes),
  });
}
