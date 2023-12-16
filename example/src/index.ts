/// <reference types="@fastly/js-compute" />
import { KVStore } from "fastly:kv-store";

addEventListener("fetch", (event) => {
  const { request } = event;

  event.respondWith(handleRequest(request));
});

export async function handleRequest(req: Request) {
  return new Response("Hello, vite with Fastly Compute!", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
