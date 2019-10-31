/***************************************
* @preserve
* ForeSee Web SDK: Trigger
* Built April 27, 19 21:28:57
* Code version: 19.7.5
* Template version: 19.7.5
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("$fs.utils.js"),"triggerconfig"],function(C,fs,utils,P){var R={loadedEmitter:new utils.FSEvent,initializedEmitter:new utils.FSEvent,inviteShownEmitter:new utils.FSEvent,inviteAcceptedEmitter:new utils.FSEvent,inviteAbandonedEmitter:new utils.FSEvent,inviteDeclinedEmitter:new utils.FSEvent,trackerShownEmitter:new utils.FSEvent,customInvitationRequested:new utils.FSEvent,CPPS:null,_triggerResetLock:null,state:{didInvite:!1},inviteSetup:null},r="fs_inviteShown",c="fs_inviteAccepted",i="fs_inviteDeclined",e="fs_inviteAbandoned",o="fs_linksCancel";if(P&&P.surveydefs)for(var t=0;t<P.surveydefs.length;t++)fs.isString(P.surveydefs[t])&&(P.surveydefs[t]=utils.compile(utils.b64DecodeUnicode(P.surveydefs[t])));var M=window,L=new utils.Cookie({path:"/",secure:!1,encode:!0}),s=utils.Compress;if(fs.fsCmd("fstest"))C([fs.makeURI("$fs.svadmin.js")],function(e){});else if(fs.fsCmd("fsoptout"))C([fs.makeURI("$fs.optout.js")],function(e){});else{var n=function(e,t,i,s,r,n){var o={width:700,height:350,left:50,top:50,resizable:"no",scrollbar:"1",scrollbars:"1",toolbar:"no",menubar:"no",location:"0",directories:"no",status:"no"},a=n?g(i.width||o.width,i.height||o.height):{},c=fs.ext(o,i,a),f="";for(var l in c)f+=l+"="+c[l]+",";var d=this._win=M.open(e,t,f);if(d&&r)if(d.blur(),d.opener.window.focus(),M.focus(),"Firefox"==s.browser.name){var u=M.open("about:blank");u.focus(),u.close()}else s.isIE&&setTimeout(function(){d.blur(),d.opener.window.focus(),M.focus()},1e3);return d},g=function(e,t){var i=void 0!==window.screenLeft?window.screenLeft:screen.left,s=void 0!==window.screenTop?window.screenTop:screen.top,r=window.innerWidth;window.innerWidth||(r=document.documentElement.clientWidth?document.documentElement.clientWidth:screen.width);var n=window.innerHeight;return window.innerHeight||(n=document.documentElement.clientHeight?document.documentElement.clientHeight:screen.Height),{left:r/2-e/2+i,top:n/2-t/2+s}},a=P.config.surveyAsyncCurl,f={SERVICE_TYPES:{mobileOnExitInitialize:{host:a,path:"/e",url:"/initialize"},mobileOnExitHeartbeat:{host:a,path:"/e",url:"/recordHeartbeat"}},ping:function(e,t,i,s){var r=new utils.ImageTransport,n="https://"+e.host+e.path+(e.url||"");r.send({url:n,success:i||function(){},failure:s||function(){},data:t})}},O=function(e,t,i,s,r,n,o,a){return R.inviteSetup?a.call(R.inviteSetup):R.inviteSetup=new N(e,t,i,s,r,n,o,a),R.inviteSetup},N=function(i,s,r,n,o,e,t,a){if(this.trig=i,this.browser=s,this.stg=r,this.cpps=n,this.displayoverride=o,this.jrny=e,this.resourcesready=new utils.FSEvent,this.triggerMethod=t,fs.isDefined(this.trig.surveydef.inviteExclude)&&fs.isDefined(this.trig.crit)&&this.trig.crit.runAllTests(this.trig.surveydef.inviteExclude,this.browser,!1,!0))return!1;var c=this;fsReady(function(){var e;if(i.invite&&i.invite.dispose(),s.isMobile&&i.cfg.config.pagesInviteAvailable)if(null===(e=r.get("pia")))r.set("pia",i.cfg.config.pagesInviteAvailable-1);else if(0<e)r.set("pia",--e);else if(0===e)return;C([fs.makeURI("$fs.invite.js")],function(e){var t=c.invite=i.invite=new e(P,i.surveydef,s,N.getFittingDisplay(i.surveydef,o,n.get("locale"),s),n,R);r.set("dn",t.display.displayname),a&&a.call(c)}.bind(this))})},j=function(e,t,i){var s=new m(i,P,e.surveydef,e.cpps,e.stg.get("rid"),e.locale);e.stg.get("mhbi")?s.beginHeartbeat():s.init(t,function(){s.beginHeartbeat()})};N.prototype.initialize=function(){var s=this.trig,r=this.stg,n=this.cpps,o=(this.displayoverride,this.invite),a=this.jrny;this.didInitialize||(this.didInitialize=!0,a.addEventsDefault("properties",{fs_defName:[s.surveydef.name],fs_section:[s.surveydef.section],fs_displayName:[o.display.displayname],fs_displayTemplate:[o.display.template],fs_pvInvited:[s.pageViewCount],fs_language:[o.locale],fs_samplePercentage:[s.surveydef.criteria.sp.reg],fs_loyaltyFactor:[s.surveydef.criteria.lf],fs_environment:[fs.isProduction?"production":"staging"],fs_deployType:[fs.isSelfHosted?"on-prem":"cloud"],fs_inviteType:["intercept"],fs_triggerMethod:[this.triggerMethod]}),n.set("TriggerMethod",this.triggerMethod),n.set("dn",o.display.displayname),n.set("dt",o.display.template),o.loadResources(this.resourcesready),o.declined.subscribe(function(e){var t=fs.isDefined(P.active_surveydef)&&fs.isDefined(P.active_surveydef.repeatDays)?P.active_surveydef.repeatDays:P.config.repeatDays;r.set("i","d"),r.setMaxKeyExpiration(24*t.decline*60*60*1e3),a.addEventObj({name:i,properties:{action:[e]}}),R.inviteDeclinedEmitter.fire(s.surveydef,r,P,n),s.surveydef.cxRecord&&R.rec&&"y"!=r.get("fbr")&&(R.rec.cancelRecord(),s.recordController=R.rec=null),R.state.inviteSituation="DECLINED"}),o.abandoned.subscribe(function(){a.addEventString(e),r.set("i","a"),R.state.inviteSituation="ABANDONED",R.inviteAbandonedEmitter.fire(s.surveydef,r,P,n),r.set("rw",utils.now()+P.config.reinviteDelayAfterInviteAbandon)}),o.accepted.subscribe(function(e,t){var i=fs.isDefined(P.active_surveydef)&&fs.isDefined(P.active_surveydef.repeatDays)?P.active_surveydef.repeatDays:P.config.repeatDays;switch(r.setMaxKeyExpiration(24*i.accept*60*60*1e3),R.inviteAcceptedEmitter.fire(s.surveydef,r,P,n),s.surveydef.cxRecord&&R.rec&&R.rec.recorder&&R.rec.beginTransmitting(),a.initPopupId(),a.addEventString(c),r.set("i","x"),R.state.inviteSituation="ACCEPTED",r.set("ixw",utils.now()),e){case"TRACKER":s.popTracker(o);break;case"INSESSION":s.popSurvey();break;case"SMS":case"EMAIL":case"SMSEMAIL":j(s,t,e),s.stg.set("mhbi",{ui:t,it:e})}}))},N.prototype.present=function(){this.invite;var e=this.stg,t=this.jrny,i=this.trig,s=this.cpps;R.state.didInvite||(R.state.didInvite=!0,this.resourcesready.subscribe(function(){setTimeout(function(){this.invite.present(),"p"!==e.get("i")&&t.addEvent(r),e.set("i","p"),R.state.inviteSituation="PRESENTED",R.inviteShownEmitter.fire(i.surveydef,e,P,s)}.bind(this),Math.max(0,P.config.inviteDelay-(utils.now()-fs.startTS)))}.bind(this),!0,!0))},N.getFittingDisplay=function(e,t,i,s){i=i||R.CPPS.get("locale")||"en";var r,n,o,a,c={},f={};if((s=s||R.browser).isMobile&&e.display.mobile?(c={},f={},r=e.display.mobile):r=e.display.desktop,r)for(a=0;a<r.length;a++)f=c.dialog||{},c=fs.ext({},c),c=fs.ext(c,r[a]),r[a].dialog&&c.dialog&&(c.dialog=fs.ext(fs.ext({},f),r[a].dialog)),r[a]=c;if(t){for(a=0;a<r.length;a++)if(r[a].displayname==t){o=r[a];break}}else o=r[Math.round(999999999999*Math.random())%r.length];return o.dialog.locales&&o.dialog.locales[i]&&(n=o.dialog.locales[i],o.dialog=fs.ext(o.dialog,n),n.localeImages&&(o=fs.ext(o,n.localeImages))),fs.ext({inviteLogo:"",trackerLogo:"",siteLogoAlt:""},o)};var B=function(e,t,i,s,r,n,o){R.tracker&&(R.tracker.dispose(),R.tracker=null),R.tracker=this,fs.ext(this,{template:e,def:t,cfg:i,disp:n,_fcBindings:[]}),this.cpps=r,this.br=o,this.stg=s;var a=0;window.performance&&window.performance.timing&&(a=window.performance.timing.domComplete-window.performance.timing.navigationStart),this.hbi=3*Math.max(i.config.trackerHeartbeatTimeout,R.pageLoadTime,a),e&&R.trackerShownEmitter.fire(t,s,i,r),fs.config.storage!==utils.storageTypes.MC&&this.stg._readyState.subscribe(function(){0<s._serverFails&&(generalStorage=utils.getGeneralStorage(o),generalStorage.set("i","f"),R.state.inviteSituation="BRAINFAILED",generalStorage.set("fw",utils.now()+432e5))},!0,!1),this.stg.ready.subscribe(function(){this.stg.set("tracker_hb",utils.now(),this.hbi,!1);var e=function(e){this.stg.set("page_hb",utils.now(),this.hbi,!!e)}.bind(this),t=this.stg.onCommit.subscribe(function(){null===s.get("tracker_hb")?utils.now()-this.lastTimeSeenTracker>this.cfg.config.trackerHeartbeatTimeout&&(t.unsubscribe(),delete this.lastTimeSeenTracker,this.dispose()):this.lastTimeSeenTracker=utils.now()}.bind(this),!1,!1);this._heartbeat=setInterval(e,Math.round(.5*this.cfg.config.trackerHeartbeatTimeout)),e(!0)}.bind(this),!0,!0),utils.Bind(M,"unload",function(){this.hbi=this.cfg.config.trackerHeartbeatLongTimeout,this.stg.set("page_hb",utils.now(),this.hbi,!0)}.bind(this));var c=fs.enc;this._url=fs.makeURI(["$fs.tracker.html?uid=",c(s.uid||""),"&sitekey=",c(fs.config.siteKey),"&domain=",c(utils.getRootDomain()),"&gw=",c(fs.makeURI("trigger/__gwtest__")),"&brain_url=",c(fs.config.brainUrl),"&fsrlocale=",c(r.get("locale")||"en"),"&_svu_=",c(fs.config.surveyUrl),"&_cv_=",c(fs.config.codeVer),"&_issh_=",c(fs.isSelfHosted),"&_vt_=",c(fs.tagVersion),"&_au_=",c(fs.config.analyticsUrl),"&_pa_=",c(fs.assetLocation)].join("")),this.cpps.onSet.subscribe(function(e,t){var i={};i[e]=t,this.stg.set("ckcpps",i,2e5,!1)}.bind(this)),this.stg.set("ckcpps",this.cpps.all(),2e5,!1),this._sendDefinition()};B.prototype._sendDefinition=function(){var e={method:"init",cfg:fs.ext({active_surveydef:null},this.cfg,{globalConfig:fs.config}),hb_i:this.hbi,cpps:this.cpps.all()};this.disp&&(e.display=this.disp),this.template&&(e.template=this.template),this.stg.set("page_hb",utils.now(),this.cfg.config.trackerHeartbeatTimeout,!1),this.stg.set("trackerinfo",e,6e4,!1),this.stg.set("ckcpps",this.cpps.all(),2e5,!1)},B.prototype.show=function(e){this.wref=n(this._url,"fsTracker",{width:700,height:450},e,!0,this.cfg.config.centerTrackerPopup)},B.prototype.applyExisting=function(e,t){(this.wref=t).location=this._url},B.prototype.dispose=function(){for(var e=0;e<this._fcBindings.length;e++)this._fcBindings[e].unsubscribe();utils.getGeneralStorage(this.br)===this.stg&&this.stg.dispose(),this.stg=null,clearInterval(this._heartbeat)};var l=function(e,t,i,s){this.cfg=e,this.globalConfig=e.globalConfig||fs.config,this.cpps=t,this.def=i,this.locale=t.get("locale")||"en",this.qual=s};l.prototype.decideModernSurvey=function(){var e=this.cfg.config.abSurveyType,t=e&&e.shouldTest&&this.globalConfig.modernSurveyUrl&&function(e,t){var i,s,r,n=t.name||"";for(n+="-"+(t.section||""),n+="-"+(t.site||""),i=0;i<e.defs.length;i++)if(s=(r=e.defs[i]).name||"",s+="-"+(r.section||""),(s+="-"+(r.site||""))===n)return r;return null}(e,this.def);return this.cfg.config.onlyModernSurvey?{modernChosen:!0,modernPercentage:100}:t?{modernChosen:t.modernPercentage>=Math.floor(100*Math.random()),modernPercentage:t.modernPercentage}:{modernChosen:!1,modernPercentage:0}},l.prototype.getUrl=function(){var e,t=this.def,i=utils.now()+"_"+Math.round(1e13*Math.random()),s=t.name+"-"+(fs.isDefined(t.site)?t.site+"-":"")+(fs.isDefined(t.section)?this.def.section+"-":"")+this.locale,r=this.decideModernSurvey();this.qual&&(s+="-"+this.qual.qualifiesValue);var n={sid:s,cid:this.cfg.config.id,pattern:this.cpps.get(t.pattern)||t.pattern,a:i,b:utils.hash(i),c:864e5,mp:r.modernPercentage};for(var o in e=r.modernChosen?this.globalConfig.modernSurveyUrl:this.globalConfig.surveyUrl,e+="?",n)e+=fs.enc(o)+"="+fs.enc(n[o])+"&";return e+=this.cpps.toQueryString()};var d=function(e,t){this.stg=e,this.cfg=t};d.prototype.calcReplayPoolStatus=function(e){var t,i,s,r=this.cfg.config,n=r.replay_pools,o=M.location.toString();if(n&&0!==n.length&&!0!==this.pooloverride){if(i=this.stg.get("pl"),!fs.isDefined(i))for(t=0;t<n.length;t++)utils.testAgainstSearch(n[t].path,o)&&(i=100*Math.random()<n[t].sp?1:0,this.stg.set("pl",i,144e5));if(s=r.replay_repools,0===i&&s&&0<s.length)for(t=0;t<s.length;t++)utils.testAgainstSearch(s[t].path,o)&&(i=100*Math.random()<s[t].sp?1:0,this.stg.set("pl",i,144e5));e(!!i)}else e(!0)},d.prototype.optoutCheck=function(e,t){this.stg.ready.subscribe(function(){!0===this.stg.get("optout")?t():e()}.bind(this),!0,!0)},d.prototype.browserCheck=function(e,t){return!(!e.isMobile&&t.config.browser_cutoff[e.browser.name]&&e.browser.actualVersion<t.config.browser_cutoff[e.browser.name])},d.prototype.featureCheck=function(e,t){return!(t.config.persistence==utils.storageTypes.DS&&!e.supportsLocalStorage)},d.prototype.platformCheck=function(e,t){return!(t.config.platform_cutoff[e.os.name]&&e.os.version<t.config.platform_cutoff[e.os.name])},d.prototype.checkDeviceBlacklist=function(e,t){for(var i=0;i<t.config.device_blacklist.length;i++)if(-1<fs.toLowerCase(e.agent).indexOf(fs.toLowerCase(t.config.device_blacklist[i])))return!1;return!0},d.prototype._match=function(e,t,i){var s=e.include,r=e[i||"globalExclude"];if(e.criteria){if(!e.criteria.supportsSmartPhones&&!t.isTablet&&t.isMobile)return!1;if(!e.criteria.supportsTablets&&t.isTablet)return!1;if(!e.criteria.supportsDesktop&&!t.isMobile)return!1}if(r&&this.runAllTests(r,t,!1,!0))return!1;return!s||this.runAllTests(s,t,!1,!0)},d.prototype.runAllTests=function(e,t,i,s){var r,n=new utils.Cookie({}),o={urls:M.location.href.toString(),referrers:document.referrer.toString(),userAgents:M.navigator.userAgent};function a(e,t){Array.isArray(t)||(t=[t]);for(var i=0,s=t.length;i<s;i++)if("string"==typeof t[i]&&(t[i]=t[i].replace(/-_DS_-/gi,"$$")),utils.testAgainstSearch(t[i],e))return!0;return!1}for(var c in e){var f=e[c];if(0<f.length){if(r=!1,o[c])r=a(o[c],f);else if("browsers"==c)for(var l=t.browser.name,d=t.browser.actualVersion,u=0;u<f.length;u++)-1<fs.toLowerCase(l).indexOf(fs.toLowerCase(f[u].name))&&(f[u].comparison?"lt"==f[u].comparison&&d<f[u].version?r=!0:"eq"==f[u].comparison&&d==f[u].version?r=!0:"gt"==f[u].comparison&&d>f[u].version&&(r=!0):r=!0);else if("cookies"==c)for(var g=0;g<f.length;g++){var h=f[g],p=n.get(h.name);fs.isDefined(h.value)&&p==h.value?r=!0:!fs.isDefined(h.value)&&p&&(r=!0)}else if("variables"==c)for(var v=0;v<f.length;v++){var m=[].constructor.constructor;delete[].constructor.constructor;var y,b=f[v],w=new[].constructor.constructor("var v1 = '';try { v1 = "+b.name+";}catch(err) {}return v1;").call(M);[].constructor.constructor=m,w||(w="boolean"!=typeof w&&""),(y=fs.isDefined(b.value))&&w===b.value?r=!0:y&&utils.testAgainstSearch(b.value,w)?r=!0:!y&&w&&(r=!0)}if(!r&&i)return!0;if(r&&s)return!0}}return!1};var F=function(e){this.cfg=e};F.prototype._bindToLink=function(e,t){for(var i=document.querySelectorAll(e.selector),s=function(t,i,s){return function(e){i.preventDefault&&utils.preventDefault(e),s.call(t,i)}},r=0;r<i.length;r++){var n,o=i[r],a=!0;if(e.attribute&&(a=!1,(n=o.getAttribute(e.attribute))&&(a=!0,e.patterns&&0<e.patterns.length))){a=!1;for(var c=0;c<e.patterns.length;c++)if(-1<fs.toLowerCase(n).indexOf(fs.toLowerCase(e.patterns[c]))){a=!0;break}}a&&utils.Bind(o,"trigger:click",s(this,e,t))}},F.prototype.performBindings=function(e){if(e&&this.cfg){var t,i=this.cfg;if(i.cancel&&0<i.cancel.length){var s=function(){e.cancelTracker(),e.jrny.addEventString(o)};for(t=0;t<i.cancel.length;t++)this._bindToLink(i.cancel[t],s)}if(i.survey&&0<i.survey.length){var r=function(){e.popSurvey()};for(t=0;t<i.survey.length;t++)this._bindToLink(i.survey[t],r)}if(!e.browser.isMobile&&i.tracker&&0<i.tracker.length){var n=function(){e.popTracker()};for(t=0;t<i.tracker.length;t++)this._bindToLink(i.tracker[t],n)}}};var u,h=new utils.FSEvent;fs.API.expose("CPPS",{set:function(){var e;h.subscribe((e=arguments,function(){R.CPPS.set.apply(R.CPPS,e)}),!0,!0)},get:function(e,t){var i;t=t||console.log,h.subscribe((i=[arguments],function(){t(R.CPPS.get.apply(R.CPPS,i[0]))}),!0,!0)},all:function(e){e=e||console.table||console.log,h.subscribe(function(){e(R.CPPS.all.apply(R.CPPS))},!0,!0)}}),fs.API.expose("clearState",function(){h.subscribe(function(){R.tracker&&R.tracker._heartbeat&&clearInterval(R.tracker._heartbeat),R.stg.reset(),fs.supportsDomStorage&&sessionStorage.removeItem("acsFeedbackSubmitted"),R.rec&&R.rec.recorder&&R.rec.recorder.clearState()},!0,!0)}),fs.API.expose("dispose",function(){h.subscribe(function(){R.trig&&R.trig.dispose()},!0,!0)}),fs.API.expose("getState",function(e){e=e||console.log,h.subscribe(function(){e(R.state)},!0,!0)}),fs.API.expose("getConfig",function(){return fs.ext({},P,{global:fs.config})}),fs.API.expose("getConfigFormatted",function(){if(console&&console.info&&(console.info("************************** Trigger Configuration **************************"),console.info("Config: ",P.config),P.surveydefs&&P.surveydefs.length)){console.info("************************** Surveydefs Configuration **************************");for(var e=0;e<P.surveydefs.length;e++)console.info("************************** Surveydef "+(e+1)+" **************************"),console.info("Config: ",P.surveydefs[e])}}),fs.API.expose("optOut",function(){var e=M.location.toString();M.location=e.indexOf("#")?e.substr(0,e.indexOf("#")-1)+"#fscommand=fsoptout":e+"#fscommand=fsoptout",M.location.reload()}),fs.API.expose("test",function(){var e=M.location.toString();M.location=e.indexOf("#")?e.substr(0,e.indexOf("#")-1)+"#fscommand=fstest":e+"#fscommand=fstest",M.location.reload()});var p=function(){h.subscribe(function(){u&&(clearTimeout(u),u=null),u=setTimeout(function(){if(u=null,!R._triggerResetLock){R._triggerResetLock=!0;var e=R.trig;e&&(e.dispose(),R.trig=null),fs.startTS=utils.now(),fs.nextTick(function(){w()})}},250)},!0,!0)};fs.API.expose("run",p),fs.API.expose("pageReset",p),fs.API.expose("showInvite",function(t){h.subscribe(function(){if(!document.getElementById("fsrInvite")&&!document.getElementById("acsMainInvite")){var e=R.trig||U(R.stg,P,R.browser,R.crit,R.CPPS);if(e.init()&&e.doesPassCriteria()&&e.surveydef){R.state.didInvite=!1;O(e,R.browser,R.stg,R.CPPS,t,R.jrny,"Traditional",function(){this.initialize(),this.present()})}}},!0,!0)}),fs.API.expose("onLoaded",R.loadedEmitter),fs.API.expose("onInitialized",R.initializedEmitter),fs.API.expose("onInviteShown",R.inviteShownEmitter),fs.API.expose("onInviteAccepted",R.inviteAcceptedEmitter),fs.API.expose("onInviteAbandoned",R.inviteAbandonedEmitter),fs.API.expose("onInviteDeclined",R.inviteDeclinedEmitter),fs.API.expose("onTrackerShown",R.trackerShownEmitter),fs.API.expose("customInvitationRequested",R.customInvitationRequested),fs.API.expose("Journey",{addEvent:function(){var e;h.subscribe((e=arguments,function(){R.jrny.addEvent.apply(R.jrny,e)}),!0,!0)},addEventObj:function(){var e;h.subscribe((e=arguments,function(){R.jrny.addEventObj.apply(R.jrny,e)}),!0,!0)},addEventString:function(){var e;h.subscribe((e=arguments,function(){R.jrny.addEventString.apply(R.jrny,e)}),!0,!0)}}),fs.API.expose("Storage",{get:function(e,t){var i;t=t||console.log,h.subscribe((i=[arguments],function(){t(R.stg.get.apply(R.stg,i[0]))}),!0,!0)},all:function(s){s=s||console.table||console.log,h.subscribe(function(){var e=R.stg.all(),t={};for(var i in e)1!==e[i].d&&(t[i]=e[i]);s(t)},!0,!0)}}),fs.API.expose("Cookie",{get:function(e,t){var i;t=t||console.log||function(){},h.subscribe((i=arguments,function(){try{"_4c_"===i[0]?t(JSON.parse(s.decompress(decodeURIComponent(L.get(i[0]))))):t(L.get(i[0]))}catch(e){console.error("trigger: couldn't read cookie",i[0])}}),!0,!0)}});var V=function(i,e,s,t,r,n){if(e&&t&&(!fs.isDefined(fs.config.products.record)||!1!==fs.config.products.record||!fs.productConfig.record)){var o="$fs.record.js";fs.config.modernRecord&&(o="$fs.rec.js"),C([fs.makeURI(o)],function(e){s.set("rc","true");var t={id:fs.config.customerId||utils.getRootDomain()||"record_customerId"};R.RecordController=e,R.rec=e.getInstance(i,M,s,t,r),n&&(n.recordController=o)})}},U=function(e,t,i,s,r,n){return new v(e,t,i,s,r,n)},v=function(e,t,i,s,r,n){this.stg=e,this.cfg=t,this.browser=i,this.crit=s,this.cpps=r,this.jrny=n;var o,a,c=fs.config.adobeRsid;if(!e.get("pv")){for(a in o={browser:i.browser.name+" "+i.browser.version,os:i.os.name,referrer:document.referrer.toString(),site:utils.getRootDomain(),sitekey:t.config.site_key||""})o.hasOwnProperty(a)&&r.set(a,o[a]);utils.INT.GA.has()&&setTimeout(function(){utils.INT.GA.uid(function(e){e&&r.set("GA_UID",e)})}.bind(this),2e3);var f=function(e){r.set(e.name,e.value)};utils.INT.OM.uid(c,f),utils.INT.OM.mcid(c,f),utils.INT.OM.beacon(function(e){r.set("OMTR_BEACON",e)})}this.heartbeatExpired=new utils.FSEvent};v.prototype.doesPassCriteria=function(){var e=this.crit,t=this.cfg,i=R.state,s="DIDNOTPASSCRITERIA";if(e.platformCheck(this.browser,t))if(e.browserCheck(this.browser,t))if(e.checkDeviceBlacklist(this.browser,t)){if(e.featureCheck(this.browser,t))return!0;i.inviteStatus=s,i.reason="BROWSER"}else i.inviteStatus=s,i.reason="DEVICE";else i.inviteStatus=s,i.reason="BROWSER";else i.inviteStatus=s,i.reason="PLATFORM";return!1},v.prototype.popTracker=function(e){var t=this;if(this.stg.set("i","x"),R.state.inviteSituation="ACCEPTED",this.didPopTrackerAlready="y"==this.stg.get("tp"),R.state.didInvite=!0,!this.didPopTrackerAlready){this.stg.set("tp","y");if(e)t.tracker=new B(e.template,t.surveydef,P,utils.getBrainStorage(t.browser,t.stg.uid),t.cpps,e.display,t.browser),t.tracker.show(t.browser);else{var i=n("about:blank","fsTracker",{width:700,height:400},this.browser,!0,this.cfg.config.centerTrackerPopup);O(this,t.browser,t.stg,t.cpps,!1,t.jrny,"Traditional",function(){t.tracker=new B(this.invite.template,t.surveydef,P,utils.getBrainStorage(t.browser,t.stg.uid),t.cpps,this.invite.display,t.browser),t.tracker.applyExisting(t.browser,i),t.surveydef.cxRecord&&R.rec&&R.rec.recorder&&R.rec.beginTransmitting()})}}},v.prototype.canDisplayInvitation=function(){return this.crit._match(this.cfg.config,this.browser,"inviteExclude")},v.prototype.popSurvey=function(e){if(this.stg.set("i","x"),R.state.inviteSituation="ACCEPTED",this.didPopTrackerAlready="y"==this.stg.get("tp"),R.state.didInvite=!0,this.didPopTrackerAlready)this.stg&&this.stg.get("page_hb")&&utils.getBrainStorage(this.browser,this.stg.uid).set("trackercmd",{method:"survey"},6e4,!0);else{this.stg.set("tp","y");var t=new l(P,this.cpps,this.surveydef,null,e).getUrl();n(t,"acsSurvey",{width:700,height:400},this.browser,!1,this.cfg.config.centerTrackerPopup)}},v.prototype.init=function(){var e,t,i,s=this.cfg.surveydefs,r=this.stg.get("def");for(e=0;e<s.length;e++)i=s[e],t&&(i=fs.ext(t,i),!s[e].site&&t.site&&delete i.site,!s[e].section&&t.section&&delete i.section,s[e]=i),t=fs.ext({},i);if(fs.isDefined(r)&&parseInt(r)>s.length-1&&(r=void 0),fs.isDefined(r)&&"default"!=s[parseInt(r)].selectMode&&"pin"!=s[parseInt(r)].selectMode){if(fs.isDefined(r)||"lock"==s[parseInt(r)].selectMode)return i=s[parseInt(r)],this.cfg.active_surveydef=i,this.surveydef=i,this.locale=this._initLocale(),this.cpps.set("locale",this.locale),i.section&&this.cpps.set("section",i.section),i}else for(e=0;e<(fs.isDefined(r)&&"default"!=s[parseInt(r)].selectMode?parseInt(r)+1:s.length);e++)if(i=s[e],fs.isDefined(r)&&r==e&&"default"!=s[parseInt(r)].selectMode||this.crit._match(i,this.browser))return"x"===this.stg.get("i")&&this.stg.set("def",e,this.cfg.config.surveyDefResetTimeout||864e5),i.index=e,this.cfg.active_surveydef=i,this.surveydef=i,this.locale=this._initLocale(),this.cpps.set("locale",this.locale),i.section&&this.cpps.set("section",i.section),this.inviteIndex=e,i;return!(!fs.isDefined(r)||!this.isTrackerAlive())&&(i=s[parseInt(r)],this.tracker=new B(null,i,this.cfg,utils.getBrainStorage(this.browser,this.stg.uid),this.cpps,null,this.browser),i)},v.prototype._initLocale=function(){var e,t=this.surveydef,i=t.language;if(fs.isDefined(i.src)&&fs.isDefined(i.locales)){switch(i.src){case"variable":fs.isDefined(i.name)&&(e=utils.retrieveNestedVariable(window,i.name));break;case"cookie":if(fs.isDefined(i.name))e=new utils.Cookie({}).get(i.name);break;case"url":var s=i.locales;if(fs.isDefined(s))for(var r=0,n=s.length;r<n;r++)if(fs.isDefined(s[r].locale)&&fs.isDefined(s[r].match)&&location.href.match(s[r].match))return this.locale=s[r].locale,s[r].criteria&&fs.ext(this.surveydef.criteria,s[r].criteria),this.locale!==t.language.locale&&(t.language.locale=this.locale),s[r].locale}if(e)for(var o=0;o<i.locales.length;o++)if(i.locales[o].match==e)return i.locale=i.locales[o].locale,i.locales[o].criteria&&fs.ext(this.surveydef.criteria,i.locales[o].criteria),i.locale}return i.locale||"en"},v.prototype.isTrackerAlive=function(){return fs.isDefined(this.stg.get("tracker_hb"))},v.prototype.cancelTracker=function(){utils.getBrainStorage(this.browser,this.stg.uid).set("trackercmd",{method:"close"},6e4,!0),this.stg.set("i","a"),R.state.inviteSituation="ABANDONED",fs.isDefined(this.tracker)&&clearInterval(this.tracker._heartbeat)},v.prototype.logState=function(){this.pageViewCount=(this.stg.get("pv")||0)+1,this.stg.set("pv",this.pageViewCount,P.config.pageViewsResetTimeout||864e5)},v.prototype.logDefState=function(){if(this.surveydef){var e=this.surveydef.name;e+=this.surveydef.section||"",e+=this.surveydef.site||"",this.defPageViewCount=(this.stg.get(e+"pv")||0)+1,this.stg.set(e+"pv",this.defPageViewCount,P.config.pageViewsResetTimeout||864e5)}},v.prototype.evalLoyaltySampling=function(e){var t=this.surveydef,i=t[e]||t.criteria,s=this.stg.get("pl"),r=fs.isDefined(s)&&1!=s?i.sp.outreplaypool||0:i.sp.reg||0,n=100*Math.random();return this.defPageViewCount>=i.lf&&n<=r},v.prototype.dispose=function(){this.disposed||(this.stg.save(!0),this.disposed=!0,this.invite&&this.invite.dispose(),delete R.inviteSetup,this.mouseoff&&this.mouseoff.dispose(),R.rec&&(R.RecordController.disposeInstance(),R.RecordController=null,R.rec=null),utils.Unbind("trigger:*"))};var m=function(e,t,i,s,r,n){this.itype=e,this.cfg=t,this.def=i,this.cpps=s,this.rid=r,this._measureName=this.def.name+"-"+(fs.isDefined(this.def.site)?this.def.site+"-":"")+(fs.isDefined(this.def.section)?this.def.section+"-":"")+(n||this.def.language.locale)};m.prototype.init=function(e,t){t=t||function(){};var i=new l(this.cfg,this.cpps,this.def,null).decideModernSurvey(),s=utils.now()+"_"+Math.round(1e13*Math.random()),r={a:s,notify:e,b:utils.hash(s),c:864e5,cid:this.cfg.config.id,sid:this._measureName,rid:this.rid,uid:utils.now(),support:"SMSEMAIL"==this.itype?"b":"EMAIL"==this.itype?"e":"s",cpps:"version="+encodeURIComponent(this.cfg.config.version)+"&"+this.cpps.toQueryString()};i.modernChosen&&(r=fs.ext({fs_renderer:"modern"},r)),f.ping(f.SERVICE_TYPES.mobileOnExitInitialize,r,t,t)},m.prototype.beginHeartbeat=function(){this._timer&&(clearTimeout(this._timer),this._timer=null);var e=function(){f.ping(f.SERVICE_TYPES.mobileOnExitHeartbeat,{cid:this.cfg.config.id,sid:this._measureName,rid:this.rid,uid:utils.now()},function(){},function(){})}.bind(this);this._timer=setInterval(e,P.config.onExitMobileHeartbeatInterval),e()},utils.registerProduct("foresee",P);var z=window!=M.top;if(R.loadedEmitter.fire(),("dontRunOtherIframes"!==P.config.workInIframes&&P.config.workInIframes||!z)&&!(M.__fsrtracker||-1<M.location.toString().indexOf("survey.foreseeresults.com"))){var y,b={hash:M.location.hash,href:M.location.href,pathname:M.location.pathname},w=function(){if(R._triggerResetLock=!0,-1<b.href.indexOf("fs.tracker.html"))R._triggerResetLock=!1;else{var x=new utils.Browser;x.ready.subscribe(function(){var E=utils.getGeneralStorage(x),T=new d(E,P),A=new utils.CPPS(E,P.config.cppsResetTimeout);A.set("url",M.location.toString()),E.ready.subscribe(function(){E.upgradeOldStorage(function(){R.pageLoadTime=utils.now()-fs.startTS,utils.initBehavioralData(fs.config.customerId||utils.getRootDomain()||"trigger_customerId",E,x,A);var e,t,i,s,r,I=R._journey=new utils.Journey({customerId:fs.config.customerId||utils.getRootDomain()||"trigger_customerId",appId:utils.APPID.TRIGGER,stg:E,browser:x,useSessionId:!0,usePopupId:!1});I.addEventsDefault("properties",{fs_site:[utils.getRootDomain()],fs_repeatDaysAccept:[P.config.repeatDays.accept],fs_repeatDaysDecline:[P.config.repeatDays.decline],fs_reinviteDelayAfterInviteAbandon:[P.config.reinviteDelayAfterInviteAbandon]}),e=E,t=T,i=A,s=I,r=x,fs.ext(R,{CPPS:i,crit:t,stg:e,jrny:s,browser:r},!1),h.fire();var D=E.get("i");setTimeout(function(){A.set("url",M.location.toString()),A.set("code",fs.config.codeVer),A.set("tz",-(new Date).getTimezoneOffset()),A.set("product_type","web sdk");var e,t=utils.getScreenResolution();if(A.set("device_width",t.w),A.set("device_height",t.h),A.set("dpr",window.devicePixelRatio||1),x.isMobile)A.set("window_width",t.w),A.set("window_height",t.h);else{var i=utils.getSize(window);A.set("window_width",i.w),A.set("window_height",i.h)}if(P.config.cpps){var s,r,n=P.config.cpps;for(var o in n){var a=n[o];if(fs.isObject(a))switch(a.source){case"param":var c=fs.getParam(a.val)||a.init||null;if(fs.isDefined(a.mode)&&"append"==a.mode){var f,l=a.delimiter||",",d=A.get(o),u=d?d.split(l):[];c=c||"",u[u.length-1]!==c&&(u.push(c),f=u.join(l),A.set(o,f))}else fs.isDefined(c)&&null!==c?A.set(o,c):A.get(o)||A.set(o,"");break;case"variable":var g;if(fs.isDefined(a.name))s=a.exists,g=utils.retrieveNestedVariable(M,a.name),fs.isDefined(s)?A.get(o)!==s.success&&A.set(o,g?s.success:s.init):g?A.set(o,g):A.get(o)||A.set(o,a.init||"");break;case"cookie":var h=L.get(a.val),p=fs.isDefined(h);s=a.exists,fs.isDefined(s)?A.get(o)!==s.success&&A.set(o,p?s.success:s.init):fs.isDefined(h)&&null!==h?A.set(o,h):A.get(o)||A.set(o,a.init||"");break;case"url":for(var v=0,m=a.patterns.length;v<m;v++){var y=a.patterns[v].regex||a.patterns[v].match;r=a.patterns[v].value,fs.isString(location.href)&&utils.testAgainstSearch(y,location.href)?A.set(o,r):A.get(o)||A.set(o,a.init||"")}break;case"function":if(fs.isFunction(a.value))try{r=a.value.call(M),A.set(o,r)}catch(e){}}else A.set(o,a)}}if(E.get("ovr")&&(e=JSON.parse(E.get("ovr"))),e){for(var b=0;b<P.surveydefs.length;b++){var w=P.surveydefs[b].name;e.sp[w]&&(P.surveydefs[b].criteria.sp=e.sp[w]),e.lf[w]&&(P.surveydefs[b].criteria.lf=e.lf[w])}!0===e.pooloverride&&(T.pooloverride=!0)}(R.state.codeVer=fs.config.codeVer,R.state.siteKey=P.config.site_key,R.state.didInvite=-1<"xda".indexOf(D),R.state.inviteSituation={x:"ACCEPTED",d:"DECLINED",a:"ABANDONED",p:"PRESENTED",f:"BRAINFAILED"}[D],"a"==D)&&(parseInt(E.get("rw"))<utils.now()&&(E.erase("i"),E.erase("rw"),D=R.state.didInvite=null));"f"==D&&(parseInt(E.get("fw"))<utils.now()&&(E.erase("f"),E.erase("fw"),D=R.state.didInvite=null));if("runRecordOnly"===P.config.workInIframes&&z){for(var S=!1,k=0;k<P.surveydefs.length;k++){if(P.surveydefs[k].cxRecord){S=!0;break}}return V(x,S,E,!0,A),void(R._triggerResetLock=!1)}if("d"!=D&&"a"!=D&&"f"!=D)T.calcReplayPoolStatus(function(s){s&&(R.state.isinpool=s),T.optoutCheck(function(){if(T._match(P.config,x,"globalExclude")&&"y"!=E.get("gx"))if(null===E.selectCookieDomain(fs.config.cookieDomain,window.location.toString()))R._triggerResetLock=!1;else{var i=R.trig=U(E,P,x,T,A,I);if(i.logState(),A.set("pv",i.pageViewCount,P.config.pageViewsResetTimeout||864e5),i.init())if(R.initializedEmitter.fire(),i.isTrackerAlive()||i.doesPassCriteria())if(i.surveydef){if(i.logDefState(),V(x,i.surveydef.cxRecord,E,s,A),"x"!=D)if(x.isMobile||x.isTablet||!i.surveydef.mouseoff||"off"===i.surveydef.mouseoff.mode||1!=E.get("pv")||E.set("sst",utils.now()),i.canDisplayInvitation())if(i.evalLoyaltySampling("criteria")){E.set("def",i.inviteIndex,i.cfg.config.surveyDefResetTimeout||864e5);O(i,x,E,A,!1,I,"Traditional",function(){this.initialize(),this.present()})}else E.get("sst")&&i.evalLoyaltySampling("mouseoff")?(E.set("def",i.inviteIndex,i.cfg.config.surveyDefResetTimeout||864e5),C([fs.makeURI("$fs.mouseoff.js")],function(e){R._triggerResetLock=!1;var t=i.mouseoff=new e(i,i.surveydef,x,E,I);t.initialize(),t.startListening(function(){this.inviteSetup=O(i,x,E,A,!1,I,"MouseOff",function(){this.initialize()})},function(){this.inviteSetup.present()})}.bind(this))):R._triggerResetLock=!1;else R._triggerResetLock=!1;else{var e=i.stg.get("mhbi");if(e)j(i,e.ui,e.it);else if(i.isTrackerAlive()){var t=N.getFittingDisplay(i.surveydef);"TRACKER"===t.inviteType&&(i.tracker=new B(t.template,i.surveydef,P,utils.getBrainStorage(x,E.uid),A,t,x))}R._triggerResetLock=!1}i.surveydef.links&&new F(i.surveydef.links).performBindings(i)}else R._triggerResetLock=!1;else R._triggerResetLock=!1;else R._triggerResetLock=!1}else E.set("gx","y"),R._triggerResetLock=!1}.bind(this),function(){R._triggerResetLock=!1})});else{if("a"==D){var _="true"==E.get("rc")||!0===E.get("rc");V(x,_,E,_,A)}R._triggerResetLock=!1}}.bind(this),Math.max(0,P.config.triggerDelay-(utils.now()-fs.startTS)))})}.bind(this),!0,!0)},!0,!0)}};fs.domReady(w),P.config.ignoreNavigationEvents||utils.pageNavEvent.subscribe(function(){var e=M,t=e.location,i=e[P.config.publicApiName||"FSR"],s=function(e){var t=e.split("#");return 2<t.length?t[0]+t[1]:e.replace(/#/gi,"")},r=s(b.hash),n=s(t.hash);(i&&r!=n||b.pathname!=t.pathname)&&fsReady(function(){clearTimeout(y),y=setTimeout(function(){b={hash:M.location.hash,href:M.location.href,pathname:M.location.pathname},i.pageReset()},1e3)})},!1,!1)}}});