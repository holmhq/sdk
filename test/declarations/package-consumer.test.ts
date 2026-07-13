import { createCoreEnvironment, type CoreEnvironment } from "@holmhq/sdk";

const environment: CoreEnvironment = createCoreEnvironment();

// @ts-expect-error Declaration consumers must not widen the core fixture value.
const invalidEnvironment: CoreEnvironment = "browser";

void environment;
void invalidEnvironment;
