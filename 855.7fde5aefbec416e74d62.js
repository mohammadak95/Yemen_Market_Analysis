"use strict";(self.webpackChunkyemen_market_analysis=self.webpackChunkyemen_market_analysis||[]).push([[855],{54855:(e,n,t)=>{t.d(n,{A:()=>z});var r=t(96540),o=t(75659),a=t(79329),i=t(69787),s=t(71547),c=t(74959);const l=function(e={}){const{autoHideDuration:n=null,disableWindowBlurListener:t=!1,onClose:o,open:a,resumeHideDuration:l}=e,u=(0,i.A)();r.useEffect((()=>{if(a)return document.addEventListener("keydown",e),()=>{document.removeEventListener("keydown",e)};function e(e){e.defaultPrevented||"Escape"===e.key&&o?.(e,"escapeKeyDown")}}),[a,o]);const d=(0,s.A)(((e,n)=>{o?.(e,n)})),p=(0,s.A)((e=>{o&&null!=e&&u.start(e,(()=>{d(null,"timeout")}))}));r.useEffect((()=>(a&&p(n),u.clear)),[a,n,p,u]);const m=u.clear,f=r.useCallback((()=>{null!=n&&p(null!=l?l:.5*n)}),[n,l,p]),h=e=>n=>{const t=e.onFocus;t?.(n),m()},g=e=>n=>{const t=e.onMouseEnter;t?.(n),m()},v=e=>n=>{const t=e.onMouseLeave;t?.(n),f()};return r.useEffect((()=>{if(!t&&a)return window.addEventListener("focus",f),window.addEventListener("blur",m),()=>{window.removeEventListener("focus",f),window.removeEventListener("blur",m)}}),[t,a,f,m]),{getRootProps:(n={})=>{const t={...(0,c.A)(e),...(0,c.A)(n)};return{role:"presentation",...n,...t,onBlur:(r=t,e=>{const n=r.onBlur;n?.(e),f()}),onFocus:h(t),onMouseEnter:g(t),onMouseLeave:v(t)};var r},onClickAway:e=>{o?.(e,"clickaway")}}};var u=t(31523),d=t(32325),p=t(57223),m=t(74848);function f(e){return e.substring(2).toLowerCase()}function h(e){const{children:n,disableReactTree:t=!1,mouseEvent:o="onClick",onClickAway:a,touchEvent:i="onTouchEnd"}=e,c=r.useRef(!1),l=r.useRef(null),h=r.useRef(!1),g=r.useRef(!1);r.useEffect((()=>(setTimeout((()=>{h.current=!0}),0),()=>{h.current=!1})),[]);const v=(0,u.A)((0,p.A)(n),l),b=(0,s.A)((e=>{const n=g.current;g.current=!1;const r=(0,d.A)(l.current);if(!h.current||!l.current||"clientX"in e&&function(e,n){return n.documentElement.clientWidth<e.clientX||n.documentElement.clientHeight<e.clientY}(e,r))return;if(c.current)return void(c.current=!1);let o;o=e.composedPath?e.composedPath().includes(l.current):!r.documentElement.contains(e.target)||l.current.contains(e.target),o||!t&&n||a(e)})),w=e=>t=>{g.current=!0;const r=n.props[e];r&&r(t)},A={ref:v};return!1!==i&&(A[i]=w(i)),r.useEffect((()=>{if(!1!==i){const e=f(i),n=(0,d.A)(l.current),t=()=>{c.current=!0};return n.addEventListener(e,b),n.addEventListener("touchmove",t),()=>{n.removeEventListener(e,b),n.removeEventListener("touchmove",t)}}}),[b,i]),!1!==o&&(A[o]=w(o)),r.useEffect((()=>{if(!1!==o){const e=f(o),n=(0,d.A)(l.current);return n.addEventListener(e,b),()=>{n.removeEventListener(e,b)}}}),[b,o]),(0,m.jsx)(r.Fragment,{children:r.cloneElement(n,A)})}var g=t(11848),v=t(44675),b=t(29077),w=t(25669),A=t(28466),k=t(87467),y=t(34164),E=t(85703),C=t(64155),x=t(38413),S=t(31609);function L(e){return(0,S.Ay)("MuiSnackbarContent",e)}(0,x.A)("MuiSnackbarContent",["root","message","action"]);const R=(0,g.Ay)(C.A,{name:"MuiSnackbarContent",slot:"Root",overridesResolver:(e,n)=>n.root})((0,b.A)((({theme:e})=>{const n="light"===e.palette.mode?.8:.98,t=(0,E.tL)(e.palette.background.default,n);return{...e.typography.body2,color:e.vars?e.vars.palette.SnackbarContent.color:e.palette.getContrastText(t),backgroundColor:e.vars?e.vars.palette.SnackbarContent.bg:t,display:"flex",alignItems:"center",flexWrap:"wrap",padding:"6px 16px",borderRadius:(e.vars||e).shape.borderRadius,flexGrow:1,[e.breakpoints.up("sm")]:{flexGrow:"initial",minWidth:288}}}))),O=(0,g.Ay)("div",{name:"MuiSnackbarContent",slot:"Message",overridesResolver:(e,n)=>n.message})({padding:"8px 0"}),M=(0,g.Ay)("div",{name:"MuiSnackbarContent",slot:"Action",overridesResolver:(e,n)=>n.action})({display:"flex",alignItems:"center",marginLeft:"auto",paddingLeft:16,marginRight:-8}),j=r.forwardRef((function(e,n){const t=(0,w.b)({props:e,name:"MuiSnackbarContent"}),{action:r,className:a,message:i,role:s="alert",...c}=t,l=t,u=(e=>{const{classes:n}=e;return(0,o.A)({root:["root"],action:["action"],message:["message"]},L,n)})(l);return(0,m.jsxs)(R,{role:s,square:!0,elevation:6,className:(0,y.A)(u.root,a),ownerState:l,ref:n,...c,children:[(0,m.jsx)(O,{className:u.message,ownerState:l,children:i}),r?(0,m.jsx)(M,{className:u.action,ownerState:l,children:r}):null]})}));function P(e){return(0,S.Ay)("MuiSnackbar",e)}(0,x.A)("MuiSnackbar",["root","anchorOriginTopCenter","anchorOriginBottomCenter","anchorOriginTopRight","anchorOriginBottomRight","anchorOriginTopLeft","anchorOriginBottomLeft"]);const T=(0,g.Ay)("div",{name:"MuiSnackbar",slot:"Root",overridesResolver:(e,n)=>{const{ownerState:t}=e;return[n.root,n[`anchorOrigin${(0,A.A)(t.anchorOrigin.vertical)}${(0,A.A)(t.anchorOrigin.horizontal)}`]]}})((0,b.A)((({theme:e})=>({zIndex:(e.vars||e).zIndex.snackbar,position:"fixed",display:"flex",left:8,right:8,justifyContent:"center",alignItems:"center",variants:[{props:({ownerState:e})=>"top"===e.anchorOrigin.vertical,style:{top:8,[e.breakpoints.up("sm")]:{top:24}}},{props:({ownerState:e})=>"top"!==e.anchorOrigin.vertical,style:{bottom:8,[e.breakpoints.up("sm")]:{bottom:24}}},{props:({ownerState:e})=>"left"===e.anchorOrigin.horizontal,style:{justifyContent:"flex-start",[e.breakpoints.up("sm")]:{left:24,right:"auto"}}},{props:({ownerState:e})=>"right"===e.anchorOrigin.horizontal,style:{justifyContent:"flex-end",[e.breakpoints.up("sm")]:{right:24,left:"auto"}}},{props:({ownerState:e})=>"center"===e.anchorOrigin.horizontal,style:{[e.breakpoints.up("sm")]:{left:"50%",right:"auto",transform:"translateX(-50%)"}}}]})))),z=r.forwardRef((function(e,n){const t=(0,w.b)({props:e,name:"MuiSnackbar"}),i=(0,v.A)(),s={enter:i.transitions.duration.enteringScreen,exit:i.transitions.duration.leavingScreen},{action:c,anchorOrigin:{vertical:u,horizontal:d}={vertical:"bottom",horizontal:"left"},autoHideDuration:p=null,children:f,className:g,ClickAwayListenerProps:b,ContentProps:y,disableWindowBlurListener:E=!1,message:C,onBlur:x,onClose:S,onFocus:L,onMouseEnter:R,onMouseLeave:O,open:M,resumeHideDuration:z,TransitionComponent:B=k.A,transitionDuration:D=s,TransitionProps:{onEnter:H,onExited:N,...W}={},...F}=t,I={...t,anchorOrigin:{vertical:u,horizontal:d},autoHideDuration:p,disableWindowBlurListener:E,TransitionComponent:B,transitionDuration:D},$=(e=>{const{classes:n,anchorOrigin:t}=e,r={root:["root",`anchorOrigin${(0,A.A)(t.vertical)}${(0,A.A)(t.horizontal)}`]};return(0,o.A)(r,P,n)})(I),{getRootProps:_,onClickAway:X}=l({...I}),[G,q]=r.useState(!0),K=(0,a.A)({elementType:T,getSlotProps:_,externalForwardedProps:F,ownerState:I,additionalProps:{ref:n},className:[$.root,g]});return!M&&G?null:(0,m.jsx)(h,{onClickAway:X,...b,children:(0,m.jsx)(T,{...K,children:(0,m.jsx)(B,{appear:!0,in:M,timeout:D,direction:"top"===u?"down":"up",onEnter:(e,n)=>{q(!1),H&&H(e,n)},onExited:e=>{q(!0),N&&N(e)},...W,children:f||(0,m.jsx)(j,{message:C,action:c,...y})})})})}))}}]);