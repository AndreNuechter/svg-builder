(()=>{var xr=(()=>window.addEventListener("load",()=>{let e=({target:{parentElement:t}})=>{t.classList.toggle("closed"),t.classList.toggle("open")};[...document.getElementsByClassName("togglable")].forEach(t=>{t.firstElementChild.onclick=e,!t.classList.contains("open")&&!t.classList.contains("closed")&&t.classList.add("closed")})},{once:!0}))();var Le=({x:e,y:t})=>`${e} ${t}`,Z={H:({x:e})=>e,V:({y:e})=>e,Q:({x:e,x1:t,y:r,y1:n})=>`${t} ${n} ${e} ${r}`,C:({x:e,x1:t,x2:r,y:n,y1:o,y2:s})=>`${t} ${o} ${r} ${s} ${e} ${n}`,A:({x:e,xR:t,xRot:r,y:n,yR:o,large:s,sweep:i})=>`${t} ${o} ${r} ${s} ${i} ${e} ${n}`,S:({x:e,x1:t,y:r,y1:n})=>`${t} ${n} ${e} ${r}`,T:Le,M:Le,L:Le},Ke=33,Xe=(e,t,r,n)=>e<t?r>n?-Ke:Ke:0,Ze=(e,t,r,n)=>{let o=Math.abs(r-e),s=Math.abs(n-t),i=Math.min(e,r),d=Math.min(t,n),h=Xe(s,o,r,e),A=Xe(o,s,n,t);return{xMin:i,yMin:d,yOffset:h,xOffset:A}};function J(e){return{xR:e.xR,yR:e.yR,xRot:e.xRot,large:+e.large,sweep:+e.sweep}}function Je(e,t,{x:r,y:n}){let{xMin:o,yMin:s,yOffset:i,xOffset:d}=Ze(e,t,r,n);return{x1:o-d+(Math.max(e,r)-o)*.25,y1:s-i+(Math.max(t,n)-s)*.25,x2:o-d+(Math.max(e,r)-o)*.75,y2:s-i+(Math.max(t,n)-s)*.75}}function We(e,t,{x:r,y:n}){let{xMin:o,yMin:s,yOffset:i,xOffset:d}=Ze(e,t,r,n);return{x1:o-d+(Math.max(e,r)-o)*.5,y1:s-i+(Math.max(t,n)-s)*.5}}var W=document.getElementById("arc-cmd-config"),ee=document.getElementById("commands"),b=document.getElementsByClassName("control-point"),T=document.getElementById("control-point-container"),et=document.getElementById("download-btn"),L=document.getElementById("drawing-content"),z=document.getElementById("fill-and-stroke"),{elements:te}=z,w=L.children,x=document.getElementById("layer-select"),D=document.getElementsByName("layer-selector"),re=document.getElementById("output-configuration"),ne=document.getElementById("modes"),xe=document.getElementById("preview"),_=document.getElementById("close-path-toggle"),oe=document.getElementById("redo-btn"),p=document.getElementById("canvas"),G=document.getElementById("transformations"),ae=G.elements,tt=ae.rotate.getElementsByTagName("input"),rt=ae.scale.getElementsByTagName("input"),Se=T.getElementsByTagName("line"),[M]=document.getElementsByName("transform-layer-only"),se=document.getElementById("undo-btn"),je=document.getElementById("no-layer-msg").style;var U=Object.freeze(Object.keys(Z)),R=Object.freeze({scale:rt,rotate:tt}),f=Object.freeze({mode:"path",closePath:!1,outputConfig:Object.freeze({width:"320",height:"180","vb-min-x":"0","vb-min-y":"0","vb-width":"0","vb-height":"0",ratio:"xMidYMid","slice-or-meet":"meet","file-format":"svg"}),transforms:Object.freeze({translate:Object.freeze([0,0]),scale:Object.freeze(["1","1"]),rotate:Object.freeze(["0","0","0"]),skewX:"0",skewY:"0"}),style:Object.freeze({stroke:"#000","stroke-opacity":"1","stroke-width":"2",fill:"#000","fill-opacity":"0","stroke-linecap":"butt","stroke-linejoin":"arcs","stroke-miterlimit":"1","fill-rule":"evenodd"}),styleRelevancies:Object.freeze({"stroke-linecap":"path","stroke-linejoin":"path,rect","stroke-miterlimit":"path,rect","fill-rule":"path"}),arcCmdConfig:Object.freeze({xR:"50",yR:"50",xRot:"0",large:!1,sweep:!1})}),nt=e=>e+1,ot=e=>e-1,Ee=Object.freeze({ArrowUp:Object.freeze({prop:1,cb:ot}),ArrowDown:Object.freeze({prop:1,cb:nt}),ArrowLeft:Object.freeze({prop:0,cb:ot}),ArrowRight:Object.freeze({prop:0,cb:nt})});var Zt=["checked","textContent","data","onpointerdown","onpointerup"],Jt=p.createSVGPoint();function O(e,t){let r=N(e.transforms),n=[L,T],o=[r];if(t.activeSVGElement){let s=N(t.activeLayer.transforms);n.push(t.activeSVGElement),o.push(r+s,s)}else o.push(r);n.forEach((s,i)=>s.setAttribute("transform",o[i]))}function C(e){if(typeof e!="object"||e===null)return e;let t=Array.isArray(e)?[]:{};return Object.keys(e).forEach(r=>{t[r]=C(e[r])}),t}function I(e){return t=>u(e.cloneNode(!1),t)}function u(e,t){return Object.keys(t).forEach(r=>{Zt.includes(r)?e[r]=t[r]:e.setAttribute(r,t[r])}),e}function Oe(e,t){return r=>{let[n,o]=k(r);u(e,t(n,o))}}function ce(e){return e.slice().reverse().find(t=>t.cmd==="A")}function Te(e){return at(e).reduce((t,r)=>({...t,[r]:te[r].value}),Object.create(null))}function st(e){return at(e).reduce((t,r)=>({...t,[r]:f.style[r]}),Object.create(null))}function at(e){return Object.keys(f.style).filter(t=>!f.styleRelevancies[t]||f.styleRelevancies[t].includes(e))}function k({x:e,y:t}){let{x:r,y:n}=Object.assign(Jt,{x:e,y:t}).matrixTransform(p.children[1].getScreenCTM().inverse());return[r,n]}function S(e){return e[y(e)]}function y(e){return e.length-1}function ie(e){return`${e.cmd}${Z[e.cmd](e)}`}function N(e){return Object.entries(e).reduce((t,[r,n])=>`${t}${r}(${typeof n=="object"?n.filter(o=>o!==""):n})`,"")}var le=document.getElementById("coords"),Wt=e=>{let[t,r]=k(e);le.textContent=`x: ${Math.trunc(t)}, y: ${Math.trunc(r)}`,le.style.left=`${e.pageX-120}px`,le.style.top=`${e.pageY-40}px`},Dr=(()=>{p.addEventListener("pointermove",Wt),p.addEventListener("pointerleave",()=>{le.style=null})})();var Nr=(()=>{let e=document.getElementById("tab-links"),t=[...e.children],r=[{id:"drawing",element:document.querySelector('[data-tab="drawing"]')},{id:"output",element:document.querySelector('[data-tab="output"]')}];e.onclick=({target:n})=>{!n.classList.contains("tab-link")||(t.forEach(o=>o.classList.remove("active")),n.classList.add("active"),r.forEach(o=>o.element.classList.remove("active")),r.find(({id:o})=>o===n.dataset.tabName).element.classList.add("active"))}})();var{elements:er}=re,ct=(e,t)=>{e.previousElementSibling.dataset.value=` (${t})`},de=(e,t)=>{e.value=t,e.type==="range"&&ct(e,t)},it=(e,t)=>{Object.entries(t).forEach(([r,n])=>{de(e[r],n)})};[...document.querySelectorAll('input[type="range"]')].forEach(e=>{e.addEventListener("input",({target:t})=>{ct(t,t.value)})});window.onsubmit=e=>e.preventDefault();function Ie(e){if(e.mode!=="path")return;let t=e.activeLayer&&ce(e.activeLayer.points)||e.arcCmdConfig;Object.assign(e.arcCmdConfig,t),Object.entries(t).filter(([r])=>!["cmd","x","y"].includes(r)).forEach(([r,n])=>{let o=W.elements[r];o.type==="checkbox"?o.checked=n:de(o,n)})}function ke(e){!e.activeLayer||e.activeLayer.mode!=="path"||(e.cmd=e.activeLayer.points.length?S(e.activeLayer.points).cmd:"M")}function me(e){it(te,e)}function fe({outputConfig:e}){it(er,e)}function B(e){Object.entries(e).filter(([t])=>t!=="translate").forEach(([t,r])=>{R[t]?r.forEach((n,o)=>de(R[t][o],n)):de(ae[t],r)})}var lt=(e,t)=>{let r=[C(e)],n=0;document.addEventListener("DOMContentLoaded",h,{once:!0});function o(P){n<y(r)&&(r.length=n+1),r.push(P),n=y(r),h()}function s(){return r[n]}function i(){n<y(r)&&(n+=1,d(),h())}function d(){let{layers:P,transforms:we}=s();Object.assign(e,{layers:C(P),transforms:C(we)}),t(),document.dispatchEvent(new Event("initializeCanvas"))}function h(){se.disabled=n===0,oe.disabled=n===y(r)}function A(){r.length>1&&n>0&&(n-=1,d(),h())}return{createBackup:o,redo:i,undo:A}};var tr=/ data-layer-id="\d+"/g,rr=/\s{2,}/g,Me=JSON.parse(window.localStorage.getItem("drawing"))||{},g={layers:Me.layers||[],outputConfig:Me.outputConfig||{...f.outputConfig},transforms:Me.transforms||C(f.transforms)},dt=()=>window.localStorage.setItem("drawing",JSON.stringify(g)),{createBackup:nr,redo:ue,undo:ge}=lt(g,dt),c=g;function Be(){return[g.outputConfig["vb-min-x"],g.outputConfig["vb-min-y"],g.outputConfig["vb-width"],g.outputConfig["vb-height"]]}function pe(){let{x:e,y:t,width:r,height:n}=L.getBBox();Object.assign(g.outputConfig,{"vb-min-x":Math.trunc(e).toString(),"vb-min-y":Math.trunc(t).toString(),"vb-width":Math.trunc(r).toString(),"vb-height":Math.trunc(n).toString()}),$e(),fe(g),m("centerVB")}function ye(){return`<svg xmlns="http://www.w3.org/2000/svg" 
    width="${g.outputConfig.width}" 
    height="${g.outputConfig.height}" 
    viewBox="${Be()}" 
    preserveAspectRatio="${`${g.outputConfig.ratio} ${g.outputConfig["slice-or-meet"]}`}">
    <g transform="${N(g.transforms)}">${L.innerHTML}</g></svg>`.replace(tr,"").replace(rr," ")}function Ae(){return`data:image/svg+xml,${ye().replace(/"/g,"'")}`.replace(/#/g,"%23")}function m(e){nr({layers:C(g.layers),transforms:C(g.transforms)}),console.log(e),dt()}function Pe(){xe.innerHTML=ye(),Be().every(e=>e===0)&&pe()}function $e(){u(xe.firstElementChild,{width:g.outputConfig.width,height:g.outputConfig.height,viewBox:Be(),preserveAspectRatio:`${g.outputConfig.ratio} ${g.outputConfig["slice-or-meet"]}`})}var mt={rect:(e,t)=>(r,n)=>({x:Math.min(e,r),y:Math.min(t,n),width:Math.abs(e-r),height:Math.abs(t-n)}),ellipse:(e,t)=>(r,n)=>({rx:Math.abs(e-r),ry:Math.abs(t-n)})},V={rect:De((e,t,r,n)=>{if(t[0])return;let o=e.activeSVGElement;t.push({x:r,y:n}),u(o,t[0]),e.drawingShape=!0,Object.assign(e.shapeStart,{x:r,y:n}),p.onpointermove=Oe(o,mt.rect(r,n))},({points:[e]})=>({x:e.x,y:e.y,width:e.width||0,height:e.height||0})),ellipse:De((e,t,r,n)=>{if(t[0])return;let o=e.activeSVGElement;t.push({cx:r,cy:n}),u(o,t[0]),e.drawingShape=!0,Object.assign(e.shapeStart,{x:r,y:n}),p.onpointermove=Oe(o,mt.ellipse(r,n))},({points:[e]})=>({cx:e.cx,cy:e.cy,rx:e.rx||0,ry:e.ry||0})),path:De((e,t,r,n,o,s)=>{let i=S(t);if(i&&r===i.x&&n===i.y)return;t.length||(e.cmd="M"),i&&i.cmd===e.cmd&&["M","V","H"].includes(e.cmd)&&s(t.pop().cmd),t.push({cmd:e.cmd,x:r,y:n});let d=(h=>{switch(h){case"Q":case"S":return We(r,n,t[t.length-2]);case"C":return Je(r,n,t[t.length-2]);case"A":return J(e.arcCmdConfig);default:return{}}})(e.cmd);Object.assign(S(t),d),o(e.activeLayer,e.layerId)(S(t),y(t))},({points:e,closePath:t})=>({d:`${e.map(ie).join("")} ${t?"Z":""}`}))};function De(e,t){return{mkPoint:e,geometryProps:t}}function $(e,t=w[e],r=c.layers[e]){u(t,V[r.mode].geometryProps(r))}function ft(e,t,r){return Object.assign(Object.create(null),{mode:e,points:[],style:t,transforms:r})}function H(e=0,t=x.childElementCount){for(let r=e;r<t;r+=1){let n=w[r],o=x.children[r],[s,i]=o.children;n.dataset.layerId=r,o.dataset.layerId=r,s.textContent=c.layers[r].label||`Layer ${r+1}`,i.value=r}}function Re(e,t=c.layers[e].style){u(w[e],t)}var Q="http://www.w3.org/2000/svg",ut=(()=>{let e=u(document.createElement("label"),{draggable:!0}),t=u(document.createElement("span"),{contenteditable:!0}),r=u(document.createElement("input"),{type:"radio",name:"layer-selector"});return e.append(t,r),e})(),q={path:document.createElementNS(Q,"path"),rect:document.createElementNS(Q,"rect"),ellipse:document.createElementNS(Q,"ellipse")},gt=document.createElementNS(Q,"line"),pt=u(document.createElementNS(Q,"circle"),{r:3}),Ne=document.createElement("a"),he=document.createElement("img"),Ve=document.createElement("canvas");var yt=({x:e,y:t})=>({x:e,y:t}),Y=(e,t)=>({cx:e,cy:t}),Fe=e=>({cx:e}),ze=(e,t)=>({cy:t}),or={M:1,L:1,H:1,V:1,Q:2,C:3,A:1,S:2,T:1},ht=(e,t)=>e.points.slice(0,t).reduce((r,n)=>r+or[n.cmd],0),_e=(e,t)=>{let r=[];if(e.points[t+1]){let{cmd:n}=e.points[t+1];n==="V"?r.push(v(b[ht(e,t+1)],Fe)):n==="H"&&r.push(v(b[ht(e,t+1)],ze))}return r},Ct={regularPoint:j(yt,"control-point__regular",(e,t,r)=>{let n=_e(t,r);return[v(e,Y),...n]}),hCmd:j(({x:e})=>({x:e}),"control-point__h",(e,t,r)=>{let n=_e(t,r);return[v(e,Fe),...n]}),vCmd:j(({y:e})=>({y:e}),"control-point__v",(e,t,r)=>{let n=_e(t,r);return[v(e,ze),...n]}),firstControlPoint:j(({x:e,y:t})=>({x1:e,y1:t}),"control-point__a",e=>[v(e,Y)]),secondControlPoint:j(({x:e,y:t})=>({x2:e,y2:t}),"control-point__b",e=>[v(e,Y)]),rectTopLeft:j(yt,"control-point__rect-top-left",(e,t,r)=>{let n=t.points[r];return[v(e,Y),v(b[1],(o,s)=>({cx:o+n.width,cy:s+n.height}))]}),rectLowerRight:j(({x:e,y:t},r)=>({width:e>r.x?e-r.x:r.width,height:t>r.y?t-r.y:r.height}),"control-point__rect-bottom-right",(e,t,r)=>{let n=t.points[r];return[v(e,(o,s)=>{let i=o<n.x?n.x:o,d=s<n.y?n.y:s;return{cx:i,cy:d}})]}),ellipseCenter:j(({x:e,y:t})=>({cx:e,cy:t}),"control-point__ellipse-center",(e,t,r)=>{let n=t.points[r];return[v(e,Y),v(b[1],()=>({cx:n.cx-n.rx,cy:n.cy})),v(b[2],()=>({cx:n.cx,cy:n.cy-n.ry}))]}),rx:j(({x:e},t)=>({rx:Math.abs(e-t.cx)}),"control-point__ellipse-rx",e=>[v(e,Fe)]),ry:j(({y:e},t)=>({ry:Math.abs(e-t.cy)}),"control-point__ellipse-ry",e=>[v(e,ze)])};function j(e,t,r){return{changeData:e,CSSClass:t,getAffectedPoints:r}}function v(e,t){return{ref:e,fx:t}}var{regularPoint:ar,hCmd:sr,vCmd:cr,firstControlPoint:ir,secondControlPoint:lr,rectTopLeft:dr,rectLowerRight:mr,ellipseCenter:fr,rx:ur,ry:gr}=Ct,vt=()=>{Object.assign(p,{onpointermove:null,onpointerleave:null,onpointerup:null}),m("dragging")},yr=(e,t,r)=>n=>{n.stopPropagation(),Object.assign(p,{onpointermove:pr(e,t,r,n.target),onpointerleave:vt,onpointerup:vt})},bt={attributes:!0,attributeFilter:["cx","cy"]},Ge=(e,t,r,n,o,s)=>{let i=I(gt)({x1:e,y1:t,x2:r,y2:n}),d=new MutationObserver(()=>{i.setAttribute("x1",o.getAttribute("cx")),i.setAttribute("y1",o.getAttribute("cy"))}),h=new MutationObserver(()=>{i.setAttribute("x2",s.getAttribute("cx")),i.setAttribute("y2",s.getAttribute("cy"))});return d.observe(o,bt),h.observe(s,bt),i};function E(e,t,r,n,o){return I(pt)({class:`control-point ${n.CSSClass}`,cx:e,cy:t,onpointerdown:yr(o,r,n)})}function pr(e,t,r,n){let o=c.layers[e],s=o.points[t],{changeData:i}=r,d=r.getAffectedPoints(n,o,t);return h=>{let[A,P]=k(h);Object.assign(s,i({x:A,y:P},s)),$(e),d.forEach(({ref:we,fx:Xt})=>u(we,Xt(A,P)))}}function K(e,t){return(r,n)=>{let o=[];if("cmd"in r)if(["M","L","Q","C","A","S","T"].includes(r.cmd)){let s=E(r.x,r.y,n,ar,t);if(["Q","C","S"].includes(r.cmd)){let i=e.points[n-1],d=E(r.x1,r.y1,n,ir,t);if(o.push(d),r.cmd!=="S"&&o.push(Ge(r.x1,r.y1,i.x,i.y,d,S(b))),r.cmd==="C"){let h=E(r.x2,r.y2,n,lr,t);o.push(h,Ge(r.x,r.y,r.x2,r.y2,s,h))}["Q","S"].includes(r.cmd)&&o.push(Ge(r.x,r.y,r.x1,r.y1,s,d))}o.push(s)}else r.cmd==="H"?o.push(E(r.x,e.points[n-1].y,n,sr,t)):r.cmd==="V"&&o.push(E(e.points[n-1].x,r.y,n,cr,t));else"width"in r?o.push(E(r.x,r.y,n,dr,t),E(r.x+r.width,r.y+r.height,n,mr,t)):"cx"in r&&o.push(E(r.cx,r.cy,n,fr,t),E(r.cx-r.rx,r.cy,n,ur,t),E(r.cx,r.cy-r.ry,n,gr,t));T.append(...o)}}function Ue(e){if(b[y(b)].remove(),["Q","C","S"].includes(e)){let t=e==="S"?1:2;for(let r=0;r<t;r+=1)Se[y(Se)].remove();b[y(b)].remove(),e==="C"&&b[y(b)].remove()}}function F(){[...T.children].forEach(e=>{e.remove()})}var hr=Object.keys(V),wt=e=>typeof e=="boolean",Lt,xt=!1,St,jt,Et=!1,l={arcCmdConfig:{...f.arcCmdConfig},get activeLayer(){return c.layers[l.layerId]},get activeSVGElement(){return w[l.layerId]},get cmd(){return Lt},set cmd(e){let t=U.includes(e)?e:U[0];Lt=t,ee.value=t},get drawingShape(){return xt},set drawingShape(e){wt(e)&&(xt=e)},get layerId(){return St},set layerId(e){if(e===void 0&&c.layers.length===0||!Number.isNaN(Number(e))&&e>=0&&e<c.layers.length){if(St=Number(e),e===void 0)return;O(c,l),F(),He(),ke(l),Ie(l),me(c.layers[e].style),_.checked=l.activeLayer.closePath,M.checked&&B(c.layers[e].transforms)}},get mode(){return jt},set mode(e){hr.includes(e)&&(jt=e,ne.modes.value=e,document.body.dataset.mode=e)},shapeStart:{},get transformLayerNotDrawing(){return Et},set transformLayerNotDrawing(e){wt(e)&&(Et=e)},get transformTarget(){return(l.transformLayerNotDrawing?l.activeLayer:c).transforms}};document.addEventListener("initializeCanvas",Ce);window.addEventListener("DOMContentLoaded",()=>{Object.assign(l,{cmd:"M",layerId:c.layers.length?0:void 0,mode:c.layers[0]?.mode||f.mode}),Ce()},{once:!0});var a=l;var Cr=e=>{e.dataTransfer.setData("text",e.target.dataset.layerId),e.dataTransfer.effectAllowed="move"},vr=({target:e})=>{l.activeLayer.label=e.textContent.replace(/\n/g,/\s/).trim(),m("changeLabel")};function He(){!l.activeLayer||l.activeLayer.points.forEach(K(l.activeLayer,l.layerId))}function ve(e=x.childElementCount){let t=ut.cloneNode(!0),[r,n]=t.children;t.dataset.layerId=e,t.ondragstart=Cr,r.oninput=vr,u(r,{textContent:c.layers[e]&&c.layers[e].label||`Layer ${e+1}`}),u(n,{value:e,checked:l.layerId===D.length}),x.append(t),H(e),je.display="none"}function Qe(){let e=w.length;for(je.display=e?"none":"initial";x.childElementCount!==e;)x.lastChild.remove();e===0?l.layerId=void 0:l.layerId===e?l.layerId-=1:(l.layerId===void 0&&(l.layerId=0),O(c,l),H(l.layerId),me(l.activeLayer.style),He(),l.mode=l.activeLayer.mode),D[l.layerId]&&(D[l.layerId].checked=!0)}function Ce(){F(),[...w].forEach(e=>e.remove()),Qe(),He(),L.append(...c.layers.map((e,t)=>{let r=q[e.mode],n=e.mode==="path"?{d:`${e.points.map(ie).join(" ")}${e.closePath?"Z":""}`}:e.points[0]||{};return I(r)({"data-layer-id":t,...e.style,...n,transform:N(e.transforms)})})),c.layers.forEach((e,t)=>ve(t)),_.checked=l.activeLayer&&l.activeLayer.closePath,ke(l),O(c,l),B(l.transformTarget),M.checked=l.transformLayerNotDrawing,me(l.activeLayer?.style||f.style),Ie(l),fe(c)}var br=["data-layer-id","transform"],X=Ve.getContext("2d"),Ot=e=>{Object.assign(Ne,{download:`My_SVG.${c.outputConfig["file-format"]}`,href:e}),Ne.click()},Tt=e=>window.navigator.clipboard.writeText(e),It={C:qe,Z:ge,Y:ue};window.onkeyup=({key:e})=>{Ee[e]&&m("keyup")};G.onchange=()=>m("setTransform");function be(){c.layers.push(ft(a.mode,(a.activeLayer?st:Te)(a.mode),C(f.transforms))),a.layerId=y(c.layers),L.append(I(q[a.mode])({"data-layer-id":a.layerId})),ve(a.layerId)}function kt(e){a.activeLayer||be();let[t,r]=k(e),{points:n}=a.activeLayer;V[a.mode].mkPoint(a,n,t,r,K,Ue),a.mode==="path"&&T.lastElementChild.dispatchEvent(new Event("pointerdown")),Re(a.layerId),$(a.layerId)}function Mt(){let e=a.transformLayerNotDrawing?[a.activeSVGElement,a.activeLayer.transforms]:[p.firstElementChild,c.transforms];wr(...e),O(c,a)}function Bt(){Object.assign(c,{layers:[],outputConfig:{...f.outputConfig},transforms:C(f.transforms)}),Ce(),m("clear")}function $t({target:e}){if(a.arcCmdConfig[e.name]=e[e.type==="checkbox"?"checked":"value"],!a.activeLayer)return;let t=ce(a.activeLayer.points);!t||(Object.assign(t,J(a.arcCmdConfig)),$(a.layerId),m("configArcCmd"))}function At({target:{name:e,value:t}}){c.outputConfig[e]=t,$e(),m("configOutput")}function Pt(){Tt(Ae())}function Dt(){Tt(ye())}function Ye(){if(!a.activeLayer?.points.length)return;let e=a.activeLayer.points.pop();if(m("deleteLastPoint"),e.cmd)Ue(e.cmd),$(a.layerId);else{let t=a.activeSVGElement;F(),t.getAttributeNames().filter(r=>!br.includes(r)).forEach(r=>t.removeAttribute(r))}}function Rt(){!w.length||(c.layers.splice(a.layerId,1),a.activeSVGElement.remove(),F(),Qe(),m("deleteLayer"),a.mode=a.activeLayer.mode)}function qe(){c.layers.splice(a.layerId,0,C(a.activeLayer)),a.activeSVGElement.after(a.activeSVGElement.cloneNode(!0)),a.layerId+=1,ve(a.layerId),m("ctrl+c")}function Nt(e){if(!a.drawingShape)return;a.drawingShape=!1;let[t,r]=k(e),{points:n=[]}=a.activeLayer,o={hor:Math.abs(a.shapeStart.x-t),vert:Math.abs(a.shapeStart.y-r)};Object.assign(n[0],a.mode==="rect"?{x:Math.min(a.shapeStart.x,t),y:Math.min(a.shapeStart.y,r),width:o.hor,height:o.vert}:{rx:o.hor,ry:o.vert}),m("drawShape"),K(a.activeLayer,a.layerId)(S(n),y(n)),p.onpointermove=null}function Vt(e){let{key:t}=e;if(t==="F12"||(t==="Enter"&&e.target.contentEditable&&e.target.blur(),document.activeElement!==document.body))return;let r=Ee[t];if(e.ctrlKey&&It[t.toUpperCase()])It[t.toUpperCase()]();else if(r){if(!a.activeLayer&&!e.ctrlKey)return;let{transforms:{translate:n}}=e.ctrlKey?c:a.activeLayer,{cb:o,prop:s}=r;n[s]=o(+n[s]),O(c,a)}else t==="Backspace"?Ye():U.includes(t.toUpperCase())&&(a.cmd=t.toUpperCase());e.preventDefault()}function Ft(e){let r=+e.target.closest("label").dataset.layerId,n=w[r],o=+e.dataTransfer.getData("text"),s=w[o],[i]=c.layers.splice(o,1);c.layers.splice(r,0,i),m("reorderLayer"),o<r?n.after(s):L.insertBefore(s,n),o!==a.layerId?o>a.layerId&&r<=a.layerId?a.layerId+=1:o<a.layerId&&r>a.layerId&&(a.layerId-=1):a.layerId=r,H(Math.min(o,r),Math.max(o,r)+1),D[a.layerId].checked=!0,e.preventDefault()}function zt(){let{transforms:e}=f;M.checked&&a.activeLayer?a.activeLayer.transforms=C(e):c.transforms=C(e),O(c,a),B(e),m("resetTransforms")}function wr(e,t){let{x:r,y:n,width:o,height:s}=e.getBBox(),i=[Math.trunc(r+o*.5),Math.trunc(n+s*.5)];[R.rotate[1].value,R.rotate[2].value]=i,[t.rotate[1],t.rotate[2]]=i,m("setCenterofRotation")}function _t({target:{value:e}}){a.cmd=e}function Gt({target:{name:e,value:t}}){!a.activeLayer||(a.activeLayer.style[e]=t,e==="fill"&&a.activeLayer.style["fill-opacity"]==="0"&&(a.activeLayer.style["fill-opacity"]="1"),Re(a.layerId))}z.onchange=()=>m("setFillOrStroke");function Ut({target:{value:e}}){let t=+e;a.mode=c.layers[t].mode,a.layerId=t}function Ht({target:{value:e},currentTarget:t}){if(a.drawingShape){t.modes.value=a.mode;return}if(a.mode=e,!!a.activeLayer)if(a.activeLayer.points.length)be();else{a.activeLayer.mode=a.mode;let r=I(q[a.mode])({"data-layer-id":a.layerId}),n=a.activeSVGElement;n.replaceWith(r),n.remove(),Object.keys(a.activeLayer.style).forEach(o=>{o in f.styleRelevancies&&!f.styleRelevancies[o].includes(a.mode)&&delete a.activeLayer.style[o]}),Object.assign(a.activeLayer.style,Te(a.mode)),m("setMode")}}function Qt({target:{classList:e,dataset:t,name:r,value:n}}){if(e.contains("transform-config")){let{transform:o,id:s}=t;a.transformTarget[o][+s]=n}else a.transformTarget[r]=n;O(c,a)}function qt({target:{checked:e}}){e?B(a.activeLayer?a.activeLayer.transforms:f.transforms):B(c.transforms),a.transformLayerNotDrawing=e}function Yt({target:e}){!a.activeLayer||(a.activeLayer.closePath=e.checked,$(a.layerId),m("togglePathClosing"))}function Kt(){let e=Ae();c.outputConfig["file-format"]==="svg"?Ot(e):(he.src=e,he.onload=()=>{X.clearRect(0,0,X.canvas.width,X.canvas.height),Object.assign(X.canvas,{width:c.outputConfig.width,height:c.outputConfig.height}),X.drawImage(he,0,0),Ot(Ve.toDataURL())})}W.oninput=$t;ee.onchange=_t;document.getElementById("reset-transforms").onclick=zt;document.getElementById("get-markup").onclick=Dt;document.getElementById("get-data-uri").onclick=Pt;document.getElementById("center-rotation-btn").onclick=Mt;document.getElementById("center-vb").onclick=pe;document.getElementById("add-layer").onclick=be;document.getElementById("del-layer").onclick=Rt;document.getElementById("clear-all").onclick=Bt;document.getElementById("del-last-point").onclick=Ye;document.getElementById("duplicate-layer").onclick=qe;document.querySelector('a[data-tab-name="output"]').onclick=Pe;et.onclick=Kt;z.oninput=Gt;x.onchange=Ut;x.ondrop=Ft;ne.onchange=Ht;re.oninput=At;_.onchange=Yt;oe.addEventListener("click",ue);p.addEventListener("pointerdown",kt);document.addEventListener("pointerup",Nt);G.oninput=Qt;M.onchange=qt;se.addEventListener("click",ge);window.onkeydown=Vt;})();
