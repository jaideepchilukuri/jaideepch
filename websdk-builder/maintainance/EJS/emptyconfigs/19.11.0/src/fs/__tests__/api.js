import { API } from "../index";

describe("FSR API", () => {
  describe(".expose()", () => {
    test("exposes an api method", () => {
      API.expose("test", "I am a test");
      expect(window.FSR.test).toEqual("I am a test");
    });
  });

  describe(".retrieveFromAPI()", () => {
    test("can retrieve exposed api methods", () => {
      API.expose("test", "I am a test");
      expect(API.retrieveFromAPI("test")).toEqual("I am a test");
    });
  });
});
