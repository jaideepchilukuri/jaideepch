/***************************************
* @preserve
* ForeSee Web SDK: True Conversion Plugin
* Built April 27, 19 22:11:21
* Code version: 19.4.0
* Template version: 19.4.0
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("$fs.utils.js"),"triggerconfig"],function(t,s,e,config){var i=function(t){this.trigger=t,this.stg=t.stg,this.cfg=t.cfg,this.browser=t.browser,this.crit=t.crit,this.def=t.surveydef,this.tc=this.cfg.config.trueconversion,this.jrny=t.jrny,this.tc&&this.tc.enabled&&this._processRules()};return i.prototype._signal=function(t,s){if(!t.repeat){if(this.stg.get("tc"+t.code))return}var i=this.stg.get("ixw"),r=this.tc.pd||7,n=864e5*r;(!i||parseInt(i,10)+n>e.now())&&(this.jrny.addEventObj({name:"fs_conversion",data:{code:t.code.toString()}}),this.stg.set("tc"+t.code,"y"))},i.prototype._processRules=function(){var t,e,i=this.tc;for(var r in i.codes)switch(e=i.codes[r],e.source){case"variable":s.isDefined(window[e.name])&&this._signal(e,window[e.name]);break;case"url":for(t=0;t<e.patterns.length;t++)if(s.toLowerCase(window.location.toString()).indexOf(s.toLowerCase(e.patterns[t]))>-1){this._signal(e,e.patterns[t]);break}}},i.prototype.dispose=function(){},i});