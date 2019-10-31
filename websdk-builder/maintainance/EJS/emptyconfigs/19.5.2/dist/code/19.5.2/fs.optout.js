/***************************************
* @preserve
* ForeSee Web SDK: Opt-Out Module
* Built April 27, 19 21:55:14
* Code version: 19.5.2
* Template version: 19.5.2
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("$fs.utils.js"),"triggerconfig"],function(t,e,o,config){o.registerProduct("foresee",config);var n=function(t,e){var o;return o=new window.Function("obj","var p=[],print=function(){p.push.apply(p,arguments);};with(obj){p.push('"+t.replace(/[\r\t\n]/g," ").split("<%").join("\t").replace(/((^|%>)[^\t]*)'/g,"$1\r").replace(/\t=(.*?)%>/g,"',$1,'").split("\t").join("');").split("%>").join("p.push('").split("\r").join("\\'")+"');}return p.join('');"),e?o(e):o},r=function(t){this.browser=t,this.stg=o.getGlobalStore(t)};r.prototype.loadResources=function(t){o.Healthy(this.browser,["static","brain"],e.proxy(function(){this.stg.ready.subscribe(e.proxy(function(){var n=e.makeURI("$templates/trigger/admintools/main.css"),r=e.makeURI("$templates/trigger/admintools/optout.html"),s=!1,i=!1,a=function(){s&&i&&t&&t()};o.loadCSS(n,function(t){s=!0,a()},null,this.browser),new o.JSONP({success:e.proxy(function(t){i=!0,this.template=t,a()},this)}).get(r,"templates_trigger_admintools_")},this),!0,!0)},this),e.proxy(function(){alert("Cannot connect to remote ForeSee state server.\nPlease connect to the Internet and try again.")},this))},r.prototype._applyOptOutState=function(){this.stg.ready.subscribe(e.proxy(function(t){var o=document,n=this.stg.get("optout");if(e.isDefined(n)&&"false"!=n){o.querySelector(".acsOptOutControls").style.display="none",o.querySelector(".acsOptInControls").style.display="block";var r=new Date,s=["January","February","March","April","May","June","July","August","September","October","November","December"];r.setTime(t._data.keys.optout.x);var i=r.getDate(),a=r.getMonth(),l=r.getFullYear();o.getElementById("acswhenexpires").innerHTML=s[a]+" "+i+", "+l}else o.querySelector(".acsOptOutControls").style.display="block",o.querySelector(".acsOptInControls").style.display="none"},this),!0,!0)},r.prototype.render=function(){document.title="ForeSee Opt-Out Tool";var t=e.ext(this.browser,{siteLogo:e.config.staticUrl+"/logos/foresee/foresee.svg"}),r=n(this.template,t);document.body.innerHTML=r;var s=document.getElementById("acsOptOutButton"),i=document.getElementById("acsOptInButton");o.Bind(s,"click",e.proxy(function(t){o.preventDefault(t),this.stg.set("optout",!0,31536e6,!0),this._applyOptOutState()},this)),o.Bind(i,"click",e.proxy(function(t){o.preventDefault(t),this.stg.erase("optout",null,!0),this._applyOptOutState()},this)),this._applyOptOutState()},e.domReady(function(){var t=new o.Browser;t.ready.subscribe(function(){var e=new r(t);e.loadResources(function(){e.render()})},!0,!0)})});