/***************************************
* @preserve
* ForeSee Web SDK: True Conversion Plugin
* Built February 21, 17 17:43:58
* Code version: 19.3.2-rc.8
* Template version: 19.3.2-rc.7
***************************************/
_fsDefine(["require","fs",_fsNormalizeUrl("$fs.utils.js"),"triggerconfig"],function(t,s,e,config){var i=function(t){this.trigger=t,this.stg=t.stg,this.cfg=t.cfg,this.browser=t.browser,this.crit=t.crit,this.def=t.surveydef,this.tc=this.cfg.config.trueconversion,this.jrny=t.jrny,this.tc&&this.tc.enabled&&this._processRules()};return i.prototype._signal=function(t,s){if(!t.repeat){var i=this.stg.get("tc"+t.code);if(i)return}var r=this.stg.get("ixw"),n=this.tc.pd||7,o=864e5*n;(!r||parseInt(r,10)+o>e.now())&&(this.jrny.addEventObj({name:"fs_conversion",data:{code:t.code.toString()}}),this.stg.set("tc"+t.code,"y"))},i.prototype._processRules=function(){var t,e,i=this.tc;for(var r in i.codes)switch(e=i.codes[r],e.source){case"variable":s.isDefined(window[e.name])&&this._signal(e,window[e.name]);break;case"url":for(t=0;t<e.patterns.length;t++)if(window.location.toString().toLowerCase().indexOf(e.patterns[t].toLowerCase())>-1){this._signal(e,e.patterns[t]);break}}},i.prototype.dispose=function(){},i});