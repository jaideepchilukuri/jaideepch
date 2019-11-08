import { setGlobalConfig } from "../../fs/lib/configdefs";
import { Browser } from "../dom/browser";
import { getCookieSettings, _fsStorage } from "../storage/fsstorage";
import { overrideDate, restoreDate } from "../overrideDate";

describe("FSStorage", () => {
  beforeAll(() => {
    overrideDate();
  });

  afterAll(() => {
    restoreDate();
  });

  describe("Get cookie settings", () => {
    const browser = new Browser();
    const fsStorage = new _fsStorage(browser);

    test("Has the correct cookie settings when set to expire in a week", () => {
      setGlobalConfig({
        cookieDomain: [{ path: "*", domain: "localhost" }],
        cookieExpiration: 7,
      });
      const todaysDate = new Date();
      const settings = getCookieSettings(fsStorage);

      expect(settings).toEqual({
        path: "/",
        domain: "localhost",
        secure: false,
        encode: true,
        expires: new Date(
          todaysDate.getFullYear(),
          todaysDate.getMonth(),
          todaysDate.getDate() + 7
        ).toUTCString(),
      });
    });

    test("Has the correct cookie settings when set to expire in 5 years", () => {
      setGlobalConfig({
        cookieDomain: [{ path: "*", domain: "localhost" }],
        cookieExpiration: 1825,
      });
      const todaysDate = new Date();
      const settings = getCookieSettings(fsStorage);

      expect(settings).toEqual({
        path: "/",
        domain: "localhost",
        secure: false,
        encode: true,
        expires: new Date(
          todaysDate.getFullYear(),
          todaysDate.getMonth(),
          todaysDate.getDate() + 1825
        ).toUTCString(),
      });
    });
  });
});
