/***************************************
* @preserve
* ForeSee Web SDK: Tracker Window
* Built April 27, 19 21:52:36
* Code version: 19.6.1
* Template version: 19.6.1
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("fs.utils.js")],function(e,t,i){t.config.brainUrl=t.getParam("brain_url")||t.config.brainUrl;var s={INVITE_SHOWN:"fs_inviteShown",INVITE_ACCEPTED:"fs_inviteAccepted",INVITE_DECLINED:"fs_inviteDeclined",INVITE_ABANDONED:"fs_inviteAbandoned",TRACKER_SHOWN:"fs_trackerShown",TRACKER_CLICKED:"fs_trackerClicked",QUALIFIER_ACCEPTED:"fs_qualifierAccepted",QUALIFIER_DECLINED:"fs_qualifierDeclined",QUALIFIER_SHOWN:"fs_qualifierShown",REMINDER_SHOWN:"fs_reminderShown",REMINDER_ACCEPTED:"fs_reminderAccepted"},r=function(e,t){var i;return i=new window.Function("obj","var p=[],print=function(){p.push.apply(p,arguments);};with(obj){p.push('"+e.replace(/[\r\t\n]/g," ").split("<%").join("\t").replace(/((^|%>)[^\t]*)'/g,"$1\r").replace(/\t=(.*?)%>/g,"',$1,'").split("\t").join("');").split("%>").join("p.push('").split("\r").join("\\'")+"');}return p.join('');"),t?i(t):i},a=function(e,s,r,a,n,o){this.br=e,this.data=r,this.qual=a,this.cpps=s,this.templatehtml=n,this.displayOpts=o,this.userLocale=this.data.def.language.locale||"en",this.qualified=new i.FSEvent,this.disqualified=new i.FSEvent,this.validationFailed=new i.FSEvent,this.qualifiesValue=null,"en"!==this.userLocale&&t.isDefined(this.data.def.qualifier.survey.locales[this.userLocale])&&(this.qual.survey=t.ext({},this.data.def.qualifier.survey.locales[this.userLocale]));for(var l,c=this.qual.survey.questions.length,u=0;u<c;u++){l=this.qual.survey.questions[u];for(var h=0;h<l.choices.length;h++)t.ext(l.choices[h],{id:"q"+u+"c"+h,value:"q"+u+"c"+h,name:"q"+u,type:t.toLowerCase(l.questionType)})}this.disqualified.subscribe(t.proxy(function(){this.showNoThanks()},this)),this.validationFailed.subscribe(t.proxy(function(e){alert(e)},this))};a.prototype.render=function(){var e=t.ext({},this.displayOpts,{qual:this.qual});document.documentElement.setAttribute("id","fsrQualifier"),document.body.innerHTML=r(this.templatehtml,e),i.Bind(document.getElementById("qualifierForm"),"qualifier:submit",t.proxy(function(e){i.preventDefault(e),this.validateAndSubmit()},this)),i.Bind(document.getElementById("qualCancelButton"),"qualifier:click",t.proxy(function(e){i.preventDefault(e),this.disqualified.fire()},this)),i.Bind(document.getElementById("qualCloseButton"),"qualifier:click",t.proxy(function(e){i.preventDefault(e),window.close()},this))},a.prototype.validateAndSubmit=function(){for(var e=document.querySelectorAll(".activeQuestion"),t=[],i=!1,s=0;s<e.length;s++){var r=parseInt(e[s].getAttribute("questionNum")),a=this.qual.survey.questions[r];if("RADIO"==a.questionType){for(var n=document.getElementsByName("q"+r),o=!1,l=0;l<n.length;l++)if(n[l].checked){o=!0,t.push(a.choices[l]);break}if(!o){i=!0;break}}}if(i)this.validationFailed.fire(this.qual.survey.validationFailedMsg);else{for(var c=!1,u=0;u<t.length;u++){var h=t[u];if(this.qualifiesValue=h.qualifies||null,h.cpps&&h.cpps.length>0)for(var d=0;d<h.cpps.length;d++)for(var f in h.cpps[d])this.cpps.set(f,h.cpps[d][f]);if(!1===h.qualifies){c=!0;break}}!0===c?this.disqualified.fire():this.qualified.fire()}},a.prototype.showNoThanks=function(){i.addClass(document.getElementById("fsrQualifierMain"),"acsNoDisplay"),i.removeClass(document.getElementById("fsrQualifierNoThanks"),"acsNoDisplay")};var n=function(e,t,s,r,a,n){this.br=e,this.data=s,this.rmdr=r,this.lng=s.def.language.locale,this.cpps=t,this.templatehtml=a,this.displayOpts=n,this.accepted=new i.FSEvent};n.prototype.render=function(){var e,s;document.documentElement.setAttribute("id","fsrReminder"),s=t.ext({},this.rmdr),"en"!==this.lng&&t.isDefined(this.rmdr.display.locales[this.lng])&&(s.display=this.rmdr.display.locales[this.lng]),e=t.ext({},this.displayOpts,{rmdr:s}),document.body.innerHTML=r(this.templatehtml,e),i.Bind(document.getElementById("reminderForm"),"reminder:submit",t.proxy(function(e){i.preventDefault(e),this.accepted.fire()},this))};var o=function(config,e,i,s){this.cfg=config,this.globalConfig=config.globalConfig||t.config,this.cpps=e,this.def=i,this.locale=e.get("locale")||"en",this.qual=s},l=function(e,t){var i,s,r=t.name||"";r+="-"+(t.section||""),r+="-"+(t.site||"");for(var a=0;a<e.defs.length;a++)if(s=e.defs[a],i=s.name||"",i+="-"+(s.section||""),(i+="-"+(s.site||""))===r)return{legacyChosen:s.modernPercentage<Math.floor(100*Math.random()),modernPercentage:s.modernPercentage};return{legacyChosen:!0,modernPercentage:0}};o.prototype.getUrl=function(){var e,s,r=this.def,a=i.now()+"_"+Math.round(1e13*Math.random()),n=r.name+"-"+(t.isDefined(r.site)?r.site+"-":"")+(t.isDefined(r.section)?this.def.section+"-":"")+this.locale,o=this.cfg.config.abSurveyType,c=o&&o.shouldTest&&this.globalConfig.modernSurveyUrl;this.qual&&(n+="-"+this.qual.qualifiesValue);var u={sid:n,cid:this.cfg.config.id,pattern:this.cpps.get(r.pattern)||r.pattern,a:a,b:i.hash(a),c:864e5};this.cfg.config.onlyModernSurvey?e=this.globalConfig.modernSurveyUrl:c?(s=l(o,this.cfg.active_surveydef),u.mp=s.modernPercentage,e=s.legacyChosen?this.globalConfig.surveyUrl:this.globalConfig.modernSurveyUrl):e=this.globalConfig.surveyUrl,e+="?";for(var h in u)e+=t.enc(h)+"="+t.enc(u[h])+"&";return e+=this.cpps.toQueryString()};var c=function(e){this.gs=e};c.prototype={_extras:{},set:function(e,t){this.all()[e]=t,this._extras[e]=t},get:function(e){return this.all()[e]},all:function(){return t.ext({},this.gs.get("cp")||{},this._extras)},toQueryString:function(){var e=[],i=this.all();for(var s in i)e.push("cpp["+t.enc(s)+"]="+t.enc(i[s]));return e.join("&")},erase:function(e){var t=this.all();delete t[e],this.gs.set("cp",t)},append:function(e,t,i){var s=this.gs.get("cp")||{};if(s[e]=(s[e]||"")+","+t,i){var r=s[e].split(","),a=r.length-1,n=r.length>i?r.length-i:0;s[e]=r.splice(n,a-n+1).join()}this.gs.set("cp",s)}};var u="undefined"!=typeof config?config.config.surveyAsyncCurl:"i.4see.mobi";if({SERVICE_TYPES:{survey:{host:"survey.foreseeresults.com",path:"/survey",url:"/display",protocol:"https"},mobileOnExitInitialize:{host:u,path:"/e",url:"/initialize"},mobileOnExitHeartbeat:{host:u,path:"/e",url:"/recordHeartbeat"},check:{host:"controller.4seeresults.com",path:"/fsrSurvey",url:"/OTCImg",success:3},event:{host:"events.foreseeresults.com",path:"/rec",url:"/process?event=logit"},domain:{host:"survey.foreseeresults.com",path:"/survey",url:"/FSRImg",success:3},replay:{host:"replaycontroller.4seeresults.com",path:"/images",enabled:!0}}}.ping=function(e,t,s,r){(new i.ImageTransport).send({url:"https://"+e.host+e.path+(e.url||""),success:s||function(){},failure:r||function(){},data:t})},!window.btoa){var h="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",d=new Array(-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1);window.btoa=function(e){var t,i,s,r,a,n;for(s=e.length,i=0,t="";s>i;){if(r=255&e.charCodeAt(i++),i==s){t+=h.charAt(r>>2),t+=h.charAt((3&r)<<4),t+="==";break}if(a=e.charCodeAt(i++),i==s){t+=h.charAt(r>>2),t+=h.charAt((3&r)<<4|(240&a)>>4),t+=h.charAt((15&a)<<2),t+="=";break}n=e.charCodeAt(i++),t+=h.charAt(r>>2),t+=h.charAt((3&r)<<4|(240&a)>>4),t+=h.charAt((15&a)<<2|(192&n)>>6),t+=h.charAt(63&n)}return t},window.atob=function(e){var t,i,s,r,a,n,o;for(n=e.length,a=0,o="";n>a;){do{t=d[255&e.charCodeAt(a++)]}while(n>a&&-1==t);if(-1==t)break;do{i=d[255&e.charCodeAt(a++)]}while(n>a&&-1==i);if(-1==i)break;o+=String.fromCharCode(t<<2|(48&i)>>4);do{if(61==(s=255&e.charCodeAt(a++)))return o;s=d[s]}while(n>a&&-1==s);if(-1==s)break;o+=String.fromCharCode((15&i)<<4|(60&s)>>2);do{if(61==(r=255&e.charCodeAt(a++)))return o;r=d[r]}while(n>a&&-1==r);if(-1==r)break;o+=String.fromCharCode((3&s)<<6|r)}return o}}var f=function(e,s,r){var a=r.cfg.config;this.br=e,this.stg=s,this.data=r,this._stage=1,this.jrny=new i.Journey(a.id,i.APPID.TRIGGER,s.get("rid"),e,50),this.jrny.addEventsDefault("properties",{fs_site:[i.getRootDomain()],fs_repeatDaysAccept:[a.repeatDays.accept],fs_repeatDaysDecline:[a.repeatDays.decline],fs_reinviteDelayAfterInviteAbandon:[a.reinviteDelayAfterInviteAbandon],fs_defName:[this.data.def.name],fs_section:[this.data.def.section],fs_displayName:[this.data.display.displayname],fs_language:[this.data.cfg.active_surveydef.locale],fs_samplePercentage:[this.data.def.criteria.sp.reg],fs_loyaltyFactor:[this.data.def.criteria.lf]}),this.cpps=new c(this.stg),t.ext(this.cpps._extras,r.cpps),this._loadResources(t.proxy(function(){document.documentElement.style.backgroundImage="none",this.ready.fire(),s.onSync.subscribe(t.proxy(function(){s.get("page_hb")||(s.onSync.unsubscribeAll(),this.launchSurveyOrQualifier(),this.data.display.removeSurveyAlerts||setTimeout(t.proxy(function(){var e=t.toLowerCase(navigator.userAgent);-1==e.indexOf("msie")&&-1==e.indexOf("edge")&&-1==e.indexOf("firefox")&&this.data.display.dialog&&alert(this.data.display.dialog.surveyavailable)},this),200))},this))},this)),this.ready=new i.FSEvent};f.prototype.update=function(e,t,i){this.br=e,this.stg=t,this.data=i},f.prototype.setCPPS=function(e){if(e){this.jrny.addEventsDefault("properties",{fs_pvInvited:[e.pv]});for(var t in e)this.cpps.set(t,e[t])}},f.prototype._loadResources=function(e){if(this.data&&this.data.template&&"string"==typeof this.data.template){var s=this.data.template,r=s.indexOf("@")>-1,a=t.makeURI("templates/trigger/"+s+"/main.css"),n=t.makeURI("templates/trigger/"+s+"/tracker.html"),o=t.makeURI("templates/trigger/"+s+"/qualifier.html"),l=t.makeURI("templates/trigger/"+s+"/reminder.html"),c=t.getParam("gw");r&&(s=s.substr(1),t.isSelfHosted?(a=t.makeAssetURI("trigger/templates/"+s+"/main.css"),n=t.makeAssetURI("trigger/templates/"+s+"/tracker.html"),o=t.makeAssetURI("trigger/templates/"+s+"/qualifier.html"),l=t.makeAssetURI("trigger/templates/"+s+"/reminder.html")):(a=c.replace(/__gwtest__/g,"templates/"+s+"/main.css"),n=c.replace(/__gwtest__/g,"templates/"+s+"/tracker.html"),o=c.replace(/__gwtest__/g,"templates/"+s+"/qualifier.html"),l=c.replace(/__gwtest__/g,"templates/"+s+"/reminder.html"))),this.queue=new i.Async(!0,t.proxy(function(){e&&e()},this),t.proxy(function(){},this)),this.queue.enqueue(t.proxy(function(e){i.loadCSS(a,t.proxy(function(t){this._cssLink=t,e&&e.resolve()},this),null,this.br)},this)),this.queue.enqueue(t.proxy(function(e){new i.JSONP({success:t.proxy(function(t){this.templatehtml=t,e&&e.resolve()},this)}).get(n,"templates_trigger_"+s+"_")},this)),this.queue.enqueue(t.proxy(function(e){new i.JSONP({success:t.proxy(function(t){this.qualhtml=t,e&&e.resolve()},this)}).get(o,"templates_trigger_"+s+"_")},this)),this.queue.enqueue(t.proxy(function(e){new i.JSONP({success:t.proxy(function(t){this.rmdrhtml=t,e&&e.resolve()},this)}).get(l,"templates_trigger_"+s+"_")},this))}},f.prototype.renderTemplate=function(){var e=this.data.def.language.locale||"en";this.data.display.inviteType=this.data.display.inviteType.toUpperCase();var a=t.ext({copyrightDate:(new Date).getFullYear().toString(),supportsSVG:document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure","1.1")},this.data.display,this.data.cfg.config),n=t.getParam("gw");a.trackerLogo&&a.trackerLogo.length>0&&(t.isDefined(t.assetLocation)&&"undefined"!=t.assetLocation?a.trackerLogo=t.makeAssetURI("trigger/"+a.trackerLogo):a.trackerLogo=n.replace(/__gwtest__/g,a.trackerLogo)),a.vendorLogo&&a.vendorLogo.length>0&&(a.vendorLogo=t.makeAssetURI(a.vendorLogo)),a.vendorLogoPNG&&a.vendorLogoPNG.length>0&&(a.vendorLogoPNG=t.makeAssetURI(a.vendorLogoPNG)),a.trusteLogo&&a.trusteLogo.length>0&&(a.trusteLogo=t.makeAssetURI(a.trusteLogo)),a.loadImg=t.makeURI("loadimg.gif"),this._displayOpts=a,document.title=a.dialog.trackerTitle,document.body.innerHTML=r(this.templatehtml,a),document.documentElement.setAttribute("lang",e),this._doSizing(),this._cvTimeout?2==this._stage&&this._convertTracker():this._cvTimeout=setTimeout(t.proxy(function(){this._stage=2,this._convertTracker()},this),this.data.cfg.config.trackerConvertsAfter),i.Bind(window,"tracker:resize",t.proxy(function(){this._doSizing()},this)),this.jrny.addEventString(s.TRACKER_SHOWN)},f.prototype._doSizing=function(){var e=document.querySelectorAll("*[acsfill=true]"),t=i.getSize(window);if(e)for(var s=0;s<e.length;s++){var r=e[s],a=r.offsetLeft,n=r.offsetTop;r.style.height=t.h-n-1*a+"px"}var o=document.querySelectorAll("*[acscentervertically=true]");if(o)for(var l=0;l<o.length;l++){var c=o[l],u=c.offsetHeight,h=c.parentNode.offsetHeight;c.style.marginTop=(h-u)/2+"px"}},f.prototype._convertTracker=function(){var e,r=document.querySelectorAll(".initialContent");for(e=0;e<r.length;e++)i.addClass(r[e],"acsNoDisplay");var a=document.querySelectorAll(".showLater");for(e=0;e<a.length;e++)i.addClass(a[e],"acsDisplay");this._doSizing(),i.addClass(document.body,"acsActiveTracker");var n=document.querySelectorAll("*[acsactivatebutton=true]"),o=t.proxy(function(){this.jrny.addEventString(s.TRACKER_CLICKED),this.launchSurveyOrQualifier()},this),l=function(e){13===(window.event?e.which:e.keyCode)&&o()};for(e=0;e<n.length;e++)i.Bind(n[e],"click",o),i.Bind(n[e],"keydown",l)},f.prototype.launchSurveyOrQualifier=function(){this._cvTimeout&&(clearTimeout(this._cvTimeout),this._cvTimeout=null);for(var e=document.querySelectorAll("*[acsshowwhenloading=true]"),t=0;t<e.length;t++)i.addClass(e[t],"acsDisplay");for(var s=document.querySelectorAll("*[acshidewhenloading=true]"),r=0;r<s.length;r++)i.removeClass(s[r],"acsDisplay"),i.addClass(s[r],"acsNoDisplay");var a=this.data.def.qualifier,n=this.data.def.reminder;a&&a.useQualifier?this.goToQualifier():n&&n.useReminder?this.goToReminder():this.goToSurvey(null)},f.prototype.goToQualifier=function(){this.qualifier=new a(this.br,this.cpps,this.data,this.data.def.qualifier,this.qualhtml,this._displayOpts),this.qualifier.qualified.subscribe(t.proxy(function(){this.jrny.addEventString(s.QUALIFIER_ACCEPTED),this.goToSurvey(this.qualifier)},this),!0,!1),this.qualifier.disqualified.subscribe(t.proxy(function(){this.jrny.addEventString(s.QUALIFIER_DECLINED)},this),!0,!1),this.qualifier.render(),this.jrny.addEventString(s.QUALIFIER_SHOWN)},f.prototype.goToReminder=function(){this.reminder=new n(this.br,this.cpps,this.data,this.data.def.reminder,this.rmdrhtml,this._displayOpts),this.reminder.accepted.subscribe(t.proxy(function(){this.jrny.addEventString(s.REMINDER_ACCEPTED),this.goToSurvey()},this),!0,!1),this.reminder.render(),this.jrny.addEventString(s.REMINDER_SHOWN)},f.prototype.goToSurvey=function(e){var i=new o(this.data.cfg,this.cpps,this.data.def,this.qualifier),s=i.getUrl();window.resizeBy(0,200),window.focus(),setTimeout(t.proxy(function(){this._doSizing(),window.location=s},this),100)},t.winReady(function(){var e,s=setTimeout(function(){window.close()},13e3),r=new i.Browser;r.ready.subscribe(function(){var a=i.getBrainStorage(r,t.getParam("uid"));a.ready.subscribe(function(){a.setUpdateInterval(1e3),a.watchForChanges(["trackerinfo","trackercmd","ckcpps"],function(n,o,l){if("trackercmd"==n)switch(l.method){case"close":window.close();break;case"survey":e&&e.goToSurvey&&e.goToSurvey()}else"ckcpps"==n&&e?t.ext(e.cpps._extras,l):"trackerinfo"==n&&(t.isDefined(e)&&e.data.cfg.active_surveydef.name===l.cfg.active_surveydef.name||a.setUpdateInterval(5e3),a.erase("trackerinfo"),t.isDefined(e)?e.data.cfg.active_surveydef.name!==l.cfg.active_surveydef.name&&(e.update(r,a,l),e.renderTemplate()):(e=new f(r,i.getBrainStorage(r,a.uid),l),window.Tracker=e,e.ready.subscribe(function(){clearTimeout(s),e.renderTemplate()},!0,!0)))}.bind(this),!1,!0)}.bind(this),!0,!0)},!0,!0)})});