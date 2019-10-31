# FSR Redirector

## Upload to Chrome Store
To update the Chrome Extension in the chrome store you will have to take the following steps.
 - Build the latest version of the chrome extension.
 - Compress the latest version of the chrome extension as a zip file.
 - Login into google with the following credentials.
  ⋅⋅Gmail: foreseeresultsdev@gmail.com
  ⋅⋅Password: foreseeresultsdev123

- Once you login to google go to:
  ⋅⋅https://chrome.google.com/webstore/developer/dashboard
- The next thing you want to do is "Upload Updated Package".
  ⋅⋅Every time you do this the version number has to be increased in the manifest.json file
- Upload the zip here and allow time for it to be published.



## Download and build - the url below is outdated since being included in https://github.com/foreseecode/websdk-config-tools
Begin by downloading the .zip of this repo, or cloning it to a local directory:
`git clone https://github.com/foreseecode/FSRChromeDevExtension`

The code for this extension must be compiled before installation, however each version is committed with the most up to date version of the extension in the `/build` directory of the project.  If for some reason you need to run the build task again, change to the project directory and run `gulp` at the command line.

## Installation
Chrome extensions that are not approved for sale in the Chrome Store must be installed in developer mode.  To activate, go to Chrome's extension manager, and activate developer mode with the checkbox in the upper right corner (1).  Next press the button "Load Unpacked Extension", and navigate to the project directory on your local machine.  Select only the `build` directory of the project (2).

![Installation steps in Chrome](/readmeImages/install.png)

You may also want to allow this extension to run in Incognito windows, as this will be easier than clearing cached files during testing sessions. (3)

## Authorization

Note for security reasons, Chrome will ask you if you want to run unapproved extensions each time you restart the browser.  If you select "disable" in this prompt you will need to reauthorize the extension using the steps above, or close and restart a new chrome session to reenable the extension.

![Reauthorization Prompt](/readmeImages/disable.png)

## Usage

The extension allows several strategies for modifying the Web SDK.

### Redirect

The Redirect tool allows you to change the Web SDK assets from the version implemented on the website you are viewing to an alternate version.  There are 2 settings to configure: Environment (1) and Version # (2)

Most implementations in the wild will be targeted to the production environment.  However, you can swap this to Development, or Localhost if desired.  The `Development` environment contains version of the Web SDK that are generally not minified, and contain verbose debug logging in the browser's console (some development version may not follow this pattern).  Note: accessing development builds requires access to the FSR VPN.

Localhost can be used only when running a local test debug server.  But this can be useful if you are testing a version of the Web SDK that is not yet hosted on production/development, such as a new release, or pre-release candidates.  (To do this you'll need to use "inherit" in the version selection)

**Trigger Version** (2) allows you to load an alternate version of the SDK.  The default setting "Inherit" will detect the version of the SDK currently used on the site, and use that version.  Or a specific version can be selected from the listed versions.

![Redirect Tool](/readmeImages/redirector.png)

Separate settings will allow you to change the version of the client's config file that is loaded (3), forcing the SDK to run a config file from a different container.

**This can be used in combination with the Asset Redirection tool, running in Localhost, Development, or Production Setup.  It can also be used while redirecting to an alternate Web SDK version #**

### Inject

The Inject tool allows you to insert the Web SDK on any page that you visit in your browser.  A separate setting is also available to suppress the loading of any native Web SDK implementations on the site (1).  This SDK suppression **will not** disable SDK's that have been injected using this extension.  This allows the injection of new code on sites that already have an SDK deployment.  Suppression will block native legacy, hosted, and on-prem implementations.

To inject a new SDK Simply select the container, and enter a valid site key.  Reload the target page to run injection.  Injection happens at page load, so be sure to refresh in your browser when injecting in single page applications.

Injection can be used in combination with the Redirect tools as well, if modifications are needed to the injected SDK.

![Inject Tool](/readmeImages/inject.png)

### Config

The config pane will load the configuration details of the SDK running on the page when the tool is opened.  This panel displays an abbreviated form of the contents retrieved from the `FSR.getConfig()` function.  

This can be used to view configuration details of SDK's injected or manipulated by this extension.  As well as native SDK deployments.

![Config Viewer](/readmeImages/config.png)

## Change log
### Version 1.0.1
*  
### Version 0.5
* Added Config view tool
* Introduced custom theme, and App icons
* Added ESLint to build process
### Version 0.4
* Merged redirect and config swap into a single tool pane to condense all redirection utilities into a single view.
* Added support to suppress native SDK implementations.
### Version 0.3
* Added Inject Tool, to allow insertion of Web SDK on sites that do not contain it already.
### Version 0.2
* Added support for staging/production Swap Tool
* Updated listeners so tools now properly shutdown when deactivated
* Updated to more sensible defaults for all tools
### Version 0.1
* Initial build with support for Asset Redirection
