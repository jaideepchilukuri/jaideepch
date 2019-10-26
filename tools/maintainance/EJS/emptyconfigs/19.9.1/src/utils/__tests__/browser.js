import { Browser } from "../utils";

describe("Browser", () => {
  function browser(ua) {
    const browser = new Browser(ua);
    const resolver = resolve => browser.ready.subscribe(() => resolve(browser), false, true);
    return new Promise(resolver);
  }

  test.each`
    name          | version     | useragent
    ${"Firefox"}  | ${26}       | ${"Mozilla/5.0 (Mobile; rv:26.0) Gecko/26.0 Firefox/26.0"}
    ${"IE"}       | ${6}        | ${"Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)"}
    ${"IE"}       | ${7}        | ${"Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)"}
    ${"IE"}       | ${8}        | ${"Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0)"}
    ${"IE"}       | ${9}        | ${"Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1)"}
    ${"IE"}       | ${11}       | ${"Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko"}
    ${"IE"}       | ${11}       | ${"Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko"}
    ${"IE"}       | ${11}       | ${"Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko/20100101 Firefox/22.0"}
    ${"IE"}       | ${11}       | ${"Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; WOW64; Trident/7.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; InfoPath.3)"}
    ${"IEMobile"} | ${8.1}      | ${"Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 635) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537"}
    ${"Edge"}     | ${12}       | ${"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0"}
    ${"Edge"}     | ${14.14393} | ${"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393"}
    ${"Edge"}     | ${15.15063} | ${"Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; RM-1074) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.15063"}
    ${"Safari"}   | ${10.1}     | ${"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/603.3.8 (KHTML, like Gecko) Version/10.1.2 Safari/603.3.8"}
    ${"Safari"}   | ${11}       | ${"Mozilla/5.0 (iPhone; CPU iPhone OS 11_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.0 Mobile/15E148 Safari/604.1"}
  `("detects browser $name $version from $useragent", ({ name, version, useragent }) =>
    browser(useragent).then(br => {
      expect(br.browser.name).toEqual(name);
      expect(br.browser.actualVersion).toEqual(version);
    })
  );
});
