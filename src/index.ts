/// <reference types="@fastly/js-compute" />

import { readFileSync } from "node:fs";
import { fileURLToPath } from 'node:url';
import { resolve } from "node:path";

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default () => {
  return {
    name: "fastly-compute",
    // enforce: "pre",
    config() {
      return {
        test: {
          setupFiles: [resolve(rootDir, "./setup.js")],
          exclude: [resolve(rootDir, "../example/**/*.ts")],
        },
      };
    },
    load(id: string) {
      if (id.startsWith("fastly:")) {
        return readFileSync(
          resolve(rootDir, "./fastly-js-compute-mock.js"),
          "utf8",
        );
      }
      return null;
    },
  };
};

