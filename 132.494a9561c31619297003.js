"use strict";(self.webpackChunkyemen_market_analysis=self.webpackChunkyemen_market_analysis||[]).push([[132],{84124:(t,e,n)=>{n.d(e,{G:()=>L});var r,i=n(96540),a=n(34164),o=n(2680),c=n(1882),l=n.n(c),s=n(94506),u=n.n(s),p=n(69843),y=n.n(p),f=n(11741),d=n.n(f),m=n(2404),h=n.n(m),b=n(29705),v=n(66613),x=n(86069),A=n(5614),O=n(59938),g=n(59744),P=n(41139),j=n(94501),w=["layout","type","stroke","connectNulls","isRange","ref"],E=["key"];function S(t){return S="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},S(t)}function k(t,e){if(null==t)return{};var n,r,i=function(t,e){if(null==t)return{};var n={};for(var r in t)if(Object.prototype.hasOwnProperty.call(t,r)){if(e.indexOf(r)>=0)continue;n[r]=t[r]}return n}(t,e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);for(r=0;r<a.length;r++)n=a[r],e.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(t,n)&&(i[n]=t[n])}return i}function D(){return D=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},D.apply(this,arguments)}function I(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),n.push.apply(n,r)}return n}function T(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?I(Object(n),!0).forEach((function(e){M(t,e,n[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):I(Object(n)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))}))}return t}function N(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,K(r.key),r)}}function _(t,e,n){return e=z(e),function(t,e){if(e&&("object"===S(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}(t,C()?Reflect.construct(e,n||[],z(t).constructor):e.apply(t,n))}function C(){try{var t=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){})))}catch(t){}return(C=function(){return!!t})()}function z(t){return z=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},z(t)}function B(t,e){return B=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},B(t,e)}function M(t,e,n){return(e=K(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function K(t){var e=function(t,e){if("object"!=S(t)||!t)return t;var n=t[Symbol.toPrimitive];if(void 0!==n){var r=n.call(t,e||"default");if("object"!=S(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===e?String:Number)(t)}(t,"string");return"symbol"==S(e)?e:e+""}var L=function(t){function e(){var t;!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);for(var n=arguments.length,r=new Array(n),i=0;i<n;i++)r[i]=arguments[i];return M(t=_(this,e,[].concat(r)),"state",{isAnimationFinished:!0}),M(t,"id",(0,g.NF)("recharts-area-")),M(t,"handleAnimationEnd",(function(){var e=t.props.onAnimationEnd;t.setState({isAnimationFinished:!0}),l()(e)&&e()})),M(t,"handleAnimationStart",(function(){var e=t.props.onAnimationStart;t.setState({isAnimationFinished:!1}),l()(e)&&e()})),t}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&B(t,e)}(e,t),n=e,c=[{key:"getDerivedStateFromProps",value:function(t,e){return t.animationId!==e.prevAnimationId?{prevAnimationId:t.animationId,curPoints:t.points,curBaseLine:t.baseLine,prevPoints:e.curPoints,prevBaseLine:e.curBaseLine}:t.points!==e.curPoints||t.baseLine!==e.curBaseLine?{curPoints:t.points,curBaseLine:t.baseLine}:null}}],(r=[{key:"renderDots",value:function(t,n,r){var a=this.props.isAnimationActive,o=this.state.isAnimationFinished;if(a&&!o)return null;var c=this.props,l=c.dot,s=c.points,u=c.dataKey,p=(0,j.J9)(this.props,!1),y=(0,j.J9)(l,!0),f=s.map((function(t,n){var r=T(T(T({key:"dot-".concat(n),r:3},p),y),{},{index:n,cx:t.x,cy:t.y,dataKey:u,value:t.value,payload:t.payload,points:s});return e.renderDotItem(l,r)})),d={clipPath:t?"url(#clipPath-".concat(n?"":"dots-").concat(r,")"):null};return i.createElement(x.W,D({className:"recharts-area-dots"},d),f)}},{key:"renderHorizontalRect",value:function(t){var e=this.props,n=e.baseLine,r=e.points,a=e.strokeWidth,o=r[0].x,c=r[r.length-1].x,l=t*Math.abs(o-c),s=u()(r.map((function(t){return t.y||0})));return(0,g.Et)(n)&&"number"==typeof n?s=Math.max(n,s):n&&Array.isArray(n)&&n.length&&(s=Math.max(u()(n.map((function(t){return t.y||0}))),s)),(0,g.Et)(s)?i.createElement("rect",{x:o<c?o:o-l,y:0,width:l,height:Math.floor(s+(a?parseInt("".concat(a),10):1))}):null}},{key:"renderVerticalRect",value:function(t){var e=this.props,n=e.baseLine,r=e.points,a=e.strokeWidth,o=r[0].y,c=r[r.length-1].y,l=t*Math.abs(o-c),s=u()(r.map((function(t){return t.x||0})));return(0,g.Et)(n)&&"number"==typeof n?s=Math.max(n,s):n&&Array.isArray(n)&&n.length&&(s=Math.max(u()(n.map((function(t){return t.x||0}))),s)),(0,g.Et)(s)?i.createElement("rect",{x:0,y:o<c?o:o-l,width:s+(a?parseInt("".concat(a),10):1),height:Math.floor(l)}):null}},{key:"renderClipRect",value:function(t){return"vertical"===this.props.layout?this.renderVerticalRect(t):this.renderHorizontalRect(t)}},{key:"renderAreaStatically",value:function(t,e,n,r){var a=this.props,o=a.layout,c=a.type,l=a.stroke,s=a.connectNulls,u=a.isRange,p=(a.ref,k(a,w));return i.createElement(x.W,{clipPath:n?"url(#clipPath-".concat(r,")"):null},i.createElement(b.I,D({},(0,j.J9)(p,!0),{points:t,connectNulls:s,type:c,baseLine:e,layout:o,stroke:"none",className:"recharts-area-area"})),"none"!==l&&i.createElement(b.I,D({},(0,j.J9)(this.props,!1),{className:"recharts-area-curve",layout:o,type:c,connectNulls:s,fill:"none",points:t})),"none"!==l&&u&&i.createElement(b.I,D({},(0,j.J9)(this.props,!1),{className:"recharts-area-curve",layout:o,type:c,connectNulls:s,fill:"none",points:e})))}},{key:"renderAreaWithAnimation",value:function(t,e){var n=this,r=this.props,a=r.points,c=r.baseLine,l=r.isAnimationActive,s=r.animationBegin,u=r.animationDuration,p=r.animationEasing,f=r.animationId,m=this.state,h=m.prevPoints,b=m.prevBaseLine;return i.createElement(o.Ay,{begin:s,duration:u,isActive:l,easing:p,from:{t:0},to:{t:1},key:"area-".concat(f),onAnimationEnd:this.handleAnimationEnd,onAnimationStart:this.handleAnimationStart},(function(r){var o=r.t;if(h){var l,s=h.length/a.length,u=a.map((function(t,e){var n=Math.floor(e*s);if(h[n]){var r=h[n],i=(0,g.Dj)(r.x,t.x),a=(0,g.Dj)(r.y,t.y);return T(T({},t),{},{x:i(o),y:a(o)})}return t}));return l=(0,g.Et)(c)&&"number"==typeof c?(0,g.Dj)(b,c)(o):y()(c)||d()(c)?(0,g.Dj)(b,0)(o):c.map((function(t,e){var n=Math.floor(e*s);if(b[n]){var r=b[n],i=(0,g.Dj)(r.x,t.x),a=(0,g.Dj)(r.y,t.y);return T(T({},t),{},{x:i(o),y:a(o)})}return t})),n.renderAreaStatically(u,l,t,e)}return i.createElement(x.W,null,i.createElement("defs",null,i.createElement("clipPath",{id:"animationClipPath-".concat(e)},n.renderClipRect(o))),i.createElement(x.W,{clipPath:"url(#animationClipPath-".concat(e,")")},n.renderAreaStatically(a,c,t,e)))}))}},{key:"renderArea",value:function(t,e){var n=this.props,r=n.points,i=n.baseLine,a=n.isAnimationActive,o=this.state,c=o.prevPoints,l=o.prevBaseLine,s=o.totalLength;return a&&r&&r.length&&(!c&&s>0||!h()(c,r)||!h()(l,i))?this.renderAreaWithAnimation(t,e):this.renderAreaStatically(r,i,t,e)}},{key:"render",value:function(){var t,e=this.props,n=e.hide,r=e.dot,o=e.points,c=e.className,l=e.top,s=e.left,u=e.xAxis,p=e.yAxis,f=e.width,d=e.height,m=e.isAnimationActive,h=e.id;if(n||!o||!o.length)return null;var b=this.state.isAnimationFinished,v=1===o.length,O=(0,a.A)("recharts-area",c),g=u&&u.allowDataOverflow,P=p&&p.allowDataOverflow,w=g||P,E=y()(h)?this.id:h,S=null!==(t=(0,j.J9)(r,!1))&&void 0!==t?t:{r:3,strokeWidth:2},k=S.r,D=void 0===k?3:k,I=S.strokeWidth,T=void 0===I?2:I,N=((0,j.sT)(r)?r:{}).clipDot,_=void 0===N||N,C=2*D+T;return i.createElement(x.W,{className:O},g||P?i.createElement("defs",null,i.createElement("clipPath",{id:"clipPath-".concat(E)},i.createElement("rect",{x:g?s:s-f/2,y:P?l:l-d/2,width:g?f:2*f,height:P?d:2*d})),!_&&i.createElement("clipPath",{id:"clipPath-dots-".concat(E)},i.createElement("rect",{x:s-C/2,y:l-C/2,width:f+C,height:d+C}))):null,v?null:this.renderArea(w,E),(r||v)&&this.renderDots(w,_,E),(!m||b)&&A.Z.renderCallByParent(this.props,o))}}])&&N(n.prototype,r),c&&N(n,c),Object.defineProperty(n,"prototype",{writable:!1}),n;var n,r,c}(i.PureComponent);r=L,M(L,"displayName","Area"),M(L,"defaultProps",{stroke:"#3182bd",fill:"#3182bd",fillOpacity:.6,xAxisId:0,yAxisId:0,legendType:"line",connectNulls:!1,points:[],dot:!1,activeDot:!0,hide:!1,isAnimationActive:!O.m.isSsr,animationBegin:0,animationDuration:1500,animationEasing:"ease"}),M(L,"getBaseValue",(function(t,e,n,r){var i=t.layout,a=t.baseValue,o=e.props.baseValue,c=null!=o?o:a;if((0,g.Et)(c)&&"number"==typeof c)return c;var l="horizontal"===i?r:n,s=l.scale.domain();if("number"===l.type){var u=Math.max(s[0],s[1]),p=Math.min(s[0],s[1]);return"dataMin"===c?p:"dataMax"===c||u<0?u:Math.max(Math.min(s[0],s[1]),0)}return"dataMin"===c?s[0]:"dataMax"===c?s[1]:s[0]})),M(L,"getComposedData",(function(t){var e,n=t.props,i=t.item,a=t.xAxis,o=t.yAxis,c=t.xAxisTicks,l=t.yAxisTicks,s=t.bandSize,u=t.dataKey,p=t.stackedData,y=t.dataStartIndex,f=t.displayedData,d=t.offset,m=n.layout,h=p&&p.length,b=r.getBaseValue(n,i,a,o),v="horizontal"===m,x=!1,A=f.map((function(t,e){var n;h?n=p[y+e]:(n=(0,P.kr)(t,u),Array.isArray(n)?x=!0:n=[b,n]);var r=null==n[1]||h&&null==(0,P.kr)(t,u);return v?{x:(0,P.nb)({axis:a,ticks:c,bandSize:s,entry:t,index:e}),y:r?null:o.scale(n[1]),value:n,payload:t}:{x:r?null:a.scale(n[1]),y:(0,P.nb)({axis:o,ticks:l,bandSize:s,entry:t,index:e}),value:n,payload:t}}));return e=h||x?A.map((function(t){var e=Array.isArray(t.value)?t.value[0]:null;return v?{x:t.x,y:null!=e&&null!=t.y?o.scale(e):null}:{x:null!=e?a.scale(e):null,y:t.y}})):v?o.scale(b):a.scale(b),T({points:A,baseLine:e,layout:m,isRange:x},d)})),M(L,"renderDotItem",(function(t,e){var n;if(i.isValidElement(t))n=i.cloneElement(t,e);else if(l()(t))n=t(e);else{var r=(0,a.A)("recharts-area-dot","boolean"!=typeof t?t.className:""),o=e.key,c=k(e,E);n=i.createElement(v.c,D({},c,{key:o,className:r}))}return n}))},37132:(t,e,n)=>{n.d(e,{X:()=>nt});var r=n(87078),i=n(84124),a=n(91222),o=n(86279),c=n(96540),l=n(2680),s=n(69843),u=n.n(s),p=n(2404),y=n.n(p),f=n(1882),d=n.n(f),m=n(34164),h=n(86069),b=n(5614),v=n(94501),x=n(59938);function A(t){return A="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},A(t)}function O(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,S(r.key),r)}}function g(t,e,n){return e=j(e),function(t,e){if(e&&("object"===A(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}(t,P()?Reflect.construct(e,n||[],j(t).constructor):e.apply(t,n))}function P(){try{var t=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){})))}catch(t){}return(P=function(){return!!t})()}function j(t){return j=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},j(t)}function w(t,e){return w=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},w(t,e)}function E(t,e,n){return(e=S(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function S(t){var e=function(t,e){if("object"!=A(t)||!t)return t;var n=t[Symbol.toPrimitive];if(void 0!==n){var r=n.call(t,e||"default");if("object"!=A(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===e?String:Number)(t)}(t,"string");return"symbol"==A(e)?e:e+""}var k=function(t){function e(){return function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e),g(this,e,arguments)}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&w(t,e)}(e,t),n=e,(r=[{key:"render",value:function(){return null}}])&&O(n.prototype,r),i&&O(n,i),Object.defineProperty(n,"prototype",{writable:!1}),n;var n,r,i}(c.Component);E(k,"displayName","ZAxis"),E(k,"defaultProps",{zAxisId:0,range:[64,64],scale:"auto",type:"number"});var D=n(29705),I=n(51738),T=n(72050),N=n(59744),_=n(41139),C=n(98940),z=n(90706),B=n(15079),M=["option","isActive"];function K(){return K=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},K.apply(this,arguments)}function L(t,e){if(null==t)return{};var n,r,i=function(t,e){if(null==t)return{};var n={};for(var r in t)if(Object.prototype.hasOwnProperty.call(t,r)){if(e.indexOf(r)>=0)continue;n[r]=t[r]}return n}(t,e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);for(r=0;r<a.length;r++)n=a[r],e.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(t,n)&&(i[n]=t[n])}return i}function W(t){var e=t.option,n=t.isActive,r=L(t,M);return"string"==typeof e?c.createElement(B.yp,K({option:c.createElement(z.i,K({type:e},r)),isActive:n,shapeType:"symbols"},r)):c.createElement(B.yp,K({option:e,isActive:n,shapeType:"symbols"},r))}function R(t){return R="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},R(t)}function F(){return F=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},F.apply(this,arguments)}function J(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(t);e&&(r=r.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),n.push.apply(n,r)}return n}function V(t){for(var e=1;e<arguments.length;e++){var n=null!=arguments[e]?arguments[e]:{};e%2?J(Object(n),!0).forEach((function(e){Q(t,e,n[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):J(Object(n)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))}))}return t}function G(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,U(r.key),r)}}function Z(t,e,n){return e=X(e),function(t,e){if(e&&("object"===R(e)||"function"==typeof e))return e;if(void 0!==e)throw new TypeError("Derived constructors may only return object or undefined");return function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}(t)}(t,H()?Reflect.construct(e,n||[],X(t).constructor):e.apply(t,n))}function H(){try{var t=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){})))}catch(t){}return(H=function(){return!!t})()}function X(t){return X=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(t){return t.__proto__||Object.getPrototypeOf(t)},X(t)}function q(t,e){return q=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},q(t,e)}function Q(t,e,n){return(e=U(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function U(t){var e=function(t,e){if("object"!=R(t)||!t)return t;var n=t[Symbol.toPrimitive];if(void 0!==n){var r=n.call(t,e||"default");if("object"!=R(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===e?String:Number)(t)}(t,"string");return"symbol"==R(e)?e:e+""}var Y=function(t){function e(){var t;!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);for(var n=arguments.length,r=new Array(n),i=0;i<n;i++)r[i]=arguments[i];return Q(t=Z(this,e,[].concat(r)),"state",{isAnimationFinished:!1}),Q(t,"handleAnimationEnd",(function(){t.setState({isAnimationFinished:!0})})),Q(t,"handleAnimationStart",(function(){t.setState({isAnimationFinished:!1})})),Q(t,"id",(0,N.NF)("recharts-scatter-")),t}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),Object.defineProperty(t,"prototype",{writable:!1}),e&&q(t,e)}(e,t),n=e,i=[{key:"getDerivedStateFromProps",value:function(t,e){return t.animationId!==e.prevAnimationId?{prevAnimationId:t.animationId,curPoints:t.points,prevPoints:e.curPoints}:t.points!==e.curPoints?{curPoints:t.points}:null}}],(r=[{key:"renderSymbolsStatically",value:function(t){var e=this,n=this.props,r=n.shape,i=n.activeShape,a=n.activeIndex,o=(0,v.J9)(this.props,!1);return t.map((function(t,n){var l=a===n,s=l?i:r,u=V(V({},o),t);return c.createElement(h.W,F({className:"recharts-scatter-symbol",key:"symbol-".concat(null==t?void 0:t.cx,"-").concat(null==t?void 0:t.cy,"-").concat(null==t?void 0:t.size,"-").concat(n)},(0,C.XC)(e.props,t,n),{role:"img"}),c.createElement(W,F({option:s,isActive:l,key:"symbol-".concat(n)},u)))}))}},{key:"renderSymbolsWithAnimation",value:function(){var t=this,e=this.props,n=e.points,r=e.isAnimationActive,i=e.animationBegin,a=e.animationDuration,o=e.animationEasing,s=e.animationId,u=this.state.prevPoints;return c.createElement(l.Ay,{begin:i,duration:a,isActive:r,easing:o,from:{t:0},to:{t:1},key:"pie-".concat(s),onAnimationEnd:this.handleAnimationEnd,onAnimationStart:this.handleAnimationStart},(function(e){var r=e.t,i=n.map((function(t,e){var n=u&&u[e];if(n){var i=(0,N.Dj)(n.cx,t.cx),a=(0,N.Dj)(n.cy,t.cy),o=(0,N.Dj)(n.size,t.size);return V(V({},t),{},{cx:i(r),cy:a(r),size:o(r)})}var c=(0,N.Dj)(0,t.size);return V(V({},t),{},{size:c(r)})}));return c.createElement(h.W,null,t.renderSymbolsStatically(i))}))}},{key:"renderSymbols",value:function(){var t=this.props,e=t.points,n=t.isAnimationActive,r=this.state.prevPoints;return!(n&&e&&e.length)||r&&y()(r,e)?this.renderSymbolsStatically(e):this.renderSymbolsWithAnimation()}},{key:"renderErrorBar",value:function(){if(this.props.isAnimationActive&&!this.state.isAnimationFinished)return null;var t=this.props,e=t.points,n=t.xAxis,r=t.yAxis,i=t.children,a=(0,v.aS)(i,I.u);return a?a.map((function(t,i){var a=t.props,o=a.direction,l=a.dataKey;return c.cloneElement(t,{key:"".concat(o,"-").concat(l,"-").concat(e[i]),data:e,xAxis:n,yAxis:r,layout:"x"===o?"vertical":"horizontal",dataPointFormatter:function(t,e){return{x:t.cx,y:t.cy,value:"x"===o?+t.node.x:+t.node.y,errorVal:(0,_.kr)(t,e)}}})})):null}},{key:"renderLine",value:function(){var t,e,n=this.props,r=n.points,i=n.line,a=n.lineType,o=n.lineJointType,l=(0,v.J9)(this.props,!1),s=(0,v.J9)(i,!1);if("joint"===a)t=r.map((function(t){return{x:t.cx,y:t.cy}}));else if("fitting"===a){var u=(0,N.jG)(r),p=u.xmin,y=u.xmax,f=u.a,m=u.b,b=function(t){return f*t+m};t=[{x:p,y:b(p)},{x:y,y:b(y)}]}var x=V(V(V({},l),{},{fill:"none",stroke:l&&l.fill},s),{},{points:t});return e=c.isValidElement(i)?c.cloneElement(i,x):d()(i)?i(x):c.createElement(D.I,F({},x,{type:o})),c.createElement(h.W,{className:"recharts-scatter-line",key:"recharts-scatter-line"},e)}},{key:"render",value:function(){var t=this.props,e=t.hide,n=t.points,r=t.line,i=t.className,a=t.xAxis,o=t.yAxis,l=t.left,s=t.top,p=t.width,y=t.height,f=t.id,d=t.isAnimationActive;if(e||!n||!n.length)return null;var v=this.state.isAnimationFinished,x=(0,m.A)("recharts-scatter",i),A=a&&a.allowDataOverflow,O=o&&o.allowDataOverflow,g=A||O,P=u()(f)?this.id:f;return c.createElement(h.W,{className:x,clipPath:g?"url(#clipPath-".concat(P,")"):null},A||O?c.createElement("defs",null,c.createElement("clipPath",{id:"clipPath-".concat(P)},c.createElement("rect",{x:A?l:l-p/2,y:O?s:s-y/2,width:A?p:2*p,height:O?y:2*y}))):null,r&&this.renderLine(),this.renderErrorBar(),c.createElement(h.W,{key:"recharts-scatter-symbols"},this.renderSymbols()),(!d||v)&&b.Z.renderCallByParent(this.props,n))}}])&&G(n.prototype,r),i&&G(n,i),Object.defineProperty(n,"prototype",{writable:!1}),n;var n,r,i}(c.PureComponent);Q(Y,"displayName","Scatter"),Q(Y,"defaultProps",{xAxisId:0,yAxisId:0,zAxisId:0,legendType:"circle",lineType:"joint",lineJointType:"linear",data:[],shape:"circle",hide:!1,isAnimationActive:!x.m.isSsr,animationBegin:0,animationDuration:400,animationEasing:"linear"}),Q(Y,"getComposedData",(function(t){var e=t.xAxis,n=t.yAxis,r=t.zAxis,i=t.item,a=t.displayedData,o=t.xAxisTicks,c=t.yAxisTicks,l=t.offset,s=i.props.tooltipType,p=(0,v.aS)(i.props.children,T.f),y=u()(e.dataKey)?i.props.dataKey:e.dataKey,f=u()(n.dataKey)?i.props.dataKey:n.dataKey,d=r&&r.dataKey,m=r?r.range:k.defaultProps.range,h=m&&m[0],b=e.scale.bandwidth?e.scale.bandwidth():0,x=n.scale.bandwidth?n.scale.bandwidth():0,A=a.map((function(t,a){var l=(0,_.kr)(t,y),m=(0,_.kr)(t,f),v=!u()(d)&&(0,_.kr)(t,d)||"-",A=[{name:u()(e.dataKey)?i.props.name:e.name||e.dataKey,unit:e.unit||"",value:l,payload:t,dataKey:y,type:s},{name:u()(n.dataKey)?i.props.name:n.name||n.dataKey,unit:n.unit||"",value:m,payload:t,dataKey:f,type:s}];"-"!==v&&A.push({name:r.name||r.dataKey,unit:r.unit||"",value:v,payload:t,dataKey:d,type:s});var O=(0,_.nb)({axis:e,ticks:o,bandSize:b,entry:t,index:a,dataKey:y}),g=(0,_.nb)({axis:n,ticks:c,bandSize:x,entry:t,index:a,dataKey:f}),P="-"!==v?r.scale(v):h,j=Math.sqrt(Math.max(P,0)/Math.PI);return V(V({},t),{},{cx:O,cy:g,x:O-j,y:g-j,xAxis:e,yAxis:n,zAxis:r,width:2*j,height:2*j,size:P,node:{x:l,y:m,z:v},tooltipPayload:A,tooltipPosition:{x:O,y:g},payload:t},p&&p[a]&&p[a].props)}));return V({points:A},l)}));var $=n(77984),tt=n(23495),et=n(15894),nt=(0,r.gu)({chartName:"ComposedChart",GraphicalChild:[o.N,i.G,a.y,Y],axisComponents:[{axisType:"xAxis",AxisComp:$.W},{axisType:"yAxis",AxisComp:tt.h},{axisType:"zAxis",AxisComp:k}],formatAxisMap:et.pr})}}]);