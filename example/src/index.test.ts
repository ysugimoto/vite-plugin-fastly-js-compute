import { handleRequest } from "./index";

describe("Handler test", () => {

  it("Root HTTP Request", async () => {
    const request = new Request("http://localhost:7676");
    const resp =  await handleRequest(request);
    expect(resp.status).toBe(200);
  });
});
