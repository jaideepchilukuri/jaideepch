/***************************************
* @preserve
* ForeSee Web SDK: Survey
* Built April 28, 19 00:16:39
* Code version: 19.8.1
* Template version: 19.8.1
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("$fs.utils.js")],function(t,fs,utils){var s={unavailable:"<p>Feedback isn't available right now.</p><p>Please check back later.</p>",expired:"<p>This is an expired survey!</p>",submittext:"Submit",ext:{feedback_choose_topic_text:"Choose a topic",feedback_default_dropdown_text:"Choose..",feedback_ok_button_text:"OK",feedback_required_field_error_text:"Please fill in the required fields.",feedback_survey_closed_header_text:"Survey has closed"}},n={remove:function(){this.parentNode&&this.parentNode.removeChild(this)},hasClass:function(t){return-1<this.className.indexOf(t)},addClass:function(t){this.hasClass(t)||(this.className+=" "+t)},removeClass:function(t){this.className=(this.className||"").replace(t,"")},$:function(t){return this.querySelectorAll(t)},css:function(t){for(var e in t)t.hasOwnProperty(e)&&(this.style[e]=t[e])}},b=function(t){if("string"==typeof t&&-1==t.indexOf("<"))return document.querySelectorAll(t);if("string"==typeof t){var e=document.createElement("div");e.innerHTML=t,t=e.firstChild}for(var i in n)n.hasOwnProperty(i)&&(t[i]=n[i]);return t},q={questionType:{RADIO:3,TEXTAREA:1,SELECT:2,STAR:4,CHECKBOX:5}};SurveyQuestion=function(){},SurveyQuestion.prototype.initQuestion=function(t,e){if(this.qs=t,this.cfg=e,this.cfg.isPersistent=!!b(this.qs).hasClass("acs-persistent__block"),this.cfg.isVisible=!!this.cfg.isPersistent,this.cfg.isRequired="1"===e.r||this.cfg.isPersistent&&this.cfg.qt==q.questionType.STAR,this.cfg.rules_info&&0<this.cfg.rules_info.length){var i=this.cfg.rules_info.replace(/&amp;/g,"&");i=i.replace(/&quot;/g,'"'),this.cfg.rules=JSON.parse(i)}else this.cfg.rules=[];this.answer=null,this.stateChanged=new utils.FSEvent},SurveyQuestion.prototype.hide=function(){this.cfg.isVisible=!1,this.cfg.isPersistent||b(this.qs).addClass("acs-feedback__block--hidden")},SurveyQuestion.prototype.show=function(){this.cfg.isVisible=!0,this.cfg.isPersistent||b(this.qs).removeClass("acs-feedback__block--hidden")},SurveyQuestion.prototype.getQuestion=function(t,e){var i;return e.qt==q.questionType.TEXTAREA&&2==e.dt?(i=new q.TextAreaQuestion).initTextArea(t,e):e.qt==q.questionType.TEXTAREA&&1==e.dt?(i=new q.InputTextQuestion).initInputText(t,e):e.qt==q.questionType.SELECT?(i=new q.SelectQuestion).initSelect(t,e):e.qt==q.questionType.RADIO?(i=new q.RadioQuestion).initRadio(t,e):e.qt==q.questionType.STAR?(i=new q.StarQuestion).initStarRating(t,e):e.qt==q.questionType.CHECKBOX&&(i=new q.CheckBoxQuestion).initCheckBox(t,e),i||null},SurveyQuestion.prototype.validate=function(){var t=!0;return this.cfg.isVisible&&(this.cfg.isRequired&&(t=null!==this.answer&&0<this.answer.length),t?b(this.qs).removeClass("acs-feedback__block--invalid"):b(this.qs).addClass("acs-feedback__block--invalid")),t},SurveyQuestion.prototype.getAnswer=function(){return!(!this.cfg.isVisible||!this.answer||null===this.answer)&&{questionId:this.cfg.id,answerId:this.answer}},q.SelectQuestion=function(){},q.SelectQuestion.prototype=new SurveyQuestion,q.SelectQuestion.prototype.initSelect=function(t,e){this.initQuestion(t,e);var n,a=this,i=b(this.qs),s=i.$("select")[0],r=i.$("div.acs-feedback__select")[0];b(s).css({height:(r.offsetHeight||38)+"px"}),utils.Bind(s,"feedback:change",(n=s,function(t){for(var e=b(n).$("option"),i=b(n).$("option")[n.selectedIndex],s=0;s<e.length;s++)i===e[s]?i.setAttribute("selected","selected"):e[s].getAttribute("selected")&&e[s].removeAttribute("selected");a.answer=-1<fs.toLowerCase(i.value).indexOf("choose")?null:i.value,a.validate(),a.stateChanged.fire(a.cfg.id),t.preventDefault(),t.target.blur()}),!1)},q.SelectQuestion.prototype.updateSelects=function(){var t=b(this.qs),e=t.$("select")[0],i=t.$("div.acs-feedback__select")[0];0<t.offsetHeight&&b(e).css({height:(i.offsetHeight||38)+"px"})},q.SelectQuestion.prototype.checkRule=function(t){return null!==this.answer&&this.answer.length&&this.answer==t.answer},q.StarQuestion=function(){},q.StarQuestion.prototype=new SurveyQuestion,q.StarQuestion.prototype._getRating=function(){return this.score},q.StarQuestion.prototype.initStarRating=function(t,e){this.initQuestion(t,e);var a=this,i=function(t,n){return function(t){for(var e=!1,i=t.srcElement||t.target,s=0;s<n.length;s++)e?utils.removeClass(n[s],"_acsHover"):e||utils.addClass(n[s],"_acsHover"),n[s]==i&&(e=!0)}};this.score=-1;var s,n=b(this.qs),r=n.$("input"),o=n.getElementsByClassName("star-rating")[0]||n.getElementsByTagName("fieldset"),c=o.children;utils.Bind(n,"feedback:mouseleave",(s=c,function(){for(var t=0;t<s.length;t++)utils.removeClass(s[t],"_acsHover")}));for(var u=0;u<c.length;u++)utils.Bind(c[u],"feedback:mouseenter",i(0,c));var h,l,d=(h=n,l=c,function(t){for(var e=!1,i=function(){h.removeClass("_acsRatingSet")},s=t.srcElement||t.originalTarget,n=0;n<l.length;n++)e?(utils.removeClass(l[n],"star-rating__star--fill"),l[n].setAttribute("aria-checked","false")):e||(a.score=n+1,utils.addClass(l[n],"star-rating__star--fill"),l[n].setAttribute("aria-checked","true")),l[n]!=s&&r[n]!=s||(e=!0,r[n].checked=!0,a.answer=r[n].value,a.stateChanged.fire(a.cfg.id),a.validate()),utils.addClass(h,"_acsRatingSet"),fs.nextTick(i)});utils.Bind(o,"feedback:change",function(t){"input"===t.target.tagName.toLowerCase()?d(t):t.stopPropagation()},!0),utils.Bind(o,"feedback:click",function(t){"label"===t.target.tagName.toLowerCase()?d(t):t.stopPropagation()},!0),utils.Bind(o,"feedback:mousedown",function(t){t.preventDefault(),t.target.blur()},!0),utils.Bind(o,"feedback:keydown",function(t){t.target.tagName;var e=utils.getKeyCode(t);t.stopPropagation(),"enter"!==e&&" "!==e&&"spacebar"!==e||(t.preventDefault(),d(t))})},q.StarQuestion.prototype.checkRule=function(t){var e=!1;if(null!==this.answer&&0<this.answer.length)switch(t.operator){case"equals":e=this.answer==t.answer;break;case"lt":e=this.answer<t.answer;break;case"gt":e=this.answer>t.answer}return e},q.CheckBoxQuestion=function(){},q.CheckBoxQuestion.prototype=new SurveyQuestion,q.CheckBoxQuestion.prototype.initCheckBox=function(t,e){this.initQuestion(t,e);var u,h=this,i=b(this.qs),s=i.$("input[type=checkbox]"),n=(u=i,function(t){t&&t.stopPropagation();for(var e=u.$("label"),i=0;i<e.length;i++){var s=b(e[i]),n=s.$("input[type=checkbox]")[0];if(n){if(n.checked)if(s.setAttribute("aria-checked","true"),s.addClass("acsChecked"),null===h.answer)h.answer=[n.getAttribute("questionid")];else{for(var a=!1,r=0;r<h.answer.length;r++)if(h.answer[r]==n.getAttribute("questionid")){a=!0;break}a||(h.answer.push(n.getAttribute("questionid")),a=!1)}else if(s.setAttribute("aria-checked","false"),s.removeClass("acsChecked"),h.answer){for(var o,c=0;c<h.answer.length;c++)if(h.answer[c]==n.getAttribute("questionid")){o=c;break}0<=o&&h.answer.splice(o,1)}h.validate(),h.stateChanged.fire(h.cfg.id)}}});utils.Bind(i,"feedback:keydown",function(t){t.stopPropagation();var e=utils.getKeyCode(t);if("enter"===e||" "===e||"spacebar"===e){t.preventDefault();for(var i=0;i<s.length;i++)t.target.control!==s[i]&&t.target.firstElementChild!==s[i]||(s[i].checked=!s[i].checked,s[i].setAttribute("checked",s[i].checked));n()}}),utils.Bind(i,"feedback:change",n),utils.Bind(i,"feedback:mousedown",function(t){t.preventDefault(),t.target.blur()},!0),utils.Bind(i,"feedback:click",function(t){t.stopPropagation()})},q.CheckBoxQuestion.prototype.checkRule=function(t){if(null!==this.answer&&0<this.answer.length)for(var e=0;e<this.answer.length;e++)if(this.answer[e]==t.answer)return!0;return!1},q.CheckBoxQuestion.prototype.getAnswer=function(){if(this.cfg.isVisible&&null!==this.answer&&0<this.answer.length){for(var t=[],e=0;e<this.answer.length;e++)t.push({questionId:this.cfg.id,answerId:this.answer[e]});return t}return!1},q.InputTextQuestion=function(){},q.InputTextQuestion.prototype=new SurveyQuestion,q.InputTextQuestion.prototype.initInputText=function(t,e){this.initQuestion(t,e);var i=this.qs.$("input")[0];this.maxlen=parseInt(i.getAttribute("acsmaxlength"),10);var n,s=this,a=(this.maxlen,function(t){t.stopPropagation();var e=t.target||t.srcElement;s.answer=e.value,s.validate(),s.stateChanged.fire(s.cfg.id)}),r=(n=this.maxlen,function(t){t.stopPropagation();var e=(t.target||t.srcElement).value.replace(/\s+/g," ").length,i=n-e-1,s=t.keyCode;if(i<0&&8!=s&&16!=s&&!(37<=s&&s<=41))return t.preventDefault(),!1});/^[0-9]+$/.test(i.getAttribute("acsmaxlength"))&&(utils.Bind(i,"feedback:keydown",r),utils.Bind(i,"feedback:keyup",a),utils.Bind(i,"feedback:keypress",function(t){t.stopPropagation()}))},q.InputTextQuestion.prototype.checkRule=function(t){var e=!1;if(null!==this.answer&&0<this.answer.length){var i=utils.decodeHTMLEntities(t.answer);switch(t.operator){case"equals":e=i==this.answer;break;case"contains":e=-1<fs.toLowerCase(this.answer).indexOf(fs.toLowerCase(i))}}return e},q.InputTextQuestion.prototype.getAnswer=function(){if(this.cfg.isVisible&&null!==this.answer&&0<this.answer.length){var t=this.answer.replace(/\s+/g," ");return" "!=t&&{questionId:this.cfg.id,answerText:e.cleanUpText(t,this.maxlen)}}return!1};var e=function(){};e.cleanUpText=function(e,t){if(0===t)return"";if(t<9)return e;if(9<e.length){var i={phone:/\b(?:(?:\(\d{3}\)?)|(?:\d{3}))[ -./\\]?\d{3}[ -./\\]?\d{4}\b/g},s={electron:/\b(4026|417500|4405|4508|4844|4913|4917)[ -./\\]?\d{4}[ -./\\]?\d{4}\d{3,4}\b/g,maestro:/\b(?:5[0678]\d\d|6304|6390|67\d\d)[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?(?:\d{4})?[ -./\\]?(?:\d{1,3})?\b/g,dankort:/\b(5019)[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}\b/g,instaPayment:/\b(637|638|639)[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{1}\b/g,visa:/\b4\d{3}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{1,4}\b/g,mastercard:/\b5[1-5]\d{2}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}\b/g,amex:/\b3[47]\d{2}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{3}\b/g,diners:/\b3(?:0[0-5]|[68]\d)\d{1}[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{2}\b/g,discover:/\b6(?:011|5\d{2}|22[19]|4[56789]\d{1})[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}\b/g,jcb:/\b(?:2131|1800|35\d[28-89])[ -./\\]?\d{4}[ -./\\]?\d{4}[ -./\\]?\d{4}\b/g,ssn:/\b\d{3}[ -./\\]?\d{2}[ -./\\]?\d{4}\b/g},n=[];for(var a in i)e=e.replace(i[a],function(t,e){return this.push({i:e,m:t}),""}.bind(n));var r=function(t){return new Array(t.length+1).join("X")};for(var o in s)e=e.replace(s[o],r);n.forEach(function(t){e=e.slice(0,t.i)+t.m+e.slice(t.i)})}return t&&e.length>=this.maxlen&&(e=e.substr(0,this.maxlen-1)),e},q.TextAreaQuestion=function(){},q.TextAreaQuestion.prototype=new SurveyQuestion,q.TextAreaQuestion.prototype.initTextArea=function(t,e){this.initQuestion(t,e);var i=this.qs.$("textarea")[0];this.maxlen=parseInt(i.getAttribute("acsmaxlength"),10);var n,r,o=this,s=(r=this.maxlen,function(t){t.stopPropagation();var e=t.target||t.srcElement,i=e.value.replace(/\s+/g," ").length,s=r-i,n=b(e.parentNode).$(".acs-feedback__textarea--count")[0],a=Math.max(0,s);if(n.innerHTML=a,e.setAttribute("title",a+" characters remaining"),s<0)return e.value=e.value.substr(0,e.value.length+s),!1;o.answer=e.value,o.validate(),o.stateChanged.fire(o.cfg.id)}),a=(n=this.maxlen,function(t){t.stopPropagation();var e=(t.target||t.srcElement).value.replace(/\s+/g," ").length,i=n-e-1,s=t.keyCode;if(i<0&&8!=s&&16!=s&&!(37<=s&&s<=41))return t.preventDefault(),!1});/^[0-9]+$/.test(i.getAttribute("acsmaxlength"))&&(utils.Bind(i,"feedback:keydown",a),utils.Bind(i,"feedback:keyup",s),utils.Bind(i,"feedback:keypress",function(t){t.stopPropagation()}))},q.TextAreaQuestion.prototype.checkRule=function(t){var e=!1;if(null!==this.answer&&0<this.answer.length){var i=utils.decodeHTMLEntities(t.answer);switch(t.operator){case"equals":e=t.answer==this.answer;break;case"contains":e=-1<fs.toLowerCase(this.answer).indexOf(fs.toLowerCase(i))}}return e},q.TextAreaQuestion.prototype.getAnswer=function(){if(this.cfg.isVisible&&null!==this.answer&&0<this.answer.length){var t=this.answer.replace(/\s+/g," ");return" "!=t&&{questionId:this.cfg.id,answerText:e.cleanUpText(t)}}return!1},q.RadioQuestion=function(){},q.RadioQuestion.prototype=new SurveyQuestion,q.RadioQuestion.prototype.initRadio=function(t,e){this.initQuestion(t,e);var a,r=this,i=b(this.qs),u=i.$("input[type=radio]"),s=i.$("label"),n=function(t){t.stopPropagation()},h=(a=i,function(t){for(var e=a.$("label"),i=0;i<e.length;i++){var s=b(e[i]),n=s.$("input[type=radio]")[0];n&&(n.checked||n===t?(s.addClass("acsChecked"),s.setAttribute("aria-checked","true"),r.answer=[{answerId:n.value,answerText:n.getAttribute("label"),questionId:r.cfg.id}]):(s.removeClass("acsChecked"),s.setAttribute("aria-checked","false")),r.validate(),r.stateChanged.fire(r.cfg.id))}});utils.Bind(i,"feedback:keydown",function(t){var e,i=utils.getKeyCode(t);if(t.stopPropagation(),"enter"===i||" "===i||"spacebar"===i){t.preventDefault();for(var s=0;s<u.length;s++)t.target.control===u[s]||t.target.firstElementChild===u[s]?(u[s].checked=!0,u[s].setAttribute("checked",!0),e=u[s]):u[s].checked=!1;h(e)}else if("arrowleft"===i||"arrowright"===i)for(var n,a=t.target,r=t.target.parentNode.children,o=r.length-1,c=0;c<=o&&!n;c++)r[c]===a&&r[n="arrowright"===i?o<c+1?0:c+1:c-1<0?o:c-1].focus()}),utils.Bind(i,"feedback:change",h),utils.Bind(i,"feedback:mousedown",function(t){t.preventDefault(),t.target.blur()},!0);for(var o=0;o<s.length;o++)utils.Bind(s[o],"feedback:click",n)},q.RadioQuestion.prototype.checkRule=function(t){return null!==this.answer&&this.answer[0].answerId==t.answer},q.RadioQuestion.prototype.getAnswer=function(){return!!(this.cfg.isVisible&&null!==this.answer&&0<this.answer.length)&&this.answer[0]};var m=function(t){var e,i=window._acsURL||window.location.toString();function s(t){if(!Array.isArray(t))return!1;for(e=0;e<t.length;e++)if(utils.testAgainstSearch(t[e],i))return!0;return!1}return i=fs.toLowerCase(i),(!t.whitelistActive||s(t.whitelistData))&&(!t.blacklistActive||!s(t.blacklistData))},i=function(t,e,i){this.cfg=t,this.data=null,this.cpps=e,this.browser=i,this.qs=[],this._topic=!1,this.SurveyUIUpdated=new utils.FSEvent,this.SubmitClicked=new utils.FSEvent,this.SurveyData=new utils.FSEvent,this.defaultCfg=s,this.SurveyData.subscribe(function(t,e){this.data=this._transpileJSONDef(JSON.parse(t)),this.data.meta.privacyurl=this.cfg.privacyuri||this.cfg.privacyuri,this.data.meta.privacytext=this.data.meta.privacytext||this.cfg.privacytext,this.data.ext=fs.ext({},this.defaultCfg.ext,this.data.ext),this.data.meta.unavailable=this.data.meta.unavailable||this.defaultCfg.unavailable,this.data.meta.expired=this.data.meta.expired||this.defaultCfg.expired,this.data.meta.submittext=this.data.meta.submittext||this.defaultCfg.submittext;var i=this,s=this.data.meta,n=!!s.logo2graphic,a=!!s.logo1graphic,r=!1,o=!1,c=function(){e&&e(i.data)};n||a?(n&&utils.imgInfo(s.logo2graphic,function(t,e){r=!0,(!a||a&&o)&&c()}),a&&utils.imgInfo(s.logo1graphic,function(t,e){o=!0,(!n||n&&r)&&c()})):c()}.bind(this),!0,!0)};return i.prototype._transpileJSONDef=function(t){var e,i,s,n,a=t.survey.content.main,r=a.cq,o=a.ca,c=a.ncq,u={meta:t.survey.content.meta.info,ext:t.survey.content.meta["ext-info"],notopic:[],topics:[]},h=/&amp;/gi,l=/&lt;/gi,d=/&gt;/gi,f=/&quot;/gi,p=/&nbsp;/gi,g={};if(c&&"string"!=typeof c||(c={qstn:[]}),c.qstn&&void 0===c.qstn.length&&(c.qstn=[c.qstn]),!this.cfg.autowhitelist&&0<this.cfg.topics.length){window._acsURL=fs.getParam("fsUrl");for(var v=0;v<this.cfg.topics.length;v++){var b=this.cfg.topics[v];m(b)&&(g[b.answerId]=!0)}}function w(t,e){for(var i=0;i<e.length;i++){var s=e[i];if(t[s]){for(var n=t[s];-1<n.indexOf("&amp;");)n=n.replace(h,"&");t[s]=n.replace(l,"<").replace(d,">").replace(f,'"').replace(p," ")}}}for(w(u.meta,["epiloguetext","prologuetext"]),e=0;e<r.qstn.length;e++)for(w(s=r.qstn[e],["txt","lbl"]),u.notopic.push(s),s.answers=[],i=0;i<o.ans.length;i++)(n=o.ans[i]).qid==s.id&&(u.topics.push(n),s.answers.push(n));for(e=0;e<c.qstn.length;e++)for(w(s=c.qstn[e],["txt","lbl"]),s.answers=[],i=0;i<o.ans.length;i++)(n=o.ans[i]).qid==s.id&&s.answers.push(n);if(!this.cfg.autowhitelist&&0<this.cfg.topics.length){for(i=0;i<u.topics.length;i++)g[u.topics[i].id]||u.topics.splice(i--,1);for(i=0;i<u.notopic.length;i++)if(u.notopic[i].qt==q.questionType.SELECT)for(e=0;e<u.notopic[i].answers.length;e++)g[u.notopic[i].answers[e].id]||u.notopic[i].answers.splice(e--,1)}for(e=0;e<u.topics.length;e++){var y=u.topics[e];if(y.questions=[],c.qstn)for(i=0;i<c.qstn.length;i++)c.qstn[i].aid==y.id&&(w(c.qstn[i],["txt","lbl"]),y.questions.push(c.qstn[i]))}var k=[];for(e=0;e<u.notopic.length;e++)u.notopic[e].qt==q.questionType.SELECT&&(k=u.notopic[e].answers);return u.vistopics=k,u.ncq=c,u},i.prototype._getScore=function(){var t=this.qs;return t[0]._getRating?t[0]._getRating():0},i.prototype._serialize=function(){var t,e,i={mid:this.cfg.mid,url:-1<window.location.toString().indexOf("&fsUrl")?fs.getParam("fsUrl"):window.location.toString(),responses:[]},s=i.responses,n=this.qs;if(1==this.data.vistopics.length)for(var a=0;a<this.data.notopic.length;a++){var r=this.data.notopic[a];if(r.qt==q.questionType.SELECT){s.push({questionId:r.id,answerId:r.answers[0].id});break}}for(var o=0;o<n.length;o++){var c=n[o].cfg.id,u=n[o].cfg.qt;if(c){var h=n[o].getAnswer();h&&(h&&u==q.questionType.CHECKBOX?s.push.apply(s,h):s.push(h))}}for(var l in t=this.cpps.all())s.push({questionId:l,answerText:t[l]});return this.cfg.version&&(i.version=this.cfg.version),!0===this.cfg.replay&&void 0!==this.cfg.record&&void 0!==this.cfg.record.recorder&&null!==this.cfg.record.recorder&&(i.globalId=this.cfg.record.recorder.getGlobalId(),i.sessionId=""),(e=window.location.href.match(/cxrid=([\d\w]*)&/))&&e[1]&&(i.globalId=e[1],i.sessionId=""),i=JSON.stringify(i)},i.prototype._getQConfig=function(t){var e,i,s=this.data.notopic;for(e=0;e<s.length;e++)if(t==s[e].id)return s[e];for(s=this.data.ncq.qstn,i=0;i<s.length;i++)if(t==s[i].id)return s[i]},i.prototype._getQObject=function(t){if(0<this.qs.length&&t)for(var e=0;e<this.qs.length;e++)if(this.qs[e].cfg.id==t)return this.qs[e];return!1},i.prototype._renderSurvey=function(t){var e,i=this._getQObject(t);if(i&&(e=this._checkTopicChange(i.getAnswer())),e){this._runSkipLogic(this.data.vistopics[e-1].questions);for(var s=0;s<this.data.vistopics.length;s++)if(s!==e-1)for(var n=this.data.vistopics[s].questions,a=0;a<n.length;a++){this._getQObject(n[a].id).hide()}}else for(var r=0;r<this.data.vistopics.length;r++){var o=this._checkWhatTopic(t);if(o)this._runSkipLogic(this.data.vistopics[o-1].questions);else if(this._topic)for(var c=0;c<this.data.vistopics.length;c++)this.data.vistopics[c].id==this._topic&&this._runSkipLogic(this.data.vistopics[c].questions)}},i.prototype._checkTopicChange=function(t){var e=t.answerId;if("string"!=typeof e)return!1;for(var i=0;i<this.data.vistopics.length;i++)if(this.data.vistopics[i].id==e)return i+1;return!1},i.prototype._checkWhatTopic=function(t){for(var e=0;e<this.data.vistopics.length;e++)for(var i=this.data.vistopics[e].questions,s=0;s<i.length;s++)if(i[s].id==t)return e+1;return!1},i.prototype._runSkipLogic=function(t){Array.isArray(t)||(t=[t]);for(var e=0;e<t.length;e++){var i=this._getQObject(t[e].id),s=i.cfg.rules,n=!1;if(0<s.length)for(var a=0;a<s.length;a++){var r=this._getQObject(s[a].question);r&&(n=n||r.checkRule(s[a])&&!!r.cfg.isVisible)}else n=!0;n?i.show():i.hide()}},i.prototype._validateSurvey=function(){var t,e,i=!0;if(this.qs&&0<this.qs.length)for(var s=this.qs.length-1;0<=s;s--)e=this.qs[s].qs,this.qs[s].validate()?(e.setAttribute("aria-invalid","false"),e.getAttribute("aria-label")&&e.removeAttribute("aria-label")):(i=i&&!1,e.setAttribute("aria-invalid","true"),t||(t=this.qs[s].qs).setAttribute("tabindex","0"),e.setAttribute("aria-label","The submission for this section is invalid"));return t&&t.focus(),this._validationStatus(!i),i},i.prototype.bind=function(s){var n=this;n.submitted=!1;for(var t=(s=b(s)).$(".acs-feedback__block"),e=new SurveyQuestion,i=0;i<t.length;i++){var a=this._getQConfig(t[i].getAttribute("questionid"));if(a){var r=e.getQuestion(t[i],a);this.qs.push(r),this.qs[this.qs.length-1].stateChanged.subscribe(this._renderSurvey.bind(this),!1,!0)}}var o=function(){for(var t=0;t<this.qs.length;t++)this.qs[t].cfg.qt==q.questionType.SELECT&&this.qs[t].updateSelects()}.bind(this);this.SurveyUIUpdated.subscribe(function(){setTimeout(o,100)});for(var c=(n.$el=s).$(".acs-headingzone h1"),u=0;u<c.length;u++)b(c[u]).addClass("acs-feedback__heading acs-feedback__heading--h1");var h=s.$(".acs-topic__selector")[0],l=function(t){for(var e=s.$(".acs-feedback__topic"),i=0;i<e.length;i++)b(e[i]).removeClass("acs-visible__topic");try{b(document.getElementById("topk_"+t)).addClass("acs-visible__topic"),n._topic=t}catch(t){}n.SurveyUIUpdated.fire()}.bind(this);h&&utils.Bind(h,"feedback:change",function(t){l(t.target.value)}),1==this.data.vistopics.length&&(this._topic=this.data.vistopics[0].id,this._renderSurvey(),b(document.getElementById("topk_"+this.data.vistopics[0].id)).addClass("acs-visible__topic"),o()),utils.Bind(s.$(".acs-submit-feedback__button")[0],"click",function(t){return this._validateSurvey()&&!this.submitted&&(this.SubmitClicked.fire(),this.submitted=!0),t&&t.preventDefault&&t.preventDefault(),!1}.bind(this));for(var d=function(){utils._preventUnloadFor(10)},f=document.querySelectorAll('a[href^="mailto"]'),p=0;p<f.length;p++)utils.Bind(f[p],"feedback:click",d);for(var g=document.querySelectorAll(".acs-feedback__label p"),v=0;v<g.length;v++)b(g[v]).css({display:"inline"})},i.prototype.isExpired=function(){var t,e=new Date,i=new Date(e.getFullYear(),e.getMonth(),e.getDate());return!!this.cfg.fbexpiredate&&(t=this.cfg.fbexpiredate.split("-"),new Date(t[0],Number(t[1])-1,t[2])<i)},i.prototype._validationStatus=function(t){var e=b(this.$el.$(".acs-validation-block")[0]);t?e.css({display:"block"}):e.css({display:"none"})},{SurveyBuilder:i,TopicTester:m}});