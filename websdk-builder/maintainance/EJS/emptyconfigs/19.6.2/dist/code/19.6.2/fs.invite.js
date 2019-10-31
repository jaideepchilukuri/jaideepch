/***************************************
* @preserve
* ForeSee Web SDK: Invitation Presenter Plugin
* Built April 27, 19 21:50:58
* Code version: 19.6.2
* Template version: 19.6.2
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("$fs.utils.js"),"triggerconfig"],function(e,t,i,config){var s,n=function(e,t){var i;return i=new window.Function("obj","var p=[],print=function(){p.push.apply(p,arguments);};with(obj){p.push('"+e.replace(/[\r\t\n]/g," ").split("<%").join("\t").replace(/((^|%>)[^\t]*)'/g,"$1\r").replace(/\t=(.*?)%>/g,"',$1,'").split("\t").join("');").split("%>").join("p.push('").split("\r").join("\\'")+"');}return p.join('');"),t?i(t):i},a=function(config,e,n,a,o,l){this.cfg=config,this.def=t.ext({},e),this.displayoverride=a,this.brwsr=n,this._inviteEls=[],this.locale=o.get("locale")||"en",this.lastActiveEl=null,this.lastScroll=null,s=l,this.isCustom=s.customInvitationRequested.subscriptions.length>0;var c,r,d,u,p={},h={};if(this.inviteStage=0,this.declined=new i.FSEvent,this.declined.subscribe(t.proxy(function(){this._removeEls()},this)),this.abandoned=new i.FSEvent,this.abandoned.subscribe(t.proxy(function(){this._removeEls()},this)),this.accepted=new i.FSEvent,this.completed=new i.FSEvent,this.completed.subscribe(t.proxy(function(e){e&&this._removeEls()},this)),this.brwsr.isMobile&&this.def.display.mobile?(p={},h={},c=this.def.display.mobile):c=this.def.display.desktop,c)for(u=0;u<c.length;u++)h=p.dialog||{},p=t.ext({},p),p=t.ext(p,c[u]),c[u].dialog&&p.dialog&&(p.dialog=t.ext(t.ext({},h),c[u].dialog)),c[u]=p;if(this.displayoverride){for(u=0;u<c.length;u++)if(c[u].displayname==this.displayoverride){d=c[u];break}}else d=c[Math.round(999999999999*Math.random())%c.length];d.dialog.locales&&d.dialog.locales[this.locale]&&(r=d.dialog.locales[this.locale],d.dialog=t.ext(d.dialog,r),r.localeImages&&(d=t.ext(d,r.localeImages))),d=t.ext({inviteLogo:"",trackerLogo:"",siteLogoAlt:""},d),this.display=d,this.template=d.template};return a.prototype.loadResources=function(e){var s=this.display;if(this.isCustom)e.fire();else{var n=s.template,a=t.makeURI("$templates/trigger/"+n+"/"+(s.dialog.theme?s.dialog.theme:"main")+".css"),o=t.makeURI("$templates/trigger/"+n+"/invite.html"),l=!1,c=!1,r=function(){l&&c&&e&&e.fire()};0===n.indexOf("@")&&(n=n.substr(1),a=t.makeAssetURI("trigger/templates/"+n+"/"+(s.dialog.theme?s.dialog.theme:"main")+".css"),o=t.makeAssetURI("trigger/templates/"+n+"/invite.html")),i.loadCSS(a,t.proxy(function(e){l=!0,this._inviteEls.push(e),r()},this),null,this.brwsr);new i.JSONP({success:t.proxy(function(e){c=!0,this.invitetemplate=e,r()},this)}).get(o,"templates_trigger_"+n+"_")}},a.prototype._validateMobileInput=function(e){var s=document.getElementById("acsEmailSMSInput").value,n=function(e){return/^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i.test(e)},a=function(e){var t=e.replace(/[ -.\(\)]+/g,""),i=/^(\+44|44|0044|0)([1-9]\d{8,9})$/,s=t.match(i);if(s){return"+44"+s[2]}return null},o=function(e){e=e.split(" ").join("");var t=/^(\+1|1)?[-.]?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})$/;return e.match(t)&&e.length<=15||!!a(e)},l=function(){i.removeClass(document.getElementById("acsInvalidInput"),"acsNoDisplay"),document.getElementById("acsEmailSMSInput").focus()},c=function(){i.addClass(document.getElementById("acsInvalidInput"),"acsNoDisplay"),setTimeout(function(){e(a(s)||s)},250)};switch(e=e||function(){},this.display.inviteType){case"SMS":o(s)?c():l();break;case"EMAIL":n(s)?c():l();break;case"SMSEMAIL":"mobile"!==t.toLowerCase(this.template)?n(s)||o(s)?c():l():i.hasClass(document.getElementById("acsEmailSMSInput"),"acsSMSValue")?o(s)?c():l():n(s)?c():l()}},a.prototype._switchToMobileOnExitStageInvite=function(){var e=document,t=e.querySelector("#acsMainInvite"),s=e.querySelector("#acsOnExitMobileInvite"),n=e.querySelector("#acsFullScreenContainer");n&&(i.addClass(e.body,"acsFullScreen"),i.addClass(e.documentElement,"acsFullScreen"),i.addClass(n,"acsFullScreen"),i.addClass(s,"acsClassicInvite--fullscreen")),i.addClass(t,"acsNoDisplay"),i.removeClass(s,"acsNoDisplay"),n||e.querySelector("#acsEmailSMSInput").focus(),this.inviteStage+=1},a.prototype._switchToThankYouPage=function(){var e,s=document,n=s.getElementById("acsOnExitMobileInvite"),a=s.getElementById("acsOnExitThankYou"),o=s.getElementById("acsFullScreenContainer"),l=s.getElementsByClassName("acsDeclineButton"),c=1e3*Number(this.display.dialog.onexitcounterval)||8e3,r=t.proxy(function(e){i.preventDefault(e),this.completed.fire(!0)},this);if(o){for(var d=0;d<l.length;d++)i.Unbind(l[d],"invite:click"),i.Bind(l[d],"invite:click",r),i.removeClass(l[d],"acsDeclineButton");i.removeClass(o,"__acs__input-clicked"),i.addClass(n,"acsNoDisplay"),i.removeClass(a,"acsNoDisplay"),this.closeTimeOut=setTimeout(t.proxy(function(){this.completed.fire(!0)},this),c+1e3),this.counterInterval=setInterval(t.proxy(function(){var t=document.getElementsByClassName("counter");o&&t&&(e=Number(t[0].innerHTML),t[0].innerHTML=e-1,1===Number(e)&&i.addClass(o,"__acs--complete"))},this),1e3)}this.inviteStage+=1},a.prototype._handleAcceptCurrentStage=function(){var e=document.getElementById("acsFullScreenContainer");switch(this.display.inviteType){case"TRACKER":case"INSESSION":this.accepted.fire(this.display.inviteType),this.completed.fire(!0);break;case"SMS":case"EMAIL":case"SMSEMAIL":0===this.inviteStage?(this._switchToMobileOnExitStageInvite(),this._trapKeyBoardMobile(e)):1===this.inviteStage&&this._validateMobileInput(t.proxy(function(t){this.accepted.fire(this.display.inviteType,t),e&&this._switchToThankYouPage()},this))}},a.prototype._removeEls=function(){for(clearTimeout(this.closeTimeOut),clearInterval(this.counterInterval),i.removeClass(document.body,"acsFullScreen"),i.removeClass(document.documentElement,"acsFullScreen");this._inviteEls.length>0;){var e=this._inviteEls.pop();e.parentNode.removeChild(e)}i.Unbind("invite:*")},a.prototype._trapKeyBoard=function(e,t){i.Bind(document.body,"invite:focus",function(i){i=i||window.event;var s=i.target||i.srcElement;t.contains(s)||e||t&&(i.stopPropagation(),t.focus())},!1)},a.prototype._trapKeyBoardMobile=function(e,t,s){var n,a,o;0===this.inviteStage?(a=document.getElementById("acsinviteCloseButton"),n=function(i){return!(!(o=e.getAttribute("data-trapkeyboard"))||"false"==o)&&(!t.contains(i)&&!a.contains(i)||!e)}):1===this.inviteStage&&(i.Unbind(document.body,"invite:focus"),t=document.getElementById("acsFullScreenContainer"),s=document.getElementById("acsFirstFocus"),n=function(i){return!t.contains(i)||!e}),i.Bind(document.body,"invite:focus",function(e){var t;e=e||window.event,t=e.target||e.srcElement,n(t)&&s&&(e.stopPropagation(),s.focus())},!1)},a.prototype.present=function(){if(this.lastActiveEl||(this.lastActiveEl=document.activeElement,this.lastScroll={x:window.scrollX,y:window.scrollY}),this.isCustom)this.inviteStage=1,s.customInvitationRequested.fire(this.display.inviteType,t.proxy(function(e){this.accepted.fire(this.display.inviteType,e),this.completed.fire(!0)},this),t.proxy(function(){this.declined.fire()},this),t.proxy(function(){this.abandoned.fire()},this));else{this.display.inviteType=this.display.inviteType.toUpperCase();var e=t.ext({supportsSVG:this.brwsr.supportsSVG},this.display,this.cfg.config);e.inviteLogo&&e.inviteLogo.length>0&&(e.inviteLogo=t.makeAssetURI("trigger/"+e.inviteLogo)),e.trackerLogo&&e.trackerLogo.length>0&&(e.trackerLogo=t.makeAssetURI("trigger/"+e.trackerLogo)),e.vendorLogo&&e.vendorLogo.length>0&&(e.vendorLogo=t.makeURI("$"+e.vendorLogo)),e.vendorLogoPNG&&e.vendorLogoPNG.length>0&&(e.vendorLogoPNG=t.makeURI("$"+e.vendorLogoPNG)),e.trusteLogo&&e.trusteLogo.length>0&&(e.trusteLogo=t.makeURI("$"+e.trusteLogo));var a=n(this.invitetemplate,e),o=document.createElement("div");o.innerHTML=a;for(var l=0;l<o.childNodes.length;l++)this._inviteEls.push(o.childNodes[l]),document.body.appendChild(o.childNodes[l]);var c=document.getElementById("acsEmailSMSInput"),r=function(e){var t;if(e){if(i.hasClass(e,"acsClassicInvite--placeholder"))return e;for(var s=e.parentNode.childNodes,n=0;n<s.length;n++)if(i.hasClass(s[n],"acsClassicInvite--placeholder")){t=s[n];break}if(!t)for(var a=e.childNodes,o=0;o<a.length;o++)if(i.hasClass(a[o],"acsClassicInvite--placeholder")){t=a[o];break}}return t},d=document.getElementById("acsMainInvite"),u=document.getElementById("acsFullScreenContainer");if(this.brwsr.isMobile){var p=document.getElementById("acsFocusFirst");p.focus(),this._trapKeyBoardMobile(u,d,p)}else d.focus(),this._trapKeyBoard(u,d);for(var h=document.querySelectorAll(".acsDeclineButton"),m=t.proxy(function(e){i.preventDefault(e),this.declined.fire("INVITE_DECLINED_BTN")},this),v=0;v<h.length;v++)i.Bind(h[v],"invite:click",m);for(var g=document.querySelectorAll(".acsAcceptButton"),y=document.getElementsByClassName("acsSubmitBtn"),f=document.getElementsByClassName("acsClassicInvite--fullscreen__container"),I=document.getElementsByClassName("acsClassicInner--description"),C=document.getElementsByClassName("acsClassingInner--policyLink"),E=t.proxy(function(e){var t=e.target||e.srcElement;if(u){i.addClass(f[0],"acsClassicInvite--fullscreen__input-clicked");var s=r(t);s&&i.addClass(s,"acsClassicInvite--placeholder__clicked"),i.addClass(u,"__acs__input-clicked")}},this),S=t.proxy(function(e){var t=e.target||e.srcElement,s=t.value.replace(/\s/g,""),n=e.keyCode||e.which;s.length>0&&27!==n&&i.hasClass(y[0],"acsClassicInner--btn__grey")&&i.removeClass(y[0],"acsClassicInner--btn__grey")},this),b=t.proxy(function(e){i.preventDefault(e);var t=e.target||e.srcElement;if(i.hasClass(t,"acsEmailInput")||i.hasClass(t.parentNode,"acsEmailInput")){var s=document.getElementsByClassName("acsClassicInvite--placeholder")[0];s&&(s.innerHTML=this.display.dialog.emailPlaceholder||""),c.type="email",i.hasClass(c,"acsClassicInvite__input--spaced")&&i.removeClass(c,"acsClassicInvite__input--spaced"),i.hasClass(c,"acsSMSValue")&&(i.removeClass(c,"acsSMSValue"),i.addClass(c,"acsEmailValue")),document.getElementById("acsInvalidInput").innerHTML=this.display.dialog.emailInvalidation||"",this.display.dialog.emailDisclaimer?I[0].innerHTML=this.display.dialog.emailDisclaimer:I[0]&&i.addClass(I[0],"acsNoDisplay"),i.addClass(C[0],"acsNoDisplay"),i.removeClass(C[1],"acsNoDisplay")}i.hasClass(t,"acsClassicInner--btn__grey")||this._handleAcceptCurrentStage()},this),_=0;_<g.length;_++)i.Bind(g[_],"invite:click",b);u&&(i.Bind(c,"invite:focus",E),i.Bind(c,"invite:keydown",S)),this.__kpEscape=t.proxy(function(e){27==e.keyCode&&(i.preventDefault(e),this.declined.fire("INVITE_DECLINED_ESC"))},this),i.Bind(document.body,"invite:keydown",this.__kpEscape);for(var B=document.querySelectorAll(".acsAbandonButton"),k=t.proxy(function(t){for(var s=t.target||t.srcElement,n=!1;s;){if(s.tagName&&"A"==s.tagName&&i.hasClass(s,"acsAllowDefault")){n=!0;break}s=s.parentNode}n||i.preventDefault(t);var a=t.target||t.srcElement;i.hasClass(a,"acsAbandonButton")&&("true"!=a.getAttribute("data-isbackdrop")||e.closeClickOnBackdrop)&&this.abandoned.fire()},this),N=0;N<B.length;N++)i.Bind(B[N],"invite:click",k)}s._triggerResetLock=!1},a.prototype.dispose=function(){this.disposed||(this.disposed=!0,this._removeEls(),i.Unbind("invite:*"),this.restoreUserFocus(),this.restoreUserScroll())},a.prototype.restoreUserFocus=function(){null!==this.lastActiveEl?this.lastActiveEl.focus():document.body.focus()},a.prototype.restoreUserScroll=function(){this.lastScroll&&window.scroll(this.lastScroll.x,this.lastScroll.y)},a});