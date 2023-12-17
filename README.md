# vite-plugin-fastly-js-compute

Vite plugin for [Fastly Compute](https://developer.fastly.com/learning/compute/javascript/) with `vitest`.

- Provide Fastly Compute global variables/classes which are defined inside fastly runtime
- Resolve namespaced imports like `fastly:xxx`

## Requirements

- node.js (prefer version 18.19 or later)

## Installation

yarn:

```shell
yarn add -D vite-plugin-fastly-js-compute
```

npm:

```shell
npm install -D vite-plugin-fastly-js-compute
```

## Usage / Example

This package supports TypeScript ESM style.

ESM:

```js
// vitest.config.ts
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import fastlyCompute from "vite-plugin-fastly-compute-js";

export default defineConfig({
  plugins: [fastlyCompute()],
  test: {
    ...
  },
});
```

## Important Notice

Fastly Compute supports WebCrypto module partially so this package will do polyfill as the same.
However, WebCrypto became a stable feature from node.js 20, then `globalThis.crypto` object exists and could not overwrite it.

This means crypto related feature implementations are different between nodejs 20 and Fastly Compute runtime.
If you write tests and runs in nodejs 20, crypto related tests will be succeeded unexpectedly.

## Contribution

- Fork this repository
- Customize / Fix problem
- Send PR :-)
- Or feel free to create issues for us. We'll look into it

## Author

Yoshiaki Sugimoto <sugimoto@wnotes.net>

## License

MIT
