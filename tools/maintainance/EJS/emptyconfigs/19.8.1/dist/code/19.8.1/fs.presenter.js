/***************************************
* @preserve
* ForeSee Web SDK: Short Survey Presenter
* Built April 28, 19 00:16:39
* Code version: 19.8.1
* Template version: 19.8.1
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("$fs.utils.js")],function(e,fs,utils){function t(e,t,s,i){this.surveyUrl="https://qal-cxsurvey.foresee.com/sv?mid=VA8Z4EEwtwJggUlhEItxJQ4C&template=contextual",this.config=e,this.surveydef=t,this.display=s,this.locale=i.get("locale")||"en",this.declined=new utils.FSEvent,this.abandoned=new utils.FSEvent,this.accepted=new utils.FSEvent,this.completed=new utils.FSEvent}return t.prototype.loadResources=function(t){console.log("presenter: load resources");var s=function(e){this.html=this.fixURLs(e),t.fire()}.bind(this);(new utils.AjaxTransport).send({url:this.surveyUrl,method:"GET",success:s,failure:function(e,t){s(e)}.bind(this)})},t.prototype.present=function(){console.log("presenter: >>>> POP! <<<<<<<<<<<<<<<<<<<<<<<<<<<<<");var e=document.createElement("iframe");e.width=450,e.height=550,e.srcdoc=this.html,e.style="position:fixed; bottom: 0; right: 0; border: none;",document.body.appendChild(e),this.iframe=e},t.prototype.fixURLs=function(e){return e.replace(/"\/static\//g,'"https://qal-cxsurvey.foresee.com/static/')},t.prototype.dispose=function(){document.body.removeChild(this.iframe)},t});