const $=s=>document.querySelector(s);
const downloadsEl=$("#downloads"), empty=$("#emptyState"), count=$("#activeCount"), hero=$("#heroStatus");
let items=JSON.parse(localStorage.getItem("neodownload_items")||"[]");
let activeJobs={};
function save(){localStorage.setItem("neodownload_items",JSON.stringify(items));render()}
function toast(msg){let t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function prettySize(n){if(!n)return "Tamaño desconocido";let u=["B","KB","MB","GB","TB"],i=0;while(n>=1024&&i<u.length-1){n/=1024;i++}return `${n.toFixed(i?1:0)} ${u[i]}`}
function filenameFromUrl(url){try{return decodeURIComponent(new URL(url).pathname.split("/").pop())||"archivo-descargado"}catch{return "archivo-descargado"}}
function render(){
 const active=items.filter(x=>x.status==="downloading").length;
 count.textContent=active;hero.textContent=active?`${active} descarga${active>1?"s":""} en curso`:"Todo listo para descargar";
 downloadsEl.innerHTML="";
 empty.style.display=items.length?"none":"block";
 [...items].reverse().forEach(item=>{
  const card=document.createElement("div");card.className="download-card";
  let statusText=item.status==="downloading"?"Descargando":item.status==="completed"?"Completada":item.status==="paused"?"Pausada":item.status==="error"?"Error":"Pendiente";
  card.innerHTML=`<div class="file-head"><div class="file-icon">${iconFor(item.name)}</div><div class="file-info"><div class="file-name"></div><div class="file-meta"></div></div><div class="status">${statusText}</div></div><div class="progress"><div></div></div><div class="download-foot"><span class="progress-label"></span><div class="actions"></div></div>`;
  card.querySelector(".file-name").textContent=item.name;
  card.querySelector(".file-meta").textContent=item.size?prettySize(item.size):item.url;
  card.querySelector(".progress>div").style.width=(item.progress||0)+"%";
  card.querySelector(".progress-label").textContent=item.status==="completed"?"100% · Guardado":`${(item.progress||0).toFixed(1)}%`;
  let actions=card.querySelector(".actions");
  if(item.status==="downloading")addAction(actions,"Ⅱ",()=>pause(item.id));
  else if(item.status==="paused"||item.status==="pending")addAction(actions,"▶",()=>start(item.id));
  if(item.status!=="completed")addAction(actions,"×",()=>cancel(item.id));
  addAction(actions,"↗",()=>window.open(item.url,"_blank","noopener"));
  downloadsEl.appendChild(card);
 });
}
function iconFor(n){let ext=(n.split(".").pop()||"").toLowerCase();if(["jpg","jpeg","png","gif","webp"].includes(ext))return "▧";if(["mp4","mkv","mov","webm"].includes(ext))return "▶";if(["mp3","wav","ogg"].includes(ext))return "♫";if(["pdf","doc","docx","txt"].includes(ext))return "▤";if(["zip","rar","7z"].includes(ext))return "▣";return "↓"}
function addAction(parent,label,fn){let b=document.createElement("button");b.textContent=label;b.onclick=fn;parent.appendChild(b)}
function addDownload(){
 const url=$("#urlInput").value.trim();if(!url){toast("Pega primero un enlace");return}
 try{new URL(url)}catch{toast("El enlace no parece válido");return}
 const id=Date.now().toString();
 const name=$("#nameInput").value.trim()||filenameFromUrl(url);
 items.push({id,url,name,status:"pending",progress:0,created:Date.now()});
 $("#urlInput").value="";$("#nameInput").value="";
 save();start(id);
}
async function start(id){
 let item=items.find(x=>x.id===id);if(!item)return;
 // Try a CORS-readable fetch to show progress; fall back to browser's native download.
 item.status="downloading";item.progress=0;save();
 const controller=new AbortController();activeJobs[id]=controller;
 try{
  const response=await fetch(item.url,{signal:controller.signal,mode:"cors"});
  if(!response.ok)throw new Error("HTTP "+response.status);
  const total=Number(response.headers.get("content-length"))||0;
  item.size=total;
  if(!response.body){const blob=await response.blob();saveBlob(blob,item.name);item.status="completed";item.progress=100;save();return}
  const reader=response.body.getReader();let chunks=[],received=0,last=0,lastTime=Date.now();
  while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);received+=value.length;
   item.progress=total?Math.min(99.9,received/total*100):0;
   const now=Date.now();if(now-lastTime>350){item.size=total||received;save();lastTime=now;last=received}
  }
  const blob=new Blob(chunks);saveBlob(blob,item.name);item.status="completed";item.progress=100;item.size=blob.size;save();toast("Descarga completada");
 }catch(err){
  if(err.name==="AbortError"){item.status="paused";save();return}
  // Browser-native fallback: works for many direct URLs even if CORS blocks fetch.
  item.status="pending";item.progress=0;save();
  const a=document.createElement("a");a.href=item.url;a.download=item.name;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();
  item.status="completed";item.progress=100;save();
  toast("Se inició la descarga del navegador. El sitio puede limitar el nombre o el seguimiento.");
 }finally{delete activeJobs[id]}
}
function saveBlob(blob,name){const a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
function pause(id){activeJobs[id]?.abort();let item=items.find(x=>x.id===id);if(item){item.status="paused";save()}}
function cancel(id){activeJobs[id]?.abort();items=items.filter(x=>x.id!==id);save();toast("Descarga eliminada")}
$("#addBtn").onclick=addDownload;
$("#urlInput").addEventListener("keydown",e=>{if(e.key==="Enter")addDownload()});
$("#clearBtn").onclick=()=>{items=items.filter(x=>x.status==="downloading"||x.status==="pending"||x.status==="paused");save();toast("Historial limpiado")};
$("#settingsBtn").onclick=()=>toast("Ajustes avanzados: próximamente");
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");if(b.dataset.tab!=="home")toast(`${b.querySelector("small").textContent}: vista en desarrollo`)});
render();
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
