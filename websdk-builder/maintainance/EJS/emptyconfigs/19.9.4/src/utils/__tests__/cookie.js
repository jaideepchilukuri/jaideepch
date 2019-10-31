import { Cookie } from "../utils";

describe("Cookie", () => {
  let cookie;

  beforeEach(() => {
    cookie = new Cookie({
      domain: document.location.host,
      duration: 365,
    });
  });

  describe("Cookie instantiation", () => {
    test("Cookie can be set and get", () => {
      cookie.set("fsr", "my value");
      expect(cookie.get("fsr")).toEqual("my value");
    });
  });
});
