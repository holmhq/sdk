import type { CapabilityRequirement, RuntimeAdapter } from "../../src/core/index.js";
import {
  HOLM_APP_HTTP_CAPABILITY,
  WEB_HTTP_REQUEST_OPERATION,
  webRuntime,
  type WebRuntimeOptions,
} from "../../src/web/index.js";

const userAgent: string = window.navigator.userAgent;
const element: HTMLElement = document.createElement("holm-fixture");
const options: WebRuntimeOptions = {
  baseUrl: new URL("https://app.example.test/"),
  fetch,
};
const runtime: RuntimeAdapter = webRuntime(options);
const capability: CapabilityRequirement = HOLM_APP_HTTP_CAPABILITY;
const operation: "request" = WEB_HTTP_REQUEST_OPERATION;

// @ts-expect-error Web runtime URLs must be strings or URL instances.
webRuntime({ baseUrl: 42 });

void userAgent;
void element;
void runtime;
void capability;
void operation;
