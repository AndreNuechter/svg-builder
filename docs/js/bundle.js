(()=>{var gn=(()=>window.addEventListener("load",()=>{let e=({target:{parentElement:t}})=>{t.classList.toggle("closed"),t.classList.toggle("open")};[...document.getElementsByClassName("togglable")].forEach(t=>{t.firstElementChild.onclick=e,!t.classList.contains("open")&&!t.classList.contains("closed")&&t.classList.add("closed")})},{once:!0}))();var be=({x:e,y:t})=>`${e} ${t}`,Z={H:({x:e})=>e,V:({y:e})=>e,Q:({x:e,x1:t,y:n,y1:r})=>`${t} ${r} ${e} ${n}`,C:({x:e,x1:t,x2:n,y:r,y1:a,y2:s})=>`${t} ${a} ${n} ${s} ${e} ${r}`,A:({x:e,xR:t,xRot:n,y:r,yR:a,large:s,sweep:l})=>`${t} ${a} ${n} ${s} ${l} ${e} ${r}`,S:({x:e,x1:t,y:n,y1:r})=>`${t} ${r} ${e} ${n}`,T:be,M:be,L:be},Qe=33,Ke=(e,t,n,r)=>e<t?n>r?-Qe:Qe:0,Ye=(e,t,n,r)=>{let a=Math.abs(n-e),s=Math.abs(r-t),l=Math.min(e,n),g=Math.min(t,r),x=Ke(s,a,n,e),$=Ke(a,s,r,t);return{xMin:l,yMin:g,yOffset:x,xOffset:$}};function _(e){return{xR:e.xR,yR:e.yR,xRot:e.xRot,large:+e.large,sweep:+e.sweep}}function qe(e,t,{x:n,y:r}){let{xMin:a,yMin:s,yOffset:l,xOffset:g}=Ye(e,t,n,r);return{x1:a-g+(Math.max(e,n)-a)*.25,y1:s-l+(Math.max(t,r)-s)*.25,x2:a-g+(Math.max(e,n)-a)*.75,y2:s-l+(Math.max(t,r)-s)*.75}}function Xe(e,t,{x:n,y:r}){let{xMin:a,yMin:s,yOffset:l,xOffset:g}=Ye(e,t,n,r);return{x1:a-g+(Math.max(e,n)-a)*.5,y1:s-l+(Math.max(t,r)-s)*.5}}var J=document.getElementById("arc-cmd-config"),W=document.getElementById("commands"),w=document.getElementsByClassName("control-point"),P=document.getElementById("control-point-container"),Ze=document.getElementById("download-btn"),b=document.getElementById("drawing-content"),G=document.getElementById("fill-and-stroke"),{elements:ee}=G,v=b.children,L=document.getElementById("layer-select"),D=document.getElementsByName("layer-selector"),te=document.getElementById("output-configuration"),ne=document.getElementById("modes"),Le=document.getElementById("preview"),U=document.getElementById("close-path-toggle"),re=document.getElementById("redo-btn"),u=document.getElementById("canvas"),H=document.getElementById("transformations"),oe=H.elements,_e=oe.rotate.getElementsByTagName("input"),Je=oe.scale.getElementsByTagName("input"),[O]=document.getElementsByName("transform-layer-only"),ae=document.getElementById("undo-btn"),xe=document.getElementById("no-layer-msg").style;var Gt=["checked","textContent","data","onpointerdown","onpointerup"];function E(e,t){let n=R(e.transforms),r=[b,P],a=[n];if(t.activeSVGElement){let s=R(t.activeLayer.transforms);r.push(t.activeSVGElement),a.push(n+s,s)}else a.push(n);r.forEach((s,l)=>s.setAttribute("transform",a[l]))}function p(e){if(typeof e!="object"||e===null)return e;let t=Array.isArray(e)?[]:{};return Object.keys(e).forEach(n=>{t[n]=p(e[n])}),t}function I(e){return t=>m(e.cloneNode(!1),t)}function m(e,t){return Object.keys(t).forEach(n=>{Gt.includes(n)?e[n]=t[n]:e.setAttribute(n,t[n])}),e}function je(e,t){return n=>{let[r,a]=k(n);m(e,t(r,a))}}function se(e){return e.slice().reverse().find(t=>t.cmd==="A")}function Se(e){return[...ee].filter(t=>{if(!t.hasAttribute("name"))return!1;let n=t.closest("label").classList;return n.contains("for-all")||n.contains(`for-${e}`)}).reduce((t,n)=>Object.assign(t,{[n.name]:n.value}),{})}function k({x:e,y:t}){let n=u.createSVGPoint();return Object.assign(n,{x:e,y:t}),n=n.matrixTransform(u.children[1].getScreenCTM().inverse()),[n.x,n.y]}function T(e){return e[y(e)]}function y(e){return e.length-1}function ce(e){return`${e.cmd}${Z[e.cmd](e)}`}function R(e){return Object.entries(e).reduce((t,[n,r])=>`${t}${n}(${typeof r=="object"?r.filter(a=>a!==""):r})`,"")}var ie=document.getElementById("coords"),Ut=e=>{let[t,n]=k(e);ie.textContent=`x: ${Math.trunc(t)}, y: ${Math.trunc(n)}`,ie.style.left=`${e.pageX-120}px`,ie.style.top=`${e.pageY-40}px`},xn=(()=>{u.addEventListener("pointermove",Ut),u.addEventListener("pointerleave",()=>{ie.style=null})})();var Sn=(()=>{let{body:e}=document,t=document.getElementById("tabs"),n=[...t.children],r=["drawing","output"],a=()=>{let s=window.location.hash.slice(1),l=r.includes(s)?s:r[0];e.dataset.activeTab=l,document.querySelector(`a[data-tab-name="${l}"]`).click(),l!==s&&(window.location.hash=l)};window.addEventListener("DOMContentLoaded",a,{once:!0}),window.onhashchange=a,t.onclick=({target:s})=>{!s.classList.contains("tab")||(e.dataset.activeTab=s.dataset.tabName,n.forEach(l=>l.classList.remove("active")),s.classList.add("active"))}})();var Q=Object.freeze(Object.keys(Z)),V=Object.freeze({scale:Je,rotate:_e}),h=Object.freeze({mode:"path",closePath:!1,outputConfig:Object.freeze({width:"320",height:"180","vb-min-x":"0","vb-min-y":"0","vb-width":"0","vb-height":"0",ratio:"xMidYMid","slice-or-meet":"meet","file-format":"svg"}),transforms:Object.freeze({translate:Object.freeze([0,0]),scale:Object.freeze(["1","1"]),rotate:Object.freeze(["0","0","0"]),skewX:"0",skewY:"0"}),style:Object.freeze({stroke:"#000","stroke-opacity":"1","stroke-width":"2",fill:"#000","fill-opacity":"0","stroke-linecap":"butt","stroke-linejoin":"arcs","stroke-miterlimit":"1","fill-rule":"evenodd"}),styleRelevancies:Object.freeze({"stroke-linecap":"path","stroke-linejoin":"path,rect","stroke-miterlimit":"path,rect","fill-rule":"path"}),arcCmdConfig:Object.freeze({xR:"50",yR:"50",xRot:"0",large:!1,sweep:!1})}),We=e=>e+1,et=e=>e-1,Ee=Object.freeze({ArrowUp:Object.freeze({prop:1,cb:et}),ArrowDown:Object.freeze({prop:1,cb:We}),ArrowLeft:Object.freeze({prop:0,cb:et}),ArrowRight:Object.freeze({prop:0,cb:We})});var{elements:Ht}=te,tt=(e,t)=>{Object.entries(t).forEach(([n,r])=>{e[n].value=r})};window.onsubmit=e=>e.preventDefault();function Te(e){if(e.mode!=="path")return;let t=e.activeLayer&&se(e.activeLayer.points)||e.arcCmdConfig;Object.assign(e.arcCmdConfig,t),Object.entries(t).filter(([n])=>!["cmd","x","y"].includes(n)).forEach(([n,r])=>{let a=J.elements[n];a[a.type==="checkbox"?"checked":"value"]=r})}function Oe(e){!e.activeLayer||e.activeLayer.mode!=="path"||(e.cmd=e.activeLayer.points.length?T(e.activeLayer.points).cmd:"M")}function le(e){tt(ee,e)}function de({outputConfig:e}){tt(Ht,e)}function M(e){Object.entries(e).filter(([t])=>t!=="translate").forEach(([t,n])=>{V[t]?n.forEach((r,a)=>{V[t][a].value=r}):oe[t].value=n})}var nt=(e,t)=>{let n=[p(e)],r=0;document.addEventListener("DOMContentLoaded",x,{once:!0});function a(A){r<y(n)&&(n.length=r+1),n.push(A),r=y(n),x()}function s(){return n[r]}function l(){r<y(n)&&(r+=1,g(),x())}function g(){let{layers:A,transforms:ve}=s();Object.assign(e,{layers:p(A),transforms:p(ve)}),t(),document.dispatchEvent(new Event("initializeCanvas"))}function x(){ae.disabled=r===0,re.disabled=r===y(n)}function $(){n.length>1&&r>0&&(r-=1,g(),x())}return{createBackup:a,redo:l,undo:$}};var Qt=/ data-layer-id="\d+"/g,Kt=/\s{2,}/g,Ie=JSON.parse(window.localStorage.getItem("drawing"))||{},f={layers:Ie.layers||[],outputConfig:Ie.outputConfig||{...h.outputConfig},transforms:Ie.transforms||p(h.transforms)},rt=()=>window.localStorage.setItem("drawing",JSON.stringify(f)),{createBackup:Yt,redo:me,undo:fe}=nt(f,rt),c=f;function ke(){return[f.outputConfig["vb-min-x"],f.outputConfig["vb-min-y"],f.outputConfig["vb-width"],f.outputConfig["vb-height"]]}function ue(){let{x:e,y:t,width:n,height:r}=b.getBBox();Object.assign(f.outputConfig,{"vb-min-x":Math.trunc(e).toString(),"vb-min-y":Math.trunc(t).toString(),"vb-width":Math.trunc(n).toString(),"vb-height":Math.trunc(r).toString()}),Me(),de(f),d("centerVB")}function ge(){return`<svg xmlns="http://www.w3.org/2000/svg" 
    width="${f.outputConfig.width}" 
    height="${f.outputConfig.height}" 
    viewBox="${ke()}" 
    preserveAspectRatio="${`${f.outputConfig.ratio} ${f.outputConfig["slice-or-meet"]}`}">
    <g transform="${R(f.transforms)}">${b.innerHTML}</g></svg>`.replace(Qt,"").replace(Kt," ")}function Be(){return`data:image/svg+xml,${ge().replace(/"/g,"'")}`.replace(/#/g,"%23")}function d(e){Yt({layers:p(f.layers),transforms:p(f.transforms)}),console.log(e),rt()}function $e(){Le.innerHTML=ge(),ke().every(e=>e===0)&&ue()}function Me(){m(Le.firstElementChild,{width:f.outputConfig.width,height:f.outputConfig.height,viewBox:ke(),preserveAspectRatio:`${f.outputConfig.ratio} ${f.outputConfig["slice-or-meet"]}`})}var ot={rect:(e,t)=>(n,r)=>({x:Math.min(e,n),y:Math.min(t,r),width:Math.abs(e-n),height:Math.abs(t-r)}),ellipse:(e,t)=>(n,r)=>({rx:Math.abs(e-n),ry:Math.abs(t-r)})},N={rect:Ae((e,t,n,r)=>{if(t[0])return;let a=e.activeSVGElement;t.push({x:n,y:r}),m(a,t[0]),e.drawingShape=!0,Object.assign(e.shapeStart,{x:n,y:r}),u.onpointermove=je(a,ot.rect(n,r))},({points:[e]})=>({x:e.x,y:e.y,width:e.width||0,height:e.height||0})),ellipse:Ae((e,t,n,r)=>{if(t[0])return;let a=e.activeSVGElement;t.push({cx:n,cy:r}),m(a,t[0]),e.drawingShape=!0,Object.assign(e.shapeStart,{x:n,y:r}),u.onpointermove=je(a,ot.ellipse(n,r))},({points:[e]})=>({cx:e.cx,cy:e.cy,rx:e.rx||0,ry:e.ry||0})),path:Ae((e,t,n,r,a,s)=>{let l=T(t);if(l&&n===l.x&&r===l.y)return;t.length||(e.cmd="M"),l&&l.cmd===e.cmd&&["M","V","H"].includes(e.cmd)&&s(t.pop().cmd),t.push({cmd:e.cmd,x:n,y:r});let g=(x=>{switch(x){case"Q":case"S":return Xe(n,r,t[t.length-2]);case"C":return qe(n,r,t[t.length-2]);case"A":return _(e.arcCmdConfig);default:return{}}})(e.cmd);Object.assign(T(t),g),a(e.activeLayer,e.layerId)(T(t),y(t))},({points:e,closePath:t})=>({d:`${e.map(ce).join("")} ${t?"Z":""}`}))};function Ae(e,t){return{mkPoint:e,geometryProps:t}}function B(e,t=v[e],n=c.layers[e]){m(t,N[n.mode].geometryProps(n))}function at(e,t,n){return Object.assign(Object.create(null),{mode:e,points:[],style:t,transforms:n})}function K(e=0,t=L.childElementCount){for(let n=e;n<t;n+=1){let r=L.children[n],[a,s]=r.children;v[n].dataset.layerId=n,r.dataset.layerId=n,a.textContent=c.layers[n].label||`Layer ${n+1}`,s.value=n}}function Pe(e,t=c.layers[e].style){m(v[e],t)}var pe="http://www.w3.org/2000/svg",st=(()=>{let e=m(document.createElement("label"),{draggable:!0}),t=m(document.createElement("span"),{contenteditable:!0}),n=m(document.createElement("input"),{type:"radio",name:"layer-selector"});return e.append(t,n),e})(),Y={path:document.createElementNS(pe,"path"),rect:document.createElementNS(pe,"rect"),ellipse:document.createElementNS(pe,"ellipse")},ct=m(document.createElementNS(pe,"circle"),{r:3,class:"control-point"}),De=document.createElement("a"),ye=document.createElement("img"),Re=document.createElement("canvas");var it=({x:e,y:t})=>({x:e,y:t}),q=(e,t)=>({cx:e,cy:t}),Ve=e=>({cx:e}),Ne=(e,t)=>({cy:t}),qt={M:1,L:1,H:1,V:1,Q:2,C:3,A:1,S:2,T:1},lt=(e,t)=>e.points.slice(0,t).reduce((n,r)=>n+qt[r.cmd],0),Fe=(e,t)=>{let n=[];if(e.points[t+1]){let{cmd:r}=e.points[t+1];r==="V"?n.push(C(w[lt(e,t+1)],Ve)):r==="H"&&n.push(C(w[lt(e,t+1)],Ne))}return n},dt={regularPoint:j(it,(e,t,n)=>{let r=Fe(t,n);return[C(e,q),...r]}),hCmd:j(({x:e})=>({x:e}),(e,t,n)=>{let r=Fe(t,n);return[C(e,Ve),...r]}),vCmd:j(({y:e})=>({y:e}),(e,t,n)=>{let r=Fe(t,n);return[C(e,Ne),...r]}),firstControlPoint:j(({x:e,y:t})=>({x1:e,y1:t}),e=>[C(e,q)]),secondControlPoint:j(({x:e,y:t})=>({x2:e,y2:t}),e=>[C(e,q)]),rectTopLeft:j(it,(e,t,n)=>{let r=t.points[n];return[C(e,q),C(w[1],(a,s)=>({cx:a+r.width,cy:s+r.height}))]}),rectLowerRight:j(({x:e,y:t},n)=>({width:e>n.x?e-n.x:n.width,height:t>n.y?t-n.y:n.height}),(e,t,n)=>{let r=t.points[n];return[C(e,(a,s)=>{let l=a<r.x?r.x:a,g=s<r.y?r.y:s;return{cx:l,cy:g}})]}),ellipseCenter:j(({x:e,y:t})=>({cx:e,cy:t}),(e,t,n)=>{let r=t.points[n];return[C(e,q),C(w[1],()=>({cx:r.cx-r.rx,cy:r.cy})),C(w[2],()=>({cx:r.cx,cy:r.cy-r.ry}))]}),rx:j(({x:e},t)=>({rx:Math.abs(e-t.cx)}),e=>[C(e,Ve)]),ry:j(({y:e},t)=>({ry:Math.abs(e-t.cy)}),e=>[C(e,Ne)])};function j(e,t){return{changeData:e,getAffectedPoints:t}}function C(e,t){return{ref:e,fx:t}}var{regularPoint:Xt,hCmd:Zt,vCmd:_t,firstControlPoint:Jt,secondControlPoint:Wt,rectTopLeft:en,rectLowerRight:tn,ellipseCenter:nn,rx:rn,ry:on}=dt,mt=()=>{Object.assign(u,{onpointermove:null,onpointerleave:null,onpointerup:null}),d("dragging")},sn=(e,t,n)=>r=>{r.stopPropagation(),Object.assign(u,{onpointermove:an(e,t,n,r.target),onpointerleave:mt,onpointerup:mt})};function ze(e){w[y(w)].remove(),["Q","C","S"].includes(e)&&w[y(w)].remove(),e==="C"&&w[y(w)].remove()}function F(){[...w].forEach(e=>e.remove())}function z(e,t){return(n,r)=>{let a=[];"cmd"in n?(["Q","C","S"].includes(n.cmd)&&a.push(S(n.x1,n.y1,r,Jt,t)),n.cmd==="C"&&a.push(S(n.x2,n.y2,r,Wt,t)),["M","L","Q","C","A","S","T"].includes(n.cmd)?a.push(S(n.x,n.y,r,Xt,t)):n.cmd==="H"?a.push(S(n.x,e.points[r-1].y,r,Zt,t)):n.cmd==="V"&&a.push(S(e.points[r-1].x,n.y,r,_t,t))):"width"in n?a.push(S(n.x,n.y,r,en,t),S(n.x+n.width,n.y+n.height,r,tn,t)):"cx"in n&&a.push(S(n.cx,n.cy,r,nn,t),S(n.cx-n.rx,n.cy,r,rn,t),S(n.cx,n.cy-n.ry,r,on,t)),P.append(...a)}}function S(e,t,n,r,a){return I(ct)({cx:e,cy:t,onpointerdown:sn(a,n,r)})}function an(e,t,n,r){let a=c.layers[e],s=a.points[t],{changeData:l}=n,g=n.getAffectedPoints(r,a,t);return x=>{let[$,A]=k(x);Object.assign(s,l({x:$,y:A},s)),B(e),g.forEach(({ref:ve,fx:zt})=>m(ve,zt($,A)))}}var cn=Object.keys(N),ft=e=>typeof e=="boolean",ut,gt=!1,pt,yt,ht=!1,i={arcCmdConfig:{...h.arcCmdConfig},get activeLayer(){return c.layers[i.layerId]},get activeSVGElement(){return v[i.layerId]},get cmd(){return ut},set cmd(e){let t=Q.includes(e)?e:Q[0];ut=t,W.value=t},get drawingShape(){return gt},set drawingShape(e){ft(e)&&(gt=e)},get layerId(){return pt},set layerId(e){if(e===void 0&&!c.layers.length||+e>=0&&+e<c.layers.length){if(pt=e,e===void 0)return;F(),Ct(),U.checked=i.activeLayer.closePath,Oe(i),Te(i),le(c.layers[e].style),O.checked&&M(c.layers[e].transforms),E(c,i)}},get mode(){return yt},set mode(e){cn.includes(e)&&(yt=e,ne.modes.value=e,document.body.dataset.mode=e)},shapeStart:{},get transformLayerNotDrawing(){return ht},set transformLayerNotDrawing(e){ft(e)&&(ht=e)},get transformTarget(){return(i.transformLayerNotDrawing?i.activeLayer:c).transforms}};document.addEventListener("initializeCanvas",he);window.addEventListener("DOMContentLoaded",()=>{Object.assign(i,{cmd:"M",layerId:c.layers.length?0:void 0,mode:c.layers[0]?.mode||h.mode}),he()},{once:!0});var o=i;var ln=e=>{e.dataTransfer.setData("text",e.target.dataset.layerId),e.dataTransfer.effectAllowed="move"},dn=({target:e})=>{i.activeLayer.label=e.textContent.replace(/\n/g,/\s/).trim(),d("changeLabel")};function Ct(){if(!i.activeLayer)return;let e=z(i.activeLayer,i.layerId);i.activeLayer.points.forEach(e)}function Ce(e=L.childElementCount){let t=st.cloneNode(!0),[n,r]=t.children;t.dataset.layerId=e,t.ondragstart=ln,n.oninput=dn,m(n,{textContent:c.layers[e]&&c.layers[e].label||`Layer ${e+1}`}),m(r,{value:e,checked:i.layerId===D.length}),L.append(t),K(e),xe.display="none"}function Ge(){for(xe.display=b.childElementCount?"none":"initial";L.childElementCount!==v.length;)L.lastChild.remove();if(!v.length)i.layerId=void 0;else if(i.layerId===v.length)i.layerId-=1;else{i.layerId===void 0&&(i.layerId=0);let e=z(i.activeLayer,i.layerId);le(i.activeLayer.style),K(i.layerId),i.activeLayer.points.forEach(e),i.mode=i.activeLayer.mode}D[i.layerId]&&(D[i.layerId].checked=!0)}function he(){F(),[...v].forEach(e=>e.remove()),Ge(),Ct(),b.append(...c.layers.map((e,t)=>{let n=Y[e.mode],r=e.mode==="path"?{d:`${e.points.map(ce).join(" ")}${e.closePath?"Z":""}`}:e.points[0]||{};return I(n)({"data-layer-id":t,...e.style,...r,transform:R(e.transforms)})})),c.layers.forEach((e,t)=>Ce(t)),U.checked=i.activeLayer&&i.activeLayer.closePath,Oe(i),E(c,i),M(i.transformTarget),O.checked=i.transformLayerNotDrawing,le(i.activeLayer?i.activeLayer.style:h.style),Te(i),de(c)}var mn=["data-layer-id","transform"],X=Re.getContext("2d"),wt=e=>{Object.assign(De,{download:`My_SVG.${c.outputConfig["file-format"]}`,href:e}),De.click()},vt=e=>window.navigator.clipboard.writeText(e),bt={C:Ue,Z:fe,Y:me};window.onkeyup=({key:e})=>{Ee[e]&&d("keyup")};H.onchange=()=>d("setTransform");function we(){c.layers.push(at(o.mode,{...Se(o.mode)},p(h.transforms))),o.layerId=y(c.layers),b.append(I(Y[o.mode])({"data-layer-id":o.layerId})),Ce(o.layerId)}function Lt(e){o.activeLayer||we();let[t,n]=k(e),{points:r}=o.activeLayer;if(o.drawingShape){let a={hor:Math.abs(o.shapeStart.x-t),vert:Math.abs(o.shapeStart.y-n)};Object.assign(r[0],o.mode==="rect"?{x:Math.min(o.shapeStart.x,t),y:Math.min(o.shapeStart.y,n),width:a.hor,height:a.vert}:{rx:a.hor,ry:a.vert}),d("drawShape"),o.drawingShape=!1,z(o.activeLayer,o.layerId)(T(r),y(r)),u.onpointermove=null}else N[o.mode].mkPoint(o,r,t,n,z,ze),o.mode==="path"&&P.lastElementChild.dispatchEvent(new Event("pointerdown"));Pe(o.layerId),B(o.layerId)}function xt(){let e=o.transformLayerNotDrawing?[o.activeSVGElement,o.activeLayer.transforms]:[u.firstElementChild,c.transforms];fn(...e),E(c,o)}function jt(){Object.assign(c,{layers:[],outputConfig:{...h.outputConfig},transforms:p(h.transforms)}),he(),d("clear")}function St({target:e}){if(o.arcCmdConfig[e.name]=e[e.type==="checkbox"?"checked":"value"],!o.activeLayer)return;let t=se(o.activeLayer.points);!t||(Object.assign(t,_(o.arcCmdConfig)),B(o.layerId),d("configArcCmd"))}function Et({target:{name:e,value:t}}){c.outputConfig[e]=t,Me(),d("configOutput")}function Tt(){vt(Be())}function Ot(){vt(ge())}function He(){if(!o.activeLayer?.points.length)return;let e=o.activeLayer.points.pop();if(d("deleteLastPoint"),e.cmd)ze(e.cmd),B(o.layerId);else{let t=o.activeSVGElement;F(),t.getAttributeNames().filter(n=>!mn.includes(n)).forEach(n=>t.removeAttribute(n))}}function It(){!v.length||(c.layers.splice(o.layerId,1),o.activeSVGElement.remove(),F(),Ge(),d("deleteLayer"))}function Ue(){c.layers.splice(o.layerId,0,p(o.activeLayer)),o.activeSVGElement.after(o.activeSVGElement.cloneNode(!0)),o.layerId+=1,Ce(o.layerId),d("ctrl+c")}function kt(e){if(window.location.hash!=="#drawing")return;let{key:t}=e;if(t==="F12"||(t==="Enter"&&e.target.contentEditable&&e.target.blur(),document.activeElement!==document.body))return;let n=Ee[t];if(e.ctrlKey&&bt[t.toUpperCase()])bt[t.toUpperCase()]();else if(n){if(!o.activeLayer&&!e.ctrlKey)return;let{transforms:{translate:r}}=e.ctrlKey?c:o.activeLayer,{cb:a,prop:s}=n;r[s]=a(+r[s]),E(c,o)}else t==="Backspace"?He():Q.includes(t.toUpperCase())&&(o.cmd=t.toUpperCase());e.preventDefault()}function Mt(e){let n=+e.target.closest("label").dataset.layerId,r=v[n],a=+e.dataTransfer.getData("text"),s=v[a],[l]=c.layers.splice(a,1);c.layers.splice(n,0,l),d("reorderLayer"),a<n?r.after(s):b.insertBefore(s,r),a!==o.layerId?a>o.layerId&&n<=o.layerId?o.layerId+=1:a<o.layerId&&n>o.layerId&&(o.layerId-=1):o.layerId=n,K(Math.min(a,n),Math.max(a,n)+1),D[o.layerId].checked=!0,e.preventDefault()}function Bt(){let{transforms:e}=h;O.checked&&o.activeLayer?o.activeLayer.transforms=p(e):c.transforms=p(e),E(c,o),M(e),d("resetTransforms")}function fn(e,t){let{x:n,y:r,width:a,height:s}=e.getBBox(),l=[Math.trunc(n+a*.5),Math.trunc(r+s*.5)];[V.rotate[1].value,V.rotate[2].value]=l,[t.rotate[1],t.rotate[2]]=l,d("setCenterofRotation")}function $t({target:{value:e}}){o.cmd=e}function At({target:{name:e,value:t}}){!o.activeLayer||(o.activeLayer.style[e]=t,e==="fill"&&o.activeLayer.style["fill-opacity"]==="0"&&(o.activeLayer.style["fill-opacity"]="1"),Pe(o.layerId))}G.onchange=()=>d("setFillOrStroke");function Pt({target:{value:e}}){let t=+e;o.mode=c.layers[t].mode,o.layerId=t}function Dt({target:{value:e},currentTarget:t}){if(o.drawingShape){t.modes.value=o.mode;return}if(o.mode=e,!!o.activeLayer)if(o.activeLayer.points.length)we();else{o.activeLayer.mode=o.mode;let n=I(Y[o.mode])({"data-layer-id":o.layerId}),r=o.activeSVGElement;r.replaceWith(n),r.remove(),Object.keys(o.activeLayer.style).forEach(a=>{h.styleRelevancies[a]&&!h.styleRelevancies[a].includes(o.mode)&&delete o.activeLayer.style[a]}),Object.assign(o.activeLayer.style,Se(o.mode)),d("setMode")}}function Rt({target:{classList:e,dataset:t,name:n,value:r}}){if(e.contains("transform-config")){let{transform:a,id:s}=t;o.transformTarget[a][+s]=r}else o.transformTarget[n]=r;E(c,o)}function Vt({target:{checked:e}}){e?M(o.activeLayer?o.activeLayer.transforms:h.transforms):M(c.transforms),o.transformLayerNotDrawing=e}function Nt({target:e}){!o.activeLayer||(o.activeLayer.closePath=e.checked,B(o.layerId),d("togglePathClosing"))}function Ft(){let e=Be();c.outputConfig["file-format"]==="svg"?wt(e):(ye.src=e,ye.onload=()=>{X.clearRect(0,0,X.canvas.width,X.canvas.height),Object.assign(X.canvas,{width:c.outputConfig.width,height:c.outputConfig.height}),X.drawImage(ye,0,0),wt(Re.toDataURL())})}J.oninput=St;W.onchange=$t;document.getElementById("reset-transforms").onclick=Bt;document.getElementById("get-markup").onclick=Ot;document.getElementById("get-data-uri").onclick=Tt;document.getElementById("center-rotation-btn").onclick=xt;document.getElementById("center-vb").onclick=ue;document.getElementById("add-layer").onclick=we;document.getElementById("del-layer").onclick=It;document.getElementById("clear-all").onclick=jt;document.getElementById("del-last-point").onclick=He;document.getElementById("duplicate-layer").onclick=Ue;document.querySelector('a[data-tab-name="output"]').onclick=$e;Ze.onclick=Ft;G.oninput=At;L.onchange=Pt;L.ondrop=Mt;ne.onchange=Dt;te.oninput=Et;U.onchange=Nt;re.addEventListener("click",me);u.addEventListener("pointerdown",Lt);H.oninput=Rt;O.onchange=Vt;ae.addEventListener("click",fe);window.onkeydown=kt;})();
