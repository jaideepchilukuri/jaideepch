/***************************************
* @preserve
* ForeSee Web SDK: True Conversion Plugin
* Built April 27, 19 21:36:34
* Code version: 19.7.0
* Template version: 19.7.0
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("$fs.utils.js"),"triggerconfig"],function(t,fs,utils,s){var e=function(t){this.trigger=t,this.stg=t.stg,this.cfg=t.cfg,this.browser=t.browser,this.crit=t.crit,this.def=t.surveydef,this.tc=this.cfg.config.trueconversion,this.jrny=t.jrny,this.tc&&this.tc.enabled&&this._processRules()};return e.prototype._signal=function(t,s){if(!t.repeat&&this.stg.get("tc"+t.code))return;var e=this.stg.get("ixw"),i=864e5*(this.tc.pd||7);(!e||parseInt(e,10)+i>utils.now())&&(this.jrny.addEventObj({name:"fs_conversion",data:{code:t.code.toString()}}),this.stg.set("tc"+t.code,"y"))},e.prototype._processRules=function(){var t,s,e=this.tc;for(var i in e.codes)switch((s=e.codes[i]).source){case"variable":fs.isDefined(window[s.name])&&this._signal(s,window[s.name]);break;case"url":for(t=0;t<s.patterns.length;t++)if(-1<fs.toLowerCase(window.location.toString()).indexOf(fs.toLowerCase(s.patterns[t]))){this._signal(s,s.patterns[t]);break}}},e.prototype.dispose=function(){},e});