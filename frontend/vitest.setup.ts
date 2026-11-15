import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

import "@testing-library/jest-dom/vitest";

// RTL auto-cleanup only activates when `afterEach` is a global; register it
// explicitly so rendered components never leak between tests.
afterEach(() => {
  cleanup();
});
