import {
  addEventListener,
  CompressionStream,
  DecompressionStream,
  crypto,
  fetch,
  fastly,
} from "./globals.js";

// Expose as "global" functions and classes
Object.assign(globalThis, {
  addEventListener,
  CompressionStream,
  DecompressionStream,
  crypto,
  fetch,
  fastly,
});
