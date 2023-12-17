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
  fetch,
  fastly,
});

// Since nodejs 20.0 has globalThis.crypto as default, compartible with WebCrypto,
// so we should not polyfill it in order to avoid overwrite error.
if ("crypto" in globalThis) {
  // biome-ignore lint/suspicious/noExplicitAny: access to global
  (globalThis as any).__fastlyComputeNodeDefaultCrypto = true;
} else {
  // Otherwise, need polyfill
  Object.assign(globalThis, { crypto });
}
