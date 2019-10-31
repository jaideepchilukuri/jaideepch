/***************************************
* @preserve
* ForeSee Web SDK: Survey Admin Module
* Built April 27, 19 21:59:21
* Code version: 19.4.4
* Template version: 19.4.4
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("$fs.utils.js"),"triggerconfig"],function(e,t,r,config){if(r.registerProduct("foresee",config),config&&config.surveydefs)for(var n=0;n<config.surveydefs.length;n++)t.isString(config.surveydefs[n])&&(config.surveydefs[n]=r.compile(r.b64DecodeUnicode(config.surveydefs[n])));var o=function(e,t){var r;return r=new window.Function("obj","var p=[],print=function(){p.push.apply(p,arguments);};with(obj){p.push('"+e.replace(/[\r\t\n]/g," ").split("<%").join("\t").replace(/((^|%>)[^\t]*)'/g,"$1\r").replace(/\t=(.*?)%>/g,"',$1,'").split("\t").join("');").split("%>").join("p.push('").split("\r").join("\\'")+"');}return p.join('');"),t?r(t):r},i=function(e){this.browser=e,this.stg=r.getGlobalStore(e)};i.prototype.loadResources=function(e){r.Healthy(this.browser,["static","brain"],t.proxy(function(){this.stg.ready.subscribe(t.proxy(function(){var n=t.makeURI("$templates/trigger/admintools/main.css"),o=t.makeURI("$templates/trigger/admintools/admin.html"),i=!1,s=!1,a=function(){i&&s&&e&&e()};r.loadCSS(n,function(e){return function(e){i=!0,a()}}(),null,this.browser),new r.JSONP({success:t.proxy(function(e){s=!0,this.template=e,a()},this)}).get(o,"templates_trigger_admintools_")},this),!0,!0)},this),t.proxy(function(){alert("Cannot connect to remote ForeSee state server.\nPlease connect to the Internet and try again.")},this))},i.prototype._applyValues=function(){var e,r={sp:{},lf:{}},n=document.querySelectorAll(".acsSPOverride"),o=document.querySelectorAll(".acsLFOverride");for(e=0;e<n.length;e++){var i=n[e].id,s=n[e].value,a=i.replace("_spovr_","");s&&s.length>0&&(r.sp[a]={reg:parseInt(s,10),outreplaypool:parseInt(s,10)})}for(e=0;e<o.length;e++){var l=o[e].id,c=o[e].value,u=l.replace("_lfovr_","");c&&c.length>0&&(r.lf[u]=parseInt(c,10))}var d=!1;document.getElementById("acsOverridePooling").checked&&(d=!0),r.pooloverride=d,this.stg.set("ovr",JSON.stringify(r),null,!0,null,t.proxy(function(){this.writeMessage("Override saved.")},this))},i.prototype.writeMessage=function(e){var t=document.getElementById("fsMessage");clearTimeout(this.wmTimeout),t&&(t.innerHTML=e||"",this.wmTimeout=setTimeout(function(){t.innerHTML=""},3e3))},i.prototype.render=function(){document.title="ForeSee Survey Administration Tool";var e=t.ext(this.browser,{siteLogo:t.config.staticUrl+"/logos/foresee/foresee.svg"},{defs:config.surveydefs}),n=o(this.template,e);document.body.innerHTML=n;var i=document.getElementById("acsSetValues");i&&r.Bind(i,"click",t.proxy(function(e){r.preventDefault(e),this.stg.reset(t.proxy(function(){this._applyValues()},this))},this));var s=document.getElementById("acsClearValues");s&&r.Bind(s,"click",t.proxy(function(e){r.preventDefault(e),this.stg.reset(t.proxy(function(){this.writeMessage("State cleared.")},this));for(var n=document.querySelectorAll(".acsSPOverride, .acsLFOverride"),o=0;o<n.length;o++)n[o].value="";document.getElementById("acsOverridePooling").checked=!1},this));var a=document.getElementById("acsReturnToSite");a&&r.Bind(a,"click",t.proxy(function(e){r.preventDefault(e);var t=window.location.href+"";window.location=t.substr(0,t.indexOf("#"))},this));var l=this.stg.get("ovr");if(l){l=JSON.parse(l),document.getElementById("acsOverridePooling").checked=l.pooloverride;for(var c in l.sp)try{document.getElementById("_spovr_"+c).value=l.sp[c].reg}catch(e){}for(var u in l.lf)try{document.getElementById("_lfovr_"+u).value=l.lf[u]}catch(e){}}},t.domReady(function(){var e=new r.Browser;e.ready.subscribe(function(){var r=new i(e);r.loadResources(t.proxy(function(){r.render()},this))},!0,!0)})});