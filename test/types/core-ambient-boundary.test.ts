import type { CoreEnvironment } from "../../src/core/index.js";

const environmentName: CoreEnvironment = "core";
void environmentName;

// @ts-expect-error Core TypeScript must not include browser globals.
void window;

// @ts-expect-error Core TypeScript must not include Node globals.
void process;
