# ForeSee Client Code Setup

## Requirements

- Node (http://nodejs.org/) 5.x+
- GIT CLI.
- Yarn (https://yarnpkg.com/en/docs/install) or NPM

GIT and Node need to be available as public path variables. You can check that you have these variables in your path by running "`git`" and "`node`" commands in the command line.

## Installation

Whenever a new template is pulled down from the repo "`yarn install`" or "`npm install`" command needs to be ran on the current directory. To do this simply navigate to the template directory in commandline and run "`npm install`". This would download some node modules from the web and creates a folder in the current directory called "node_modules". This step only needs to be done once for each new template.

## Running Tasks

You should now be able to run the build tasks by prefixing the command with the word "gulp" such as "`gulp test_debug`". If an error comes up saying that gulp is not defined try closing the commandline window and trying again. If this keeps happening run "`npm install -g gulp`" in the commandline.

## Pushing Client Code

In FCP you no longer push code, but only the configuration (surveydef's, PII masking rules etc). This difference should be transparent to the I.S. person but should make for smoother upgrade paths.

To push current configuration to staging:

- `gulp push_stg`

To push to production:

- `gulp push_prod`

Note that you need not push to staging before production. You can go directly to production if needed.

Note: if you add `--dev` you can push configs stored in the folder pointed to by `CC_CONFIG_DIR` environment variable.

## Self-Hosted "On Prem" Code Packages

`gulp get_self_hosted`

## Managing Clients

Getting a list of all clients:

- `gulp list_clients`

Searching for a client with a search string:

- `gulp client_lookup`

Making a new client. Note that you should be sure that the client does not already exist! (`gulp client_lookup`).

- `gulp create_client`

Once you have created a client, put the `clientid` for the client into the `client_properties.js`. Then you can create a new site key for the client.

To create a site key:

- `gulp create_site`

To list existing site keys for the configured client:

- `gulp list_sites`

## Managing Code Versions

The client code itself is no longer connected directly to individual customers. To push a new version of code to FCP, call:

- `gulp push_code`

There is also a concept for "default configuration" which is the global config that is used for a customer before we have pushed a specific global config to their container. To set this:

- `gulp push_default_config`

## Proxying code into the page

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

Note: https://localhost/code/current/ can be used, and is symlinked to the latest version.

## Development environment variables for test_debug

When setting up your development environment, you may want to set up some environment variables in your .bash_profile (or .bashrc or .profile depending on your OS & shell). These will override certain settings in the package.json:

`CC_DEV_PORT` overrides `build.ports[0]`
`CC_SSL_DEV_PORT` overrides `build.ports[1]`
`CC_CONFIG_DIR` overrides `build.config`

As a special case, you can disable the SSL dev server with:
`CC_SSL_DEV_PORT=false`

This will allow you not to have to modify package.json when using `gulp test_debug` to test the code on your dev machine. You can also use `CC_CONFIG_DIR` to avoid having to modify the configs in the `clientconfig` folder. This makes working with git a bit easier and less chance for error.

These overrides only take effect when running `gulp test_debug` or `gulp test_prod` or if `--dev` is supplied to any other task. If the environment variables are missing or empty, they will not take effect.

Example .bash_profile / .profile goodness:
export CC_DEV_PORT=4000
export CC_SSL_DEV_PORT=4443
export CC_CONFIG_DIR="../myconfigs"

## Faster builds

It's possible to skip the babel compilation step, which adds a couple seconds to the build time:

```bash
gulp test_debug --nobabel
```

Another option is in one terminal run the test server, and in another window run this:

```bash
npm run watch
```

This will automatically rebuild any sdk components that changed when the files change. The test
server already automatically loads changed configs from disk. I think the only thing that still
requires a dev server restart is CSS or template changes.

Another option that is a bit slower than `npm run watch` is this:

```bash
nodemon --ignore dist/ --exec gulp test_debug
```

Which requires `npm i -g nodemod` but will work with CSS or template changes too.

## GOTCHAS

- Setting NODE_ENV in your environment will cause the tests to fail, specifically the locator
  tests. So if you experience this, `unset NODE_ENV` before running tests.
