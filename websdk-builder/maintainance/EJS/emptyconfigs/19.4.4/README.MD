ForeSee Client Code Setup
-------------------------

**Requirements**
- Node (http://nodejs.org/) 5.x+
- GIT CLI.
- Yarn (https://yarnpkg.com/en/docs/install) or NPM

GIT and Node need to be available as public path variables. You can check that you have these variables in your path by running "`git`" and "`node`" commands in the command line.

**Installation**

Whenever a new template is pulled down from the repo "`sudo yarn install`" or "`sudo npm install`" command needs to be ran on the current directory. To do this simply navigate to the template directory in commandline and run "`npm install`". This would download some node modules from the web and creates a folder in the current directory called "node_modules". This step only needs to be done once for each new template.

**Running Tasks**

You should now be able to run the build tasks by prefixing the command with the word "gulp" such as "`gulp test_debug`". If an error comes up saying that gulp is not defined try closing the commandline window and trying again. If this keeps happening run "`npm install -g gulp`" in the commandline.

**Pushing Client Code**

In FCP you no longer push code, but only the configuration (surveydef's, PII masking rules etc). This difference should be transparent to the I.S. person but should make for smoother upgrade paths.

To push current configuration to staging:
 * `gulp push_stg`
 
To push to production:
 * `gulp push_prod`
 
Note that you need not push to staging before production. You can go directly to production if needed.

Note: it is not currently possible to change the customer's global configuration from 

**Self-Hosted "On Prem" Code Packages**

`gulp get_self_hosted`

**Managing Clients**

Getting a list of all clients:
 * `gulp list_clients`
 
Searching for a client with a search string:
 * `gulp client_lookup`
 
Making a new client. Note that you should be sure that the client does not already exist! (`gulp client_lookup`).
 * `gulp create_client`
 
Once you have created a client, put the `clientid` for the client into the `client_properties.js`. Then you can create a new site key for the client. Remember that site keys are analagous to `uberid` in the older UberJS system.
 
To create a site key:
 * `gulp create_site`
 
**Managing Code Versions**

The client code itself is no longer connected directly to individual customers. To push a new version of code to FCP, call:
 * `gulp push_code`

There is also a concept for "default configuration" which is the global config that is used for a customer before we have pushed a specific global config to their container. To set this:
 * `gulp push_default_config`

**Proxying code into the page**

When a task such as "`test_debug`" is ran it moves all the built files into a folder called "dist" inside the same directory and starts a server at `http://localhost:8080` and an SSL server at `https://localhost`. To proxy code onto a site you can do the following using Fiddler:

To Proxy code by using remote mapping, in auto-responder set a rule for HTTP as below:
  Request: "`regex:(http|https)://gateway.answerscloud.com/[a-zA-Z./0-9_-]*/production/(.*)`"
  Response: "`$1://localhost:8080/$3`"

To proxy code in directly, in FiddlerScript you can add the following two lines if the site in question is on HTTP:

  // End of HEAD
  var oRegEx = /<\/head>/gi;
  oBody = oBody.replace(oRegEx, "<script language=\"JavaScript\"src=\"http://localhost:8080/gateway.js\"></script>\n</head>");

To proxy code in directly, in FiddlerScript you can add the following two lines if the site in question is on HTTPS:
  // End of HEAD
  var oRegEx = /<\/head>/gi;
  oBody = oBody.replace(oRegEx, "<script language=\"JavaScript\"src=\"https://localhost/gateway.js\"></script>\n</head>");

Now the ForeSee script should be added to whatever page to visit as long as the server is still running.

## On Premise Testing Instructions

 * In my case, I use QA1 - sitekey "onpremtest" (Client ID 616161, Name: "onpremtest").
 * Push your settings to staging (`gulp push_stg`). This creates the bucket too.
 * Push your client global config to staging (`gulp push_stg_config`).
 * Push all the self-hosted files to staging (`gulp test_deploy_self_hosted_stg`). Remember to use the same environment (staging) for everything.
 * This will push all the files to a new 'product' called "selfhosted" located at `http://qa-gateway-elb.foresee.com/sites/onpremtest/staging/selfhosted/` including a file called `gateway.min.js`.
 * Now you need to proxy a special snippet onto the client site:
 
```html
    <script type="text/javascript">
    ;(function (g) {
      var d = document, am = d.createElement('script'), h = d.head || d.getElementsByTagName("head")[0], fsr = 'fsReady',
        aex = {
          "src": "/foresee/gateway.min.js",
          "type": "text/javascript",
          "async": "true",
          "data-vendor": "fs",
          "data-mode": "selfhost",
          "data-environment": "staging",
          "data-hasssl": "true",
          "data-client": "onpremtest",
          "data-codelocation": "/foresee/foresee_assets/code/symlink/",
          "data-isselfhosted": "true",
          "data-product-assets": "/foresee/foresee_assets/product_assets/",
          "data-role": "gateway"
        };
      for (var attr in aex){am.setAttribute(attr, aex[attr]);}h.appendChild(am);g[fsr] = function () {var aT = '__' + fsr + '_stk__';g[aT] = g[aT] || [];g[aT].push(arguments);};
    })(window);
	</script>
```

 * Note: if the customer does NOT have SSL, then you need to set `data-hasssl` to `false`.
 * You will also need to rewrite all requests to point at `qa-gateway-elb` that are directed at `/foresee/*`
 * Start with the FiddlerScript rule. You will need to minify the above:
 
```html
<script type='text/javascript'>!function(e){var t=document,a=t.createElement('script'),s=t.head||t.getElementsByTagName('head')[0],r='fsReady',d={src:'/foresee/gateway.min.js',type:'text/javascript',async:'true','data-vendor':'fs','data-mode':'selfhost','data-environment':'staging','data-hasssl':'true','data-client':'onpremtest','data-codelocation':'/foresee/foresee_assets/code/symlink/','data-isselfhosted':'true','data-product-assets':'/foresee/foresee_assets/product_assets/','data-role':'gateway'};for(var o in d)a.setAttribute(o,d[o]);s.appendChild(a),e[r]=function(){var t='__'+r+'_stk__';e[t]=e[t]||[],e[t].push(arguments)}}(window);</script>
```
 
 * Then, open up your FiddlerScript editor and find `OnBeforeResponse`. Put this code in there:
 
 ```c#
if (oSession.oResponse.headers.ExistsAndContains("Content-Type", "html") && oSession.HostnameIs("uat3.www.usbank.com")) {
	oSession.utilDecodeResponse();
	oSession.utilReplaceRegexInResponse("<head([^>]*)>", "<head$1><script type='text/javascript'>!function(e){var t=document,a=t.createElement('script'),s=t.head||t.getElementsByTagName('head')[0],r='fsReady',d={src:'/foresee/gateway.min.js',type:'text/javascript',async:'true','data-vendor':'fs','data-mode':'selfhost','data-environment':'staging','data-hasssl':'true','data-client':'onpremtest','data-codelocation':'/foresee/foresee_assets/code/symlink/','data-isselfhosted':'true','data-product-assets':'/foresee/foresee_assets/product_assets/','data-role':'gateway'};for(var o in d)a.setAttribute(o,d[o]);s.appendChild(a),e[r]=function(){var t='__'+r+'_stk__';e[t]=e[t]||[],e[t].push(arguments)}}(window);</script>");
}
 ```

Note that we are checking both the `Content-Type` *and* the host name before doing the rewrite. This avoids all kinds of problems.

 * Then hit `Save Script` in the top left of the frame. Close Fiddler and re-open it.
 * Go to `Autoresponder` and create a rule like this:
   * Match `regex:[a-zA-Z:\/\.0-9\-_]*/foresee\/([a-zA-Z:\/\.0-9\-_]*)`
   * Replace with `https://qa-gateway-elb.foresee.com/sites/onpremtest/staging/selfhosted/$1`
 * Save and enable the rule. Make sure `Enable rules` is turned on at the top. You might want to turn other rules off to ensure they aren't interfering.
 * Clear your browser cache.
 * Load the client site.