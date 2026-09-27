/*
 * Sanavera MP3 2.0 · Sebastián Sanavera
 * JavaScript nativo; sin compilación, claves, backend ni dependencias externas.
 * Secciones: utilidades / modelo y persistencia / Archive / interfaz / audio / acciones.
 * Las URLs de medios se construyen desde identificadores y nombres, nunca desde HTML remoto.
 */
(() => {
  'use strict';
  const VERSION = '2.0.6';
  const DB_NAME = 'sanavera-mp3-v2';
  const RESUME_KEY = 'smp.v2.resume';
  const FALLBACK_KEY = 'smp.v2.fallback';
  const LEGACY_DONE = 'smp.v2.legacy-migrated';
  const LIMIT = { tracks: 20000, albums: 10000, playlists: 500, playlist: 10000, history: 1500, queue: 3000, page: 24, hidden:5000, home:120, importBytes: 20 * 1024 * 1024 };
  // Consulta exacta del DEFAULT_QUERY original. No es un filtro uploader:; Archive
  // indexa esa referencia en los metadatos públicos de las publicaciones.
  const HOME_QUERY = 'juan_chota_dura';
  const HOME_BATCH = 12;
  const EQ_DEFAULTS = Object.freeze({enabled:false,bass:0,mid:0,treble:0,boost:0});
  const EQ_PRESETS = [
    {id:'flat',name:'Equilibrado',bass:0,mid:0,treble:0},
    {id:'cumbia',name:'Cumbia',bass:4,mid:-1,treble:2},
    {id:'bass',name:'Más graves',bass:6,mid:-2,treble:0},
    {id:'voice',name:'Voces',bass:-2,mid:4,treble:1},
    {id:'bright',name:'Brillo',bass:-1,mid:0,treble:4}
  ];
  const DEFAULTS = { theme:'coral', quality:'balanced', volume:0.8, muted:false, shuffle:false, repeat:'off', musicOnly:true, remember:true, skipErrors:true, equalizer:EQ_DEFAULTS };
  const AUDIO = { mp3:'audio/mpeg', m4a:'audio/mp4', aac:'audio/aac', ogg:'audio/ogg; codecs="vorbis"', oga:'audio/ogg', opus:'audio/ogg; codecs="opus"', flac:'audio/flac', wav:'audio/wav', aiff:'audio/aiff', aif:'audio/aiff', alac:'audio/mp4', wma:'audio/x-ms-wma' };
  const ICONS = {
    home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
    search:'M21 21l-5-5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0',
    library:'M4 4v16M9 4v16M14 4l5-1 3 17-5 1Z',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    history:'M3 4v5h5M3 9a9 9 0 1 1 0 7M12 7v5l3 2',
    plus:'M12 5v14M5 12h14', close:'m6 6 12 12M6 18 18 6',
    settings:'m9 3-1 3-3 1-2 3 2 2-1 3 3 3 3-1 2 3 4-1 1-3 3-1 1-4-3-2V6l-4-2-2 1ZM15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0',
    arrow:'M5 12h14m-6-6 6 6-6 6', back:'M19 12H5m6-6-6 6 6 6', down:'m5 9 7 7 7-7', up:'m5 15 7-7 7 7',
    play:'m8 5 11 7-11 7Z', pause:'M7 5h3v14H7ZM14 5h3v14h-3Z',
    previous:'M5 5v14m14-14L8 12l11 7Z', next:'M19 5v14M5 5l11 7-11 7Z',
    shuffle:'M3 6h3l12 12h3m-4-4 4 4-4 4M3 18h3l4-4m4-4 4-4h3m-4-4 4 4-4 4',
    repeat:'m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3',
    queue:'M3 5h16M3 10h13M3 15h8m4-1 6 4-6 4Z',
    volume:'m3 9 5 0 5-5v16l-5-5H3Zm14-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
    muted:'m3 9 5 0 5-5v16l-5-5H3Zm14 0 5 6m0-6-5 6',
    quality:'m13 2-9 12h7l-1 8 10-13h-7Z',
    equalizer:'M5 3v7m0 4v7M12 3v11m0 4v3M19 3v3m0 4v11M2 10h6v4H2ZM9 14h6v4H9ZM16 6h6v4h-6Z',
    moon:'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z',
    more:'M5 12h.01M12 12h.01M19 12h.01',
    download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
    upload:'M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4',
    music:'M9 18V5l12-3v13M9 8l12-3M9 18a3 3 0 1 1-3-3c1.7 0 3 1 3 3m12-3a3 3 0 1 1-3-3c1.7 0 3 1 3 3',
    disc:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0m-7 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    check:'m5 12 4 4L19 6', trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
    edit:'m16 3 5 5-12 12-6 1 1-6Zm-2 2 5 5',
    external:'M14 3h7v7m0-7L10 14M10 3H4v17h17v-6',
    info:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 11v6M12 7h.01',
    wifi:'M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 20h.01',
    eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    hide:'m3 3 18 18M9.5 5.3 12 5c6 0 10 7 10 7a19 19 0 0 1-3.1 3.7M6.2 6.2A20 20 0 0 0 2 12s4 7 10 7c1.6 0 3.1-.5 4.4-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2',
    spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z'
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text = (value, fallback = '', max = 600) => {
    const s = Array.isArray(value) ? value.filter(v => typeof v === 'string' || typeof v === 'number').join(' · ') : typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    return s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,max) || fallback;
  };
  const norm = s => text(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const clamp = (x,a,b) => Math.min(b, Math.max(a, Number(x) || 0));
  const number = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const unique = a => [...new Set(a)];
  const validId = v => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(v);
  const validFile = v => typeof v === 'string' && v.length > 0 && v.length < 1400 && !/[\u0000-\u001f\\]/.test(v) && !v.startsWith('/') && !v.split('/').some(p => p === '..' || p === '.');
  const extOf = s => String(s || '').split('.').pop().toLowerCase();
  const stem = s => String(s).replace(/\.(mp3|flac|wav|ogg|oga|opus|m4a|aac|aiff|aif|alac|wma)$/i,'');
  const pathEncode = s => s.split('/').map(encodeURIComponent).join('/');
  const mediaURL = (id,name) => `https://archive.org/download/${encodeURIComponent(id)}/${pathEncode(name)}`;
  const thumbURL = id => `https://archive.org/services/img/${encodeURIComponent(id)}`;
  const detailsURL = id => `https://archive.org/details/${encodeURIComponent(id)}`;
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.music}"/></svg>`;
  const fmt = seconds => { const n = Math.max(0,Math.floor(number(seconds))); return n >= 3600 ? `${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}` : `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; };
  const durationOf = value => { const s=text(value); if(!s.includes(':')) return clamp(s,0,604800); return clamp(s.split(':').reduce((a,b)=>a*60+number(b),0),0,604800); };
  const dateLabel = ms => new Date(ms).toLocaleDateString('es-AR',{day:'numeric',month:'short'});
  const uuid = () => globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const sleep = (ms,signal) => new Promise((resolve,reject)=> {
    if(signal?.aborted) return reject(new DOMException('Cancelado','AbortError'));
    const done=()=>{signal?.removeEventListener('abort',abort);resolve();};
    const timer=setTimeout(done,ms);
    const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new DOMException('Cancelado','AbortError'));};
    signal?.addEventListener('abort',abort,{once:true});
  });
  function plainHTML(s) { const doc = new DOMParser().parseFromString(text(s,'',18000),'text/html'); doc.querySelectorAll('script,style').forEach(n=>n.remove()); return text(doc.body.textContent,'',8000); }
  function shuffleArray(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }

  // Sólo datos normalizados entran a la biblioteca o a una importación.
  function cleanSource(s) {
    if(!s || !validFile(s.name) || !Object.hasOwn(AUDIO,extOf(s.name))) return null;
    return {name:s.name,ext:extOf(s.name),format:text(s.format,extOf(s.name).toUpperCase(),80),size:clamp(s.size,0,1e12),bitrate:clamp(s.bitrate,0,100000),original:s.original===true};
  }
  function cleanTrack(t) {
    if(!t || !validId(t.albumId) || typeof t.id!=='string' || !t.id.startsWith(t.albumId+'::') || t.id.length>1700) return null;
    const sources=(Array.isArray(t.sources)?t.sources:[]).slice(0,30).map(cleanSource).filter(Boolean);
    if(!sources.length) return null;
    return {id:t.id,albumId:t.albumId,title:text(t.title,'Sin título'),artist:text(t.artist,'Artista sin indicar'),album:text(t.album,'Álbum sin título'),cover:validFile(t.cover)&&/^(jpg|jpeg|png|webp)$/i.test(extOf(t.cover))?t.cover:'',duration:clamp(t.duration,0,604800),number:clamp(t.number,0,100000),disc:clamp(t.disc,0,999),sources,added:clamp(t.added,0,9e15)||Date.now()};
  }
  function cleanAlbum(a) {
    if(!a || !validId(a.id)) return null;
    return {id:a.id,title:text(a.title,'Álbum sin título'),artist:text(a.artist,'Artista sin indicar'),year:text(a.year,'',20),cover:validFile(a.cover)&&/^(jpg|jpeg|png|webp)$/i.test(extOf(a.cover))?a.cover:'',description:text(a.description,'',8000),subjects:text(a.subjects,'',1000),downloads:clamp(a.downloads,0,1e12),trackIds:(Array.isArray(a.trackIds)?a.trackIds:[]).filter(s=>typeof s==='string'&&s.startsWith(a.id+'::')).slice(0,LIMIT.tracks),loadedAt:clamp(a.loadedAt,0,9e15),restricted:a.restricted===true};
  }
  function equalizerFrom(eq) {
    eq=eq&&typeof eq==='object'?eq:{};
    const db=(v,min,max)=>Math.round(clamp(Number.isFinite(Number(v))?v:0,min,max)*2)/2;
    return {enabled:eq.enabled===true,bass:db(eq.bass,-9,9),mid:db(eq.mid,-9,9),treble:db(eq.treble,-9,9),boost:db(eq.boost,0,6)};
  }
  function settingsFrom(s={}) {
    s=s&&typeof s==='object'?s:{};
    return {theme:['coral','violet','mint'].includes(s.theme)?s.theme:'coral',quality:['balanced','saver','best'].includes(s.quality)?s.quality:'balanced',volume:s.volume==null?.8:clamp(s.volume,0,1),muted:s.muted===true,shuffle:s.shuffle===true,repeat:['off','all','one'].includes(s.repeat)?s.repeat:'off',musicOnly:s.musicOnly!==false,remember:s.remember!==false,skipErrors:s.skipErrors!==false,equalizer:equalizerFrom(s.equalizer)};
  }
  function emptyMeta() { return {version:2,updated:Date.now(),likes:[],albumLikes:[],hiddenAlbums:[],playlists:[],history:[],recentAlbums:[],searches:[],seconds:0,plays:0,settings:{...DEFAULTS},resume:null}; }
  function cleanResume(r, tracks) {
    if(!r || !Array.isArray(r.queue)) return null;
    const current=typeof r.trackId==='string'?r.trackId:r.queue[number(r.index)];
    const queue=r.queue.filter(id=>typeof id==='string'&&tracks.has(id)).slice(0,LIMIT.queue);
    if(!queue.length||!tracks.has(current)||!queue.includes(current)) return null;
    const index=queue[number(r.index)]===current?number(r.index):queue.indexOf(current);
    return {queue,index,trackId:current,position:clamp(r.position,0,604800),updated:clamp(r.updated,0,9e15)};
  }
  function cleanMeta(m,tracks,albums) {
    if(!m||typeof m!=='object') return emptyMeta();
    const trackRefs=a=>unique((Array.isArray(a)?a:[]).filter(id=>typeof id==='string'&&tracks.has(id)));
    const albumRefs=a=>unique((Array.isArray(a)?a:[]).filter(id=>typeof id==='string'&&albums.has(id)));
    const ids=new Set();
    const playlists=(Array.isArray(m.playlists)?m.playlists:[]).slice(0,LIMIT.playlists).flatMap(p=> {
      if(!p||typeof p.id!=='string'||p.id.length>100||!p.id||ids.has(p.id))return [];
      ids.add(p.id);return [{id:p.id,name:text(p.name,'Mi playlist',90),trackIds:trackRefs(p.trackIds).slice(0,LIMIT.playlist),created:clamp(p.created,0,9e15)||Date.now()}];
    });
    return {version:2,updated:clamp(m.updated,0,9e15)||Date.now(),likes:trackRefs(m.likes),albumLikes:albumRefs(m.albumLikes),playlists,
      hiddenAlbums:unique((Array.isArray(m.hiddenAlbums)?m.hiddenAlbums:[]).filter(validId)).slice(0,LIMIT.hidden),
      history:(Array.isArray(m.history)?m.history:[]).filter(h=>h&&tracks.has(h.id)&&number(h.at)>0).slice(0,LIMIT.history).map(h=>({id:h.id,at:clamp(h.at,0,9e15)})),
      recentAlbums:(Array.isArray(m.recentAlbums)?m.recentAlbums:[]).filter(a=>a&&albums.has(a.id)&&number(a.at)>0).slice(0,80).map(a=>({id:a.id,at:clamp(a.at,0,9e15)})),
      searches:unique((Array.isArray(m.searches)?m.searches:[]).map(s=>text(s,'',160)).filter(Boolean)).slice(0,10),seconds:clamp(m.seconds,0,1e11),plays:clamp(m.plays,0,1e9),settings:settingsFrom(m.settings),resume:cleanResume(m.resume,tracks)};
  }

  class Database {
    constructor(){this.db=null;this.mode='memory';this.cache=new Map();}
    async open(){
      try {
        this.db=await new Promise((resolve,reject)=> {
          const r=indexedDB.open(DB_NAME,1); let expired=false;
          const timer=setTimeout(()=>{expired=true;reject(new Error('El almacenamiento está ocupado'));},4000);
          r.onupgradeneeded=()=>{for(const [name,key] of [['kv','key'],['tracks','id'],['albums','id'],['cache','key']]) if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:key});};
          r.onsuccess=()=>{clearTimeout(timer);if(expired){r.result.close();return;}resolve(r.result);};
          r.onerror=()=>{clearTimeout(timer);reject(r.error);};
          r.onblocked=()=>{clearTimeout(timer);expired=true;reject(new Error('Otra pestaña está actualizando la biblioteca'));};
        });
        this.db.onversionchange=()=>{this.db.close();this.db=null;this.mode='memory';persistentWarning('Se actualizó el almacenamiento en otra pestaña. Recargá esta página.');};
        this.mode='indexedDB';
        const [tracks,albums,kv]=await Promise.all(['tracks','albums','kv'].map(n=>this.all(n)));
        const state={tracks,albums,meta:kv.find(r=>r.key==='library')?.value};
        // Recuperar la copia de respaldo si el navegador antes bloqueaba IndexedDB.
        const fallback=this.localRead();
        if(fallback?.meta?.updated>number(state.meta?.updated)&&Array.isArray(fallback.tracks)&&Array.isArray(fallback.albums)){
          const old=state.meta||emptyMeta(),fresh=fallback.meta;
          const lists=new Map((Array.isArray(old.playlists)?old.playlists:[]).filter(p=>p&&typeof p.id==='string').map(p=>[p.id,p]));
          for(const p of (Array.isArray(fresh.playlists)?fresh.playlists:[])){if(!p||typeof p.id!=='string')continue;const existing=lists.get(p.id);lists.set(p.id,existing?{...p,trackIds:unique([...(existing.trackIds||[]),...(p.trackIds||[])])}:p);}
          const merged={...old,...fresh,likes:unique([...(old.likes||[]),...(fresh.likes||[])]),albumLikes:unique([...(old.albumLikes||[]),...(fresh.albumLikes||[])]),playlists:[...lists.values()],history:[...new Map([...(old.history||[]),...(fresh.history||[])].filter(h=>h&&h.id).map(h=>[h.id+'@'+h.at,h])).values()].sort((a,b)=>b.at-a.at),seconds:Math.max(number(old.seconds),number(fresh.seconds)),plays:Math.max(number(old.plays),number(fresh.plays))};
          return {meta:merged,tracks:[...new Map([...state.tracks,...fallback.tracks].filter(t=>t&&typeof t.id==='string').map(t=>[t.id,t])).values()],albums:[...new Map([...state.albums,...fallback.albums].filter(a=>a&&typeof a.id==='string').map(a=>[a.id,a])).values()],recoveredFallback:true};
        }
        return state;
      } catch(e) {
        this.db?.close();this.db=null;
        try{localStorage.setItem('smp.v2.probe','1');localStorage.removeItem('smp.v2.probe');this.mode='localStorage';}catch{this.mode='memory';}
        return this.localRead() || {tracks:[],albums:[],meta:null};
      }
    }
    localRead(){try{return JSON.parse(localStorage.getItem(FALLBACK_KEY)||'null');}catch{return null;}}
    all(name){return new Promise((resolve,reject)=>{const r=this.db.transaction(name,'readonly').objectStore(name).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
    async save(meta,tracks,albums,dirtyTracks,dirtyAlbums,replace=false){
      if(!this.db){
        if(this.mode==='memory')throw new Error('Este navegador no permite guardar datos');
        localStorage.setItem(FALLBACK_KEY,JSON.stringify({meta,tracks:[...tracks.values()],albums:[...albums.values()]}));return;
      }
      await new Promise((resolve,reject)=>{
        const tx=this.db.transaction(['kv','tracks','albums'],'readwrite');
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('No se guardaron los datos'));
        if(replace){tx.objectStore('tracks').clear();tx.objectStore('albums').clear();}
        tx.objectStore('kv').put({key:'library',value:meta});
        for(const id of dirtyTracks){const t=tracks.get(id);if(t)tx.objectStore('tracks').put(t);}
        for(const id of dirtyAlbums){const a=albums.get(id);if(a)tx.objectStore('albums').put(a);}
      });
    }
    async cached(key,ttl){
      let record=this.cache.get(key);
      if(!record&&this.db){try{record=await new Promise((resolve,reject)=>{const r=this.db.transaction('cache','readonly').objectStore('cache').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}catch{}}
      return record&&Date.now()-record.at<ttl?record.value:null;
    }
    async cachePut(key,value){
      const record={key,at:Date.now(),value};this.cache.set(key,record);
      if(this.cache.size>60)this.cache.delete(this.cache.keys().next().value);
      if(!this.db)return;
      try{
        await new Promise((resolve,reject)=>{const tx=this.db.transaction('cache','readwrite');tx.objectStore('cache').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
        if(Math.random()<.12){const entries=await this.all('cache');const old=entries.sort((a,b)=>b.at-a.at).slice(160);if(old.length){const tx=this.db.transaction('cache','readwrite');old.forEach(r=>tx.objectStore('cache').delete(r.key));}}
      }catch{/* El caché nunca bloquea ni compromete la biblioteca. */}
    }
    async clearCache(){this.cache.clear();if(this.db)await new Promise((resolve,reject)=>{const tx=this.db.transaction('cache','readwrite');tx.objectStore('cache').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
  }

  let root,main,audio,dialog,db,meta;
  let tracks=new Map(),albums=new Map();
  let dirtyTracks=new Set(),dirtyAlbums=new Set(),saveTimer=0,saveChain=Promise.resolve(),storageFailed=false;
  let view={name:'home',id:null},viewSerial=0,albumController=null,searchController=null,debounceTimer=0,dataEpoch=0;
  const emptySearch = () => ({query:'',effectiveQuery:'',exact:false,correctionChecked:false,correcting:false,spellingError:'',suggestions:[],hadMatches:false,primaryMatches:false,mode:'all',sort:'relevance',page:0,total:0,items:[],trackIds:[],busy:false,error:'',scanned:0,cursor:null,hasMore:false,filtered:0,limitReached:false,mix:null});
  let searchState=emptySearch();
  const emptyDiscovery=()=>({items:[],pool:[],seen:new Set(),pages:null,total:0,loading:false,error:'',started:false});
  let discovery=emptyDiscovery(),discoveryController=null,trackDisplayLimit=80,trackContext=[],queueDisplayLimit=80,libraryAlbumLimit=36,libraryPlaylistLimit=40;
  let hiddenAlbums=new Set(),hiddenLimit=40,hiddenFilter='';
  let player={queue:[],index:-1,order:[],cursor:0,source:null,token:0,wants:false,position:0,pendingSeek:null,attempted:new Set(),refreshed:false,failures:0,counted:false,heard:0,lastTime:0,lastWall:0,watchdog:0,error:'',sleepAt:0,sleepEnd:false};
  let toastTimer=0,lastResumeWrite=0,lastPositionUpdate=0,dialogAction=null,returnFocus=null,fullReturnFocus=null;
  let audioListeners=null;
  const sound={context:null,source:null,element:null,nodes:null,disabled:false,blocked:new Set(),notice:'',resumeTask:null,resumeTimer:0};
  const $=s=>root.querySelector(s);
  const $$=s=>[...root.querySelectorAll(s)];
  const currentTrack=()=>tracks.get(player.queue[player.index]);
  function rememberTrack(t){tracks.set(t.id,t);dirtyTracks.add(t.id);}
  function rememberAlbum(a){albums.set(a.id,a);dirtyAlbums.add(a.id);}
  function toast(message,undoId=null){if(!root)return;const el=$('#smp-toast');el.innerHTML=`<span>${esc(message)}</span>${undoId?`<button type="button" data-action="album-unhide" data-id="${esc(undoId)}" class="smp-toast-undo">Deshacer</button>`:''}`;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},undoId?8500:4300);}
  const visibleAlbum=a=>!!a&&!hiddenAlbums.has(a.id);
  const visibleTrack=id=>tracks.has(id)&&!hiddenAlbums.has(tracks.get(id).albumId);
  function persistentWarning(message){if(!root)return;const el=$('#smp-banner');el.textContent=message;el.hidden=false;}
  function changed(){meta.updated=Date.now();clearTimeout(saveTimer);saveTimer=setTimeout(()=>flush(),400);updateSidebar();}
  function flush(){
    clearTimeout(saveTimer);
    const work=async()=>{
      const dt=[...dirtyTracks], da=[...dirtyAlbums];dirtyTracks.clear();dirtyAlbums.clear();
      const snapshot=structuredClone(meta);
      try{await db.save(snapshot,tracks,albums,dt,da);if(storageFailed){storageFailed=false;$('#smp-banner').hidden=true;}}
      catch(e){dt.forEach(id=>dirtyTracks.add(id));da.forEach(id=>dirtyAlbums.add(id));storageFailed=true;persistentWarning('No se pudieron guardar los últimos cambios. Exportá un respaldo desde Ajustes antes de cerrar.');}
    };
    saveChain=saveChain.then(work,work);return saveChain;
  }
  function albumSummaryFromTrack(t){return cleanAlbum({id:t.albumId,title:t.album,artist:t.artist,cover:t.cover});}
  function currentResume(){const t=currentTrack();return t?{queue:player.order.map(i=>player.queue[i]),index:Math.max(0,player.order.indexOf(player.index)),trackId:t.id,position:player.pendingSeek??(Number.isFinite(audio.currentTime)&&audio.readyState>0?audio.currentTime:player.position),updated:Date.now()}:null;}
  function saveResume(force=false){
    if(!meta||!meta.settings.remember)return;
    const now=Date.now();if(!force&&now-lastResumeWrite<5000)return;lastResumeWrite=now;
    meta.resume=currentResume();
    try{localStorage.setItem(RESUME_KEY,JSON.stringify(meta.resume));}catch{}
    changed();
  }

  // Internet Archive: consultas pequeñas, cancelables, sin proxies ni cabeceras prohibidas.
  async function requestJSON(url,signal){
    let last;
    for(let attempt=0;attempt<2;attempt++){
      if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
      const controller=new AbortController();let timedOut=false;
      const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
      const timer=setTimeout(()=>{timedOut=true;controller.abort();},18000);
      try{
        const response=await fetch(url,{signal:controller.signal,credentials:'omit',headers:{Accept:'application/json'}});
        if(!response.ok){const e=new Error(response.status===404?'Este elemento ya no está disponible.':response.status===403?'Este elemento no permite acceso público.':response.status===429?'Archive está recibiendo muchas consultas. Probá dentro de un momento.':`Archive respondió con un error (${response.status}).`);e.status=response.status;throw e;}
        const data=await response.json();if(!data||typeof data!=='object')throw new Error('Archive devolvió una respuesta inesperada.');return data;
      }catch(e){
        if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
        last=timedOut?new Error('Archive tardó demasiado en responder. Probá nuevamente.'):e;
        if(e.status&&e.status<500)throw e;
      }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
      if(attempt===0)await sleep(650,signal);
    }
    if(last instanceof TypeError)throw new Error('No pudimos conectar con Archive. Revisá tu conexión y volvé a intentar.');
    throw last;
  }
  const lucene=s=>text(s,'',160).replace(/[+\-!(){}\[\]^"~*?:\\/]|&&|\|\|/g,' ').replace(/\s+/g,' ').trim();
  const SPOKEN_QUERY='(collection:(librivoxaudio OR podcasts OR audio_news) OR subject:(podcast OR podcasts OR audiobook OR audiobooks OR audiolibro OR audiolibros OR "spoken word" OR entrevista OR entrevistas OR interview OR interviews))';
  // Una onda generada no identifica un podcast. Sin autor ni portada identificable,
  // el resultado sigue accesible, pero detrás de las coincidencias mejor descritas.
  const SECONDARY_QUERY=`(${SPOKEN_QUERY} OR title:("ENG artista" OR "Enganchados artista") OR (format:Spectrogram AND NOT (format:JPEG OR format:"JPEG Thumb") AND NOT (creator:* OR artist:*)))`;
  const SEARCH_GROUPS=['Coincide el artista','Coincide el título o álbum','En la descripción o las etiquetas','Otras coincidencias','Resultados secundarios'];
  const hasPhrase=(value,phrase)=>!!phrase&&(` ${value} `).includes(` ${phrase} `);
  const hasWords=(value,query)=>{const words=new Set(value.split(' '));return !!query&&query.split(' ').every(w=>words.has(w));};
  function searchQuery(query,mode,musicOnly){
    const safe=lucene(query), terms=safe.split(' ').filter(Boolean).slice(0,15), phrase=`"${safe}"`;
    const and=terms.map(s=>`"${s}"`).join(' AND ');
    let q=safe?(mode==='artist'?`(creator:${phrase}^20 OR artist:${phrase}^20 OR creator:(${and}) OR artist:(${and}))`:mode==='album'?`(title:${phrase}^10 OR title:(${and}) OR album:(${and}))`:mode==='song'?`(title:${phrase}^10 OR title:(${and}) OR description:(${and}) OR (${and}))`:`(creator:${phrase}^30 OR artist:${phrase}^30 OR title:${phrase}^10 OR description:${phrase}^2 OR (${and}))`):'(subject:music OR subject:musica OR collection:etree OR collection:netlabels)';
    q=`(${q}) AND (mediatype:audio OR mediatype:etree) AND NOT access-restricted-item:true`;
    if(musicOnly)q+=` AND NOT ${SPOKEN_QUERY}`;
    return q;
  }
  function searchGroups(query,mode,musicOnly){
    const base=searchQuery(query,mode,musicOnly), safe=lucene(query);
    if(mode!=='all'||!safe)return [{q:base,group:-1}];
    const and=safe.split(' ').filter(Boolean).slice(0,15).map(w=>`"${w}"`).join(' AND ');
    const artist=`(creator:(${and}) OR artist:(${and}))`, title=`(title:(${and}) OR album:(${and}))`, description=`(description:(${and}) OR subject:(${and}))`;
    const primary=`(${base}) AND NOT ${SECONDARY_QUERY}`;
    // Grupos excluyentes y paginados por separado: ningún resultado de descripción
    // ocupa el lugar de un artista que Archive haya dejado para la página siguiente.
    return [
      {q:`${primary} AND ${artist}`,group:0},
      {q:`${primary} AND ${title} AND NOT ${artist}`,group:1},
      {q:`${primary} AND ${description} AND NOT (${artist} OR ${title})`,group:2},
      {q:`${primary} AND NOT (${artist} OR ${title} OR ${description})`,group:3},
      {q:`(${base}) AND ${SECONDARY_QUERY}`,group:4}
    ];
  }
  function searchDoc(d,musicOnly){
    if(!d||!validId(d.identifier))return null;
    const formats=Array.isArray(d.format)?d.format:[d.format];
    if(formats.some(Boolean)&&!formats.some(f=>/mp3|flac|wav|vorbis|opus|aac|mpeg.?4|m4a|apple lossless|aiff|wma/i.test(text(f))))return null;
    const title=norm(d.title), subjects=norm(text(d.subject,'',4000));
    const collections=(Array.isArray(d.collection)?d.collection:[d.collection]).map(c=>norm(c));
    const description=plainHTML(d.description);
    // También detectar programas que quedaron fuera de las colecciones de podcasts.
    // No buscar "radio" o "entrevista" a ciegas dentro de una reseña de un disco.
    const spoken=collections.some(c=>/^(podcasts?|librivoxaudio|audio news|.* podcasts?)$/.test(c))||
      /\b(podcasts?|audiobooks?|audiolibros?|spoken word|entrevistas?|interviews?)\b/.test(subjects)||
      /^(?:podcast\s+\S|entrevista\s+(?:a|al|con)\s|interview\s+with\s)/.test(title)||
      (/^(?:nota|charla|conversacion)\s+(?:a|al|con)\s/.test(title)&&/^(?:nota|entrevista|charla|conversacion)\s/.test(norm(description)))||
      (/\b(?:episodio|episode|capitulo)\s+\d+\b/.test(title)&&/\bpodcast\b/.test(norm(description)));
    if(musicOnly&&spoken)return null;
    const artists=[...(Array.isArray(d.creator)?d.creator:[d.creator]),...(Array.isArray(d.artist)?d.artist:[d.artist])].map(a=>text(a)).filter(Boolean);
    const album=cleanAlbum({id:d.identifier,title:d.title,artist:text(d.artist)||d.creator,year:d.year||text(d.date).slice(0,4),description,subjects:d.subject,downloads:d.downloads});
    // Estos datos sirven sólo al buscador; no cambian el formato de la biblioteca.
    album.searchInfo={artists,album:text(d.album),added:Date.parse(text(d.addeddate))||0,spoken};
    return album;
  }
  // Corrección acotada: una edición por palabra (incluye letras intercambiadas).
  // Las propuestas siempre provienen de nombres públicos de Archive; no de una
  // lista fija de artistas. Los nombres cortos o ambiguos requieren un toque.
  function wordEdits(a,b){
    if(a===b)return 0;
    if(Math.abs(a.length-b.length)>1)return 2;
    if(a.length===b.length){
      const different=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])different.push(i);
      if(different.length===1)return 1;
      const [i,j]=different;return different.length===2&&j===i+1&&a[i]===b[j]&&a[j]===b[i]?1:2;
    }
    if(a.length>b.length)[a,b]=[b,a];
    let i=0,j=0,skipped=false;
    while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;}else{if(skipped)return 2;skipped=true;j++;}}
    return 1;
  }
  function spellingWords(query){
    const words=norm(query).split(' ').filter(Boolean);
    return words.length&&words.length<=8&&words.every(w=>w.length<=40)&&words.some(w=>/^[a-z]{4,}$/.test(w))?words:[];
  }
  function spellingQuery(query,mode,musicOnly){
    const words=spellingWords(query);if(!words.length)return '';
    const terms=words.map(w=>/^[a-z]{4,}$/.test(w)?`${w}~1`:`"${w}"`).join(' AND ');
    const fields=mode==='artist'?['creator','artist']:mode==='album'?['title','album']:['creator','artist','title','album'];
    return `(${fields.map(f=>`${f}:(${terms})`).join(' OR ')}) AND (mediatype:audio OR mediatype:etree) AND NOT access-restricted-item:true AND NOT ${SECONDARY_QUERY}${musicOnly?` AND NOT ${SPOKEN_QUERY}`:''}`;
  }
  function spellingCandidates(query,items,mode){
    const wanted=spellingWords(query), candidates=new Map();if(!wanted.length)return [];
    for(const item of items){
      if(!visibleAlbum(item)||item.searchInfo?.spoken||/^eng(?:anchados)? artista\b/.test(norm(item.title)))continue;
      const fields=[];
      if(mode!=='album')for(const label of item.searchInfo?.artists||[item.artist])fields.push({label,artist:true});
      if(mode!=='artist')for(const label of [item.title,item.searchInfo?.album])fields.push({label,artist:false});
      for(const {label,artist} of fields){
        const parts=(text(label,'',800).match(/[\p{L}\p{N}]+/gu)||[]).slice(0,80), normalized=parts.map(norm);
        for(let start=0;start+wanted.length<=parts.length;start++){
          let edits=0,valid=true;
          for(let i=0;i<wanted.length;i++){
            const from=wanted[i],to=normalized[start+i],distance=wordEdits(from,to);
            if(distance>1||(distance&&(!/^[a-z]{4,}$/.test(from)||!to))){valid=false;break;}
            edits+=distance;
          }
          if(!valid||!edits||edits>(wanted.join('').length>=10?2:1))continue;
          const key=normalized.slice(start,start+wanted.length).join(' '),label=parts.slice(start,start+wanted.length).join(' ');
          const whole=parts.length===wanted.length,quality=artist?(whole?3:2):(whole?2:1);
          let candidate=candidates.get(key);
          if(!candidate){candidate={query:label,key,edits,quality,ids:new Set(),artists:new Set()};candidates.set(key,candidate);}
          if(quality>candidate.quality){candidate.query=label;candidate.quality=quality;}
          candidate.ids.add(item.id);if(artist&&whole)candidate.artists.add(item.id);
        }
      }
    }
    return [...candidates.values()].sort((a,b)=>a.edits-b.edits||b.ids.size-a.ids.size||b.artists.size-a.artists.size||b.quality-a.quality||a.key.localeCompare(b.key)).slice(0,3).map(c=>({query:c.query,edits:c.edits,support:c.ids.size,artists:c.artists.size,quality:c.quality}));
  }
  async function findSearchCorrection(query,mode,signal){
    const musicOnly=meta.settings.musicOnly,q=spellingQuery(query,mode,musicOnly);
    if(!q)return {suggestions:[],automatic:''};
    const key=`spelling:2.0.6:${norm(query)}:${mode==='song'?'all':mode}:${musicOnly}`;
    let items=await db.cached(key,30*60*1000);
    if(signal.aborted)throw new DOMException('Cancelado','AbortError');
    if(!Array.isArray(items)){
      const params=new URLSearchParams({q,output:'json',rows:'40',page:'1'});
      ['identifier','title','creator','artist','album','format','description','subject','collection'].forEach(f=>params.append('fl[]',f));
      const data=await requestJSON(`https://archive.org/advancedsearch.php?${params}`,signal);
      if(!data.response||!Array.isArray(data.response.docs))throw new Error('No pudimos comprobar nombres parecidos. Probá nuevamente.');
      items=data.response.docs.slice(0,40).map(d=>searchDoc(d,musicOnly)).filter(Boolean);
      if(signal.aborted)throw new DOMException('Cancelado','AbortError');
      await db.cachePut(key,items);
    }
    if(signal.aborted)throw new DOMException('Cancelado','AbortError');
    const suggestions=spellingCandidates(query,items,mode),[first,second]=suggestions,words=spellingWords(query);
    const supported=first&&(first.artists>0||first.quality>=2||first.support>=2);
    const unambiguous=first&&(!second||first.edits<second.edits||(first.support>=3&&first.support>=second.support*3));
    const automatic=supported&&unambiguous&&(words.length>1||words[0].length>=6)?first.query:'';
    return {suggestions:suggestions.map(c=>c.query),automatic};
  }
  function relevance(a,q,mode='all'){
    const n=norm(q);if(!n)return 0;
    const match=value=>{const v=norm(value);return v===n?100:hasPhrase(v,n)?70:hasWords(v,n)?40:0;};
    const artist=Math.max(0,...(a.searchInfo?.artists||[a.artist]).map(match));
    const title=Math.max(match(a.title),match(a.searchInfo?.album));
    return (mode==='song'||mode==='album'?title*100+artist:artist*100+title*10)+match(a.description)+match(a.subjects)/2;
  }
  function compareResults(a,b,query,mode,sort){
    const group=number(a.searchGroup)-number(b.searchGroup);if(group)return group;
    if(sort==='newest')return number(b.searchInfo?.added)-number(a.searchInfo?.added)||a.id.localeCompare(b.id);
    if(sort==='downloads')return b.downloads-a.downloads||a.id.localeCompare(b.id);
    return relevance(b,query,mode)-relevance(a,query,mode)||b.downloads-a.downloads||a.id.localeCompare(b.id);
  }
  async function searchArchive(query,mode,page,sort,signal,cursor=null){
    const musicOnly=meta.settings.musicOnly, groups=searchGroups(query,mode,musicOnly), rows=mode==='song'?12:LIMIT.page;
    let position=cursor?{...cursor}:{group:0,page:1}, filtered=0,limitReached=false,total=0,matched=0,primaryMatched=0;
    // Avanzar por grupos vacíos, con un límite por acción para no bombardear Archive.
    for(let attempt=0;attempt<5&&position.group<groups.length;attempt++){
      if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
      const group=groups[position.group];
      const key=`search:2.0.1:${query}:${mode}:${position.group}:${position.page}:${sort}:${musicOnly}`;
      let result=await db.cached(key,30*60*1000);
      if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
      if(!result){
        const params=new URLSearchParams({q:group.q,output:'json',rows:String(rows),page:String(position.page)});
        ['identifier','title','creator','artist','album','year','date','addeddate','format','downloads','subject','collection','description'].forEach(f=>params.append('fl[]',f));
        // Archive usa relevancia al omitir sort; no admite ordenar por "score".
        if(sort!=='relevance'){
          params.append('sort[]',sort==='newest'?'addeddate desc':'downloads desc');
          params.append('sort[]','identifier asc');
        }
        const data=await requestJSON(`https://archive.org/advancedsearch.php?${params}`,signal);
        if(!data.response||!Array.isArray(data.response.docs))throw new Error('Archive cambió su respuesta de búsqueda. Probá nuevamente más tarde.');
        const items=data.response.docs.map(d=>searchDoc(d,musicOnly)).filter(Boolean);
        result={items,total:clamp(data.response.numFound,0,1e10),rawCount:data.response.docs.length,filtered:data.response.docs.length-items.length};
        if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
        await db.cachePut(key,result);
      }
      total=result.total;filtered+=result.filtered;matched+=result.rawCount;if(group.group<2)primaryMatched+=result.rawCount;
      const offset=position.page*rows;
      if(offset>=10000&&offset<total)limitReached=true;
      position=offset>=Math.min(total,10000)||!result.rawCount?{group:position.group+1,page:1}:{group:position.group,page:position.page+1};
      const eligible=result.items.filter(visibleAlbum);filtered+=result.items.length-eligible.length;
      const items=eligible.map(a=>({...a,searchGroup:group.group})).sort((a,b)=>compareResults(a,b,query,mode,sort));
      if(items.length||position.group>=groups.length)return {items,total,filtered,matched,primaryMatched,limitReached,next:position.group<groups.length?position:null};
    }
    return {items:[],total,filtered,matched,primaryMatched,limitReached,next:position.group<groups.length?position:null};
  }
  async function searchForState(state,mode,signal,cursor=null){
    let result=await searchArchive(state.effectiveQuery,mode,state.page+1,state.sort,signal,cursor);
    if(signal.aborted)throw new DOMException('Cancelado','AbortError');
    const empty=!state.hadMatches&&!result.matched&&!result.next;
    const secondary=mode==='all'&&result.items.length>0&&result.items.every(a=>a.searchGroup>=2);
    // Una errata puede existir en la descripción de un recopilatorio. Eso no
    // debe bloquear el hallazgo del artista correcto. Los aciertos en artista
    // o título, incluso ocultos o filtrados, siempre conservan prioridad.
    if(!state.exact&&!state.correctionChecked&&!state.primaryMatches&&!result.primaryMatched&&!state.trackIds.length&&(empty||secondary)){
      state.correctionChecked=true;state.correcting=true;repaintSearch();
      const original=result,originalQuery=state.effectiveQuery;
      try{
        const correction=await findSearchCorrection(state.query,state.mode,signal);
        if(signal.aborted)throw new DOMException('Cancelado','AbortError');
        state.correcting=false;state.suggestions=correction.suggestions;
        if(correction.automatic){
          state.effectiveQuery=correction.automatic;state.suggestions=[];repaintSearch();
          result=await searchArchive(state.effectiveQuery,mode,1,state.sort,signal);
        }
      }catch(e){
        if(signal.aborted)throw e;
        // La mejora es opcional: si falla, conservar la respuesta literal.
        result=original;state.effectiveQuery=originalQuery;state.suggestions=[];
        state.spellingError='No pudimos comprobar nombres parecidos. '+e.message;
      }finally{state.correcting=false;}
    }
    if(signal.aborted)throw new DOMException('Cancelado','AbortError');
    state.hadMatches||=result.matched>0;state.primaryMatches||=result.primaryMatched>0;
    return result;
  }
  function parseMetadata(id,data){
    if(!data||data.is_dark===true||data.is_dark==='true'||!data.metadata)throw new Error('Este álbum fue retirado o ya no es público.');
    const m=data.metadata;
    if(m['access-restricted-item']===true||m['access-restricted-item']==='true')throw new Error('Este álbum tiene acceso restringido en Archive.');
    const files=Array.isArray(data.files)?data.files.filter(f=>f&&validFile(f.name)):[];
    const index=new Map(files.map(f=>[f.name,f]));
    const coverCandidates=files.filter(f=>/\.(jpe?g|png|webp)$/i.test(f.name)&&!f.private&&!f.original&&(!number(f.size)||number(f.size)<2500000)&&!/spectr|waveform|thumb|sprite|__ia_|back|rear/i.test(f.name));
    coverCandidates.sort((a,b)=>(/front|cover|portada|folder/i.test(b.name)?10:0)-(/front|cover|portada|folder/i.test(a.name)?10:0));
    const album=cleanAlbum({id,title:m.title,artist:m.creator||m.artist,year:m.year||text(m.date).slice(0,4),cover:coverCandidates[0]?.name||'',description:plainHTML(m.description),subjects:m.subject,loadedAt:Date.now()});
    const groups=new Map();
    const audioFiles=files.filter(f=>Object.hasOwn(AUDIO,extOf(f.name))&&f.private!==true&&f.private!=='true'&&f.private!=='1'&&(f.size==null||number(f.size)>0));
    for(const f of audioFiles){
      let original=f, depth=0; const seen=new Set();
      while(original.original&&validFile(original.original)&&depth++<12&&!seen.has(original.original)){
        seen.add(original.original);const parent=index.get(original.original);
        if(!parent){original={...original,name:original.original};break;}original=parent;
      }
      const key=stem(original.name), trackId=`${id}::${key}`;
      const fallbackTitle=stem(original.name.split('/').pop()).replace(/_/g,' ').replace(/^\d{1,3}[\s.\-_)]+/,'').trim();
      let t=groups.get(key);
      if(!t){t={id:trackId,albumId:id,title:text(original.title||f.title,fallbackTitle),artist:text(original.creator||original.artist||f.creator||f.artist,album.artist),album:album.title,cover:album.cover,duration:durationOf(original.length||f.length),number:parseInt(text(original.track||f.track||original.name.split('/').pop()),10)||0,disc:parseInt(text(original.disc||f.disc),10)||0,sources:[],added:Date.now()};groups.set(key,t);}
      // Prioridad a las etiquetas de las versiones que sí contienen metadatos.
      if(!original.title&&f.title)t.title=text(f.title,t.title);
      if(!t.duration)t.duration=durationOf(f.length);
      const source=cleanSource({name:f.name,format:f.format,size:f.size,bitrate:parseFloat(f.bitrate),original:f.source==='original'});
      if(source&&!t.sources.some(s=>s.name===source.name))t.sources.push(source);
    }
    const list=[...groups.values()].map(cleanTrack).filter(Boolean).sort((a,b)=>a.disc-b.disc||a.number-b.number||a.sources[0].name.localeCompare(b.sources[0].name,undefined,{numeric:true}));
    album.trackIds=list.map(t=>t.id);return {album,tracks:list};
  }
  async function loadAlbum(id,signal,force=false){
    if(!validId(id))throw new Error('El identificador de este álbum no es válido.');
    const epoch=dataEpoch;
    const key=`album:${id}`;
    let data=!force?await db.cached(key,24*60*60*1000):null;
    if(signal?.aborted||epoch!==dataEpoch)throw new DOMException('Cancelado','AbortError');
    if(!data){data=parseMetadata(id,await requestJSON(`https://archive.org/metadata/${encodeURIComponent(id)}`,signal));await db.cachePut(key,data);}
    if(signal?.aborted||epoch!==dataEpoch)throw new DOMException('Cancelado','AbortError');
    const a=cleanAlbum(data.album);if(!a)throw new Error('No pudimos interpretar este álbum.');
    const list=(Array.isArray(data.tracks)?data.tracks:[]).map(cleanTrack).filter(Boolean);
    list.forEach(rememberTrack);rememberAlbum(a);changed();return {album:a,tracks:list};
  }

  // Canciones: una mezcla progresiva de los discos encontrados, no un filtro del
  // nombre de las pistas. Sólo se consultan metadatos; los audios esperan al Play.
  const SONG_BATCH_SIZE=5;
  function createSongMix(previous,query,sort,effectiveQuery=query){
    const reusable=previous&&!previous.busy&&previous.query===query&&(previous.effectiveQuery||previous.query)===effectiveQuery&&previous.sort===sort&&['all','artist','album'].includes(previous.mode);
    const continueCatalog=reusable&&previous.mode==='all'&&previous.page>0;
    const mix={pending:[],retry:[],albumIds:new Set(),examined:new Set(),attempts:new Map(),pools:[],ready:[],seen:new Set(),recordings:new Map(),started:!!continueCatalog,done:continueCatalog?!previous.hasMore:false,cursor:continueCatalog?previous.cursor:null,primaryMatches:!!(reusable&&previous.primaryMatches),skipped:0,capped:false};
    if(reusable)for(const album of previous.items){if(visibleAlbum(album)&&!mix.albumIds.has(album.id)){mix.albumIds.add(album.id);mix.pending.push(album);}}
    return mix;
  }
  function mixTracksFromAlbum(summary,loaded,query){
    if(hiddenAlbums.has(summary.id)||hiddenAlbums.has(loaded.album.id))return [];
    const q=norm(query), matches=value=>hasWords(norm(value),q), album=loaded.album;
    const multiArtist=/\b(varios (?:artistas|interpretes)|various artists|artistas varios)\b/.test(norm([summary.title,summary.artist,album.title,album.artist]));
    const artistMatch=[summary.artist,album.artist,...(summary.searchInfo?.artists||[])].some(matches);
    const titleMatch=[summary.title,album.title].some(matches);
    const wholeAlbum=!q||(!multiArtist&&(artistMatch||titleMatch));
    return loaded.tracks.filter(t=>t.sources.some(supported)&&(wholeAlbum||matches(t.artist)));
  }
  async function mixLoadAlbum(summary,signal){
    const controller=new AbortController(),abort=()=>controller.abort();
    signal.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,10000);
    try{
      if(signal.aborted)throw new DOMException('Cancelado','AbortError');
      return await loadAlbum(summary.id,controller.signal);
    }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  function fillMixReady(mix,fresh=[]){
    const order=[...fresh,...shuffleArray(mix.pools.filter(pool=>!fresh.includes(pool)))];
    let advanced=true;
    while(mix.ready.length<SONG_BATCH_SIZE&&advanced){
      advanced=false;
      for(const pool of order){
        if(mix.ready.length>=SONG_BATCH_SIZE)break;
        while(pool.position<pool.ids.length){
          advanced=true;
          const id=pool.ids[pool.position++],t=tracks.get(id);
          if(!t||hiddenAlbums.has(t.albumId)||mix.seen.has(id))continue;
          mix.seen.add(id);
          const artist=norm(t.artist),title=norm(t.title);
          // Conservar versiones distintas (en vivo, remix, etc.). Sólo deduplicar
          // etiquetas iguales con duración prácticamente idéntica y autor conocido.
          const identifiable=t.duration>0&&artist&&artist!=='artista sin indicar'&&title&&!/^(?:track|pista|audio|sin titulo)(?: \d+)?$/.test(title);
          const key=artist+'::'+title,durations=mix.recordings.get(key)||[];
          if(identifiable&&durations.some(d=>Math.abs(d-t.duration)<=1))continue;
          if(identifiable){durations.push(t.duration);mix.recordings.set(key,durations);}
          mix.ready.push(id);break;
        }
      }
    }
    mix.pools=mix.pools.filter(pool=>pool.position<pool.ids.length);
  }
  async function loadSongBatch(state,signal){
    const mix=state.mix;let metadataRequests=0,catalogRequests=0;
    state.hadMatches||=mix.albumIds.size>0;state.primaryMatches||=mix.primaryMatches;
    pruneHiddenMix(mix);
    // Los fallos transitorios se reintentan una vez en una acción posterior.
    mix.pending.push(...mix.retry.splice(0));
    while(mix.ready.length<SONG_BATCH_SIZE&&metadataRequests<6){
      if(signal.aborted)throw new DOMException('Cancelado','AbortError');
      if(!mix.pending.length){
        if(mix.done||catalogRequests>=2)break;
        try{
          const result=await searchForState(state,'all',signal,mix.started?mix.cursor:null);
          if(signal.aborted)throw new DOMException('Cancelado','AbortError');
          catalogRequests++;mix.started=true;mix.cursor=result.next;mix.done=!result.next;
          state.filtered+=result.filtered;state.limitReached||=result.limitReached;
          for(const album of result.items){if(!mix.albumIds.has(album.id)){mix.albumIds.add(album.id);mix.pending.push(album);}}
        }catch(e){if(signal.aborted)throw e;state.error=e.message;break;}
        if(!mix.pending.length)continue;
      }
      mix.pending=mix.pending.filter(visibleAlbum);
      if(!mix.pending.length)continue;
      const batch=mix.pending.splice(0,Math.min(3,6-metadataRequests));metadataRequests+=batch.length;
      const results=await Promise.allSettled(batch.map(album=>mixLoadAlbum(album,signal)));
      if(signal.aborted){mix.pending.unshift(...batch);throw new DOMException('Cancelado','AbortError');}
      const fresh=[];
      results.forEach((result,index)=>{
        const summary=batch[index];mix.examined.add(summary.id);
        if(result.status==='rejected'){
          const attempts=(mix.attempts.get(summary.id)||0)+1;mix.attempts.set(summary.id,attempts);mix.skipped++;
          if(attempts<2&&![403,404].includes(result.reason?.status))mix.retry.push(summary);
          return;
        }
        const candidates=mixTracksFromAlbum(summary,result.value,state.effectiveQuery);
        if(!candidates.length){mix.skipped++;return;}
        const pool={albumId:summary.id,ids:shuffleArray(candidates.map(t=>t.id)),position:0};
        mix.pools.push(pool);fresh.push(pool);
        if(!state.items.some(a=>a.id===summary.id))state.items.push(result.value.album);
      });
      state.scanned=mix.examined.size;
      fillMixReady(mix,fresh);
    }
    if(signal.aborted)throw new DOMException('Cancelado','AbortError');
    fillMixReady(mix);
    mix.ready=mix.ready.filter(visibleTrack);
    const room=Math.max(0,LIMIT.queue-state.trackIds.length);
    state.trackIds.push(...mix.ready.splice(0,Math.min(SONG_BATCH_SIZE,room)));
    mix.capped=state.trackIds.length>=LIMIT.queue;
    state.hasMore=!mix.capped&&!!(mix.ready.length||mix.pools.length||mix.pending.length||mix.retry.length||!mix.done);
    state.page++;trackDisplayLimit=Math.max(trackDisplayLimit,state.trackIds.length);
  }

  // Interfaz: una sola raíz, delegación de eventos y listas renderizadas por tandas.
  const attrs=(o={})=>Object.entries(o).map(([k,v])=>` data-${k}="${esc(v)}"`).join('');
  const btn=(label,action,data={},kind='smp-button',symbol='')=>`<button type="button" class="${kind}" data-action="${action}"${attrs(data)}>${symbol?icon(symbol):''}${esc(label)}</button>`;
  const ibtn=(label,action,data={},symbol='more',active=false)=>`<button type="button" class="smp-icon-button${active?' is-active':''}" data-action="${action}"${attrs(data)} aria-label="${esc(label)}"${['track-like','album-like'].includes(action)?` aria-pressed="${active}"`:''}>${icon(symbol)}</button>`;
  function cover(item,full=false){
    if(!item)return '<span class="smp-cover" aria-hidden="true"></span>';
    const id=item.albumId||item.id, file=item.cover||albums.get(id)?.cover;
    const src=full&&file&&meta.settings.quality!=='saver'?mediaURL(id,file):thumbURL(id);
    const hue=[...id].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
    return `<span class="smp-cover" style="background:linear-gradient(140deg,hsl(${hue} 18% 30%),hsl(${hue} 17% 13%))"><img src="${esc(src)}" data-fallback="${esc(thumbURL(id))}" alt="${esc(item.title)}" loading="${full?'eager':'lazy'}" decoding="async" referrerpolicy="no-referrer" /></span>`;
  }
  function pageHead(title,subtitle='',action=''){return `<div class="smp-page-head"><div><span class="smp-eyebrow">SANAVERA MP3 / TU ESPACIO</span><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${action}</div>`;}
  function sectionHead(title,subtitle='',action=''){return `<div class="smp-section-heading"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${action}</div>`;}
  function empty(title,description,action='',symbol='music'){return `<div class="smp-empty">${icon(symbol)}<h3>${esc(title)}</h3><p>${esc(description)}</p>${action}</div>`;}
  function skeleton(count=6){return `<div class="smp-album-grid" aria-label="Cargando álbumes" aria-busy="true">${Array.from({length:count},()=>'<div class="smp-skeleton-card"><div class="smp-skeleton"></div></div>').join('')}</div>`;}
  function albumCards(list){
    return `<div class="smp-album-grid">${list.map(a=>`<article class="smp-album-card"><button type="button" class="smp-album-open" data-action="album" data-id="${esc(a.id)}" aria-label="Abrir ${esc(a.title)}">${cover(a)}<span class="smp-album-title">${esc(a.title)}</span><span class="smp-album-artist">${esc(a.artist)}${a.year?` · ${esc(a.year)}`:''}</span></button><button type="button" class="smp-icon-button smp-album-menu" data-action="album-menu" data-id="${esc(a.id)}" aria-label="Opciones de ${esc(a.title)}" aria-haspopup="dialog">${icon('more')}</button>${ibtn(meta.albumLikes.includes(a.id)?'Quitar álbum de favoritos':'Guardar álbum','album-like',{id:a.id},'heart',meta.albumLikes.includes(a.id))}</article>`).join('')}</div>`;
  }
  function trackRows(ids,{limit=trackDisplayLimit,history=false,context=true,showAlbum=false}={}){
    const valid=ids.filter(id=>tracks.has(id));if(context)trackContext=valid;
    const active=currentTrack()?.id;
    return `<div class="smp-track-list">${valid.slice(0,limit).map((id,index)=>{
      const t=tracks.get(id), liked=meta.likes.includes(id), current=active===id;
      return `<div class="smp-track${current?' is-current':''}" data-track-id="${esc(id)}"><button type="button" class="smp-track-play" data-action="track-play" data-id="${esc(id)}" data-index="${index}" aria-label="Reproducir ${esc(t.title)}"><span class="smp-track-number">${current?icon('music'):String(index+1).padStart(2,'0')}</span>${cover(t)}<span class="smp-track-copy"><strong>${esc(t.title)}</strong><small>${esc(t.artist)}${showAlbum?' · '+esc(t.album):''}${history?' · '+esc(dateLabel(meta.history.find(h=>h.id===id)?.at||Date.now())):''}</small></span></button><span class="smp-track-duration">${t.duration?fmt(t.duration):'—'}</span><button type="button" class="smp-icon-button smp-track-like${liked?' is-active':''}" data-action="track-like" data-id="${esc(id)}" aria-label="${liked?'Quitar de':'Agregar a'} favoritos" aria-pressed="${liked}">${icon('heart')}</button>${ibtn('Opciones de '+t.title,'track-menu',{id},'more')}</div>`;
    }).join('')}</div>${valid.length>limit?`<div class="smp-load-more">${btn(`Mostrar más (${valid.length-limit})`,'tracks-more')}</div>`:''}`;
  }
  const genres=()=>`<div class="smp-genres">${[['Cumbia','Para levantar el día','cumbia'],['Rock argentino','Subí un poco el volumen','rock argentino'],['Jazz','Bajá un cambio','jazz'],['Electrónica','Encontrá tu frecuencia','electronic']].map(([title,sub,q])=>`<button type="button" class="smp-genre" data-action="quick-search" data-query="${q}"><strong>${title}</strong><small>${sub}</small>${icon('music')}</button>`).join('')}</div>`;
  function renderHome(){
    const resume=meta.settings.remember?(currentResume()||meta.resume):null,t=resume&&tracks.get(resume.trackId);
    const recent=unique(meta.history.map(h=>h.id)).filter(visibleTrack).slice(0,5);
    main.innerHTML=`<section class="smp-hero smp-home-hero"><div><span class="smp-eyebrow">SANAVERA MP3 / TU ARCHIVO DE SIEMPRE</span><h1>De todo <em>un poco.</em></h1><p>Discos para descubrir. Elegí uno y dejalo sonar.</p><div class="smp-actions">${btn('Otra mezcla','discovery-remix',{},'smp-button smp-primary','shuffle')}${btn('Buscar música','navigate',{view:'search'},'smp-text-button','search')}</div></div><span class="smp-home-disc" aria-hidden="true">${icon('disc')}</span></section>
      <div id="smp-discovery">${discoveryHTML()}</div>
      ${t?`<section class="smp-resume">${cover(t)}<div><span class="smp-eyebrow">SEGUÍ DONDE LO DEJASTE</span><h3>${esc(t.title)}</h3><p>${esc(t.artist)} · ${fmt(resume.position)}</p></div>${ibtn('Continuar escuchando','resume',{},'play')}</section>`:''}
      ${sectionHead('¿Qué tenés ganas de escuchar?')}${genres()}
      ${recent.length?sectionHead('Todavía en tu cabeza','Tus últimas canciones',btn('Historial','navigate',{view:'history'},'smp-text-button','arrow'))+trackRows(recent):''}
      <p class="smp-bottom-note">Tu selección se renueva al abrir la página. Los discos ocultos se administran desde Ajustes.</p>`;
  }
  function homeQuery(musicOnly){
    return `(${HOME_QUERY}) AND mediatype:audio AND NOT access-restricted-item:true${musicOnly?' AND NOT '+SPOKEN_QUERY:''}`;
  }
  async function homePage(page,musicOnly,signal){
    const key=`home:2.0.4:${HOME_QUERY}:${musicOnly}:${page}`,ttl=30*60*1000;
    const cached=await db.cached(key,ttl);
    if(signal.aborted)throw new DOMException('Cancelado','AbortError');
    if(cached&&Array.isArray(cached.items)&&Number.isFinite(cached.total))return cached;
    const params=new URLSearchParams({q:homeQuery(musicOnly),output:'json',rows:String(page?LIMIT.page:0),page:String(page||1)});
    const fields=page?['identifier','title','creator','artist','year','date','format','downloads','subject','collection','description']:['identifier'];
    fields.forEach(f=>params.append('fl[]',f));params.append('sort[]','downloads desc');params.append('sort[]','identifier asc');
    const data=await requestJSON(`https://archive.org/advancedsearch.php?${params}`,signal);
    if(!data.response||!Array.isArray(data.response.docs)||!Number.isFinite(Number(data.response.numFound)))throw new Error('Archive no devolvió una lista válida de discos. Probá otra vez.');
    const result={total:clamp(data.response.numFound,0,1e10),items:data.response.docs.map(d=>searchDoc(d,musicOnly)).filter(Boolean)};
    if(signal.aborted)throw new DOMException('Cancelado','AbortError');
    await db.cachePut(key,result);return result;
  }
  function homeHasMore(){return discovery.items.filter(visibleAlbum).length<LIMIT.home&&!!(discovery.pool.some(visibleAlbum)||discovery.pages===null||discovery.pages.length);}
  function discoveryHTML(){
    const shown=discovery.items.filter(visibleAlbum);
    let html=shown.length?`<p class="smp-home-caption">${shown.length} discos para explorar · una mezcla del archivo original</p>`+albumCards(shown):'';
    if(discovery.loading||!discovery.started)html+=shown.length?'<div class="smp-boot smp-home-loading" role="status"><span class="smp-spinner"></span><p>Buscando más discos…</p></div>':skeleton(HOME_BATCH);
    else{
      if(discovery.error)html+=empty('El archivo está tomando aire',discovery.error,btn('Reintentar','discovery-retry'),'wifi');
      else if(!shown.length)html+=empty(homeHasMore()?'Seguimos buscando discos':'No hay discos para mostrar',homeHasMore()?'Esta tanda tenía publicaciones ocultas o sin música identificable. Podés revisar otra tanda.':'La búsqueda original no tiene más discos visibles con los filtros actuales. Podés revisar tus discos ocultos o volver a intentar.',homeHasMore()?'':btn('Revisar discos ocultos','navigate',{view:'hidden'}),'disc');
      if(!discovery.error&&homeHasMore())html+=`<div class="smp-load-more">${btn('Ver 12 más','discovery-more',{},'smp-button','plus')}</div>`;
      else if(!discovery.error&&shown.length)html+=`<p class="smp-note">${shown.length>=LIMIT.home?'Esta mezcla llegó a 120 discos. Tocá «Otra mezcla» para seguir explorando.':'Llegaste al final de los discos visibles de esta selección.'}</p>`;
    }
    return html;
  }
  function repaintDiscovery(){if(view.name==='home'){const el=$('#smp-discovery');if(el)el.innerHTML=discoveryHTML();}}
  function resetDiscovery(){discoveryController?.abort();discoveryController=null;discovery=emptyDiscovery();}
  async function discover({more=false,remix=false}={}){
    if(remix)resetDiscovery();
    if(discovery.loading||(!more&&discovery.started)||more&&!homeHasMore())return;
    const state=discovery,controller=new AbortController(),epoch=dataEpoch,musicOnly=meta.settings.musicOnly;
    discoveryController=controller;const signal=controller.signal;
    state.loading=true;state.started=true;state.error='';repaintDiscovery();
    const current=()=>!signal.aborted&&state===discovery&&epoch===dataEpoch;
    try{
      if(state.pages===null){
        const [count,last]=await Promise.all([homePage(0,musicOnly,signal),db.cached(`home:last:${musicOnly}`,24*60*60*1000)]);
        if(!current())return;
        state.total=count.total;
        // El recorrido de páginas es aleatorio sin reposición; no se descargan todos
        // los identificadores. El límite mantiene cada consulta dentro de Archive.
        const pages=Math.min(Math.ceil(state.total/LIMIT.page),Math.floor(10000/LIMIT.page));
        state.pages=shuffleArray(Array.from({length:pages},(_,i)=>i+1));
        if(state.pages.length>1&&state.pages[0]===last)[state.pages[0],state.pages[1]]=[state.pages[1],state.pages[0]];
      }
      const target=Math.min(LIMIT.home,state.items.filter(visibleAlbum).length+HOME_BATCH);
      let requests=0;
      while(state.items.filter(visibleAlbum).length<target){
        if(!current())return;
        while(state.pool.length&&state.items.filter(visibleAlbum).length<target){
          const album=state.pool.shift();if(visibleAlbum(album))state.items.push(album);
        }
        if(state.items.filter(visibleAlbum).length>=target||!state.pages.length||requests>=3)break;
        const page=state.pages[0],result=await homePage(page,musicOnly,signal);requests++;
        if(!current())return;
        state.pages.shift();
        const fresh=shuffleArray(result.items.filter(a=>!state.seen.has(a.id)));
        for(const a of fresh){state.seen.add(a.id);if(visibleAlbum(a))state.pool.push(a);if(!albums.has(a.id))rememberAlbum(a);}
        await db.cachePut(`home:last:${musicOnly}`,page);
      }
      if(current())changed();
    }catch(e){if(current()&&e.name!=='AbortError')state.error=e.message;}
    finally{if(current()){state.loading=false;repaintDiscovery();}}
  }
  function searchFilters(){
    return `<div class="smp-filterbar"><div class="smp-pills">${[['all','Todo'],['artist','Artistas'],['album','Álbumes'],['song','Canciones']].map(([mode,label])=>`<button type="button" class="smp-pill${searchState.mode===mode?' is-active':''}" data-action="search-mode" data-mode="${mode}" aria-pressed="${searchState.mode===mode}">${label}</button>`).join('')}</div><label><span class="smp-note">${searchState.mode==='song'?'Discos':'Orden'}: </span><select id="smp-search-sort" aria-label="Orden de resultados"><option value="relevance"${searchState.sort==='relevance'?' selected':''}>Relevancia</option><option value="downloads"${searchState.sort==='downloads'?' selected':''}>Más escuchados</option><option value="newest"${searchState.sort==='newest'?' selected':''}>Recién publicados</option></select></label></div>`;
  }
  function spellingNotice(){
    const s=searchState;
    if(s.correcting)return '<p class="smp-note" role="status">Buscando nombres parecidos…</p>';
    if(s.spellingError)return `<div class="smp-spelling"><p class="smp-note" role="status">${esc(s.spellingError)}</p><div class="smp-pills">${btn('Reintentar sugerencias','search-spelling-retry')}</div></div>`;
    if(s.effectiveQuery&&s.effectiveQuery!==s.query)return `<div class="smp-spelling"><p class="smp-note" role="status">Mostrando resultados para <strong>${esc(s.effectiveQuery)}</strong>.</p><div class="smp-pills">${btn('Buscar tal como escribí','search-exact')}</div></div>`;
    if(s.suggestions.length)return `<div class="smp-spelling"><p class="smp-note" role="status">¿Quisiste buscar alguno de estos nombres?</p><div class="smp-pills">${s.suggestions.map(query=>btn(query,'search-suggestion',{query},'smp-button')).join('')}</div></div>`;
    if(s.exact)return '<p class="smp-note" role="status">Búsqueda sin corrección automática.</p>';
    return '';
  }
  function renderSearch(){
    const q=searchState.query;
    main.innerHTML=pageHead(q?`Buscando «${q}»`:'Explorá a tu ritmo',searchState.mode==='song'?'Canciones de tus artistas y discos, mezcladas para vos.':'Un artista, ese disco o una canción que no te podés sacar de la cabeza.')+searchFilters()+
      (q&&searchState.mode==='all'?'<p class="smp-note">Primero el artista, después el título o álbum y luego la descripción. El orden elegido se aplica dentro de cada grupo. Los resultados secundarios aparecen al final.</p>':'')+
      (searchState.mode==='song'?'<p class="smp-note">Buscá un artista o un álbum. Mezclamos sus canciones de a cinco, combinando distintos discos. Tocá «Ver 5 más» para ampliar la selección.</p>':'')+
      `<div id="smp-search-results">${searchResultsHTML()}</div>`;
  }
  function songResultsHTML(){
    const s=searchState,mix=s.mix,visibleIds=s.trackIds.filter(visibleTrack);
    let html=`<div class="smp-results-meta"><span>${visibleIds.length} canciones · ${s.scanned} álbumes revisados</span><span>${meta.settings.musicOnly?'Filtro musical activo':'Todo el audio'}</span></div>`;
    if(s.error)html+=empty('No pudimos completar esta tanda',s.error,btn('Reintentar','search-retry'),'wifi');
    if(visibleIds.length)html+=sectionHead('Tu selección',`${new Set(visibleIds.map(id=>tracks.get(id)?.albumId)).size} discos en la mezcla`,btn('Escuchar','song-mix-play',{},'smp-button smp-primary','play'))+trackRows(visibleIds,{showAlbum:true});
    else if(!s.busy&&!s.error)html+=empty(s.hasMore?'Seguimos buscando temas':'No encontramos canciones para esta selección',s.hasMore?'Estos álbumes no aportaron canciones reproducibles relacionadas con tu búsqueda. Probá con los siguientes.':'Probá con el nombre del artista o de uno de sus discos.',s.hasMore?'':btn('Buscar otra cosa','focus-search'),'music');
    if(s.busy)html+='<div class="smp-boot" style="padding:24px" role="status"><span class="smp-spinner"></span><p>Armando tu mezcla…</p></div>';
    else if(s.hasMore)html+=`<div class="smp-load-more">${btn('Ver 5 más','search-more',{},'smp-button','plus')}</div>`;
    else if(visibleIds.length)html+=`<p class="smp-note">${mix?.capped?'Esta selección llegó a 3.000 canciones. Podés afinar la búsqueda para armar otra.':'Llegaste al final de los temas disponibles en los álbumes revisados.'}</p>`;
    if(mix?.skipped&&!s.busy)html+='<p class="smp-note">Se omitieron álbumes que no respondieron o no aportaron canciones reproducibles para esta búsqueda.</p>';
    if(s.limitReached)html+='<p class="smp-note">Archive limitó los resultados de algún grupo. Afiná la búsqueda para explorar más discos.</p>';
    return html;
  }
  function searchResultsHTML(){
    const s=searchState,visible=s.items.filter(visibleAlbum), hasQuery=s.page>0||s.busy||s.error,notice=spellingNotice();
    if(!hasQuery){return `${meta.searches.length?sectionHead('Tus últimas búsquedas')+`<div class="smp-pills">${meta.searches.map(q=>btn(q,'quick-search',{query:q},'smp-pill','history')).join('')}</div>`:''}${sectionHead('Elegí por dónde empezar')}${genres()}${sectionHead('También podés abrir un álbum')}<form id="smp-open-archive" class="smp-searchbar"><span data-icon="disc">${icon('disc')}</span><input name="archive" type="text" placeholder="Pegá un enlace de archive.org/details/…" aria-label="Enlace o identificador de Archive" maxlength="500" /><button type="submit" class="smp-icon-button" aria-label="Abrir enlace">${icon('arrow')}</button></form>`;}
    if(s.mode==='song')return notice+songResultsHTML();
    if(s.busy&&!visible.length)return notice+skeleton();
    let html=notice+`<div class="smp-results-meta"><span>${visible.length.toLocaleString('es-AR')} publicaciones mostradas${s.mode==='song'?` · ${s.scanned} revisadas`:''}${s.filtered?` · ${s.filtered} descartadas`:''}</span><span>${meta.settings.musicOnly?'Filtro musical activo':'Todo el audio'}</span></div>`;
    if(s.error)html+=empty('No pudimos completar la búsqueda',s.error,btn('Reintentar','search-retry'),'wifi');
    if(visible.length){
      if(s.mode==='all'&&lucene(s.query)){
        SEARCH_GROUPS.forEach((label,index)=>{const items=visible.filter(a=>a.searchGroup===index);if(items.length)html+=sectionHead(label,index===4?'Publicaciones con datos incompletos, enganchados y otras coincidencias de menor prioridad.':'')+albumCards(items);});
      }else html+=albumCards(visible);
    }else if(!s.busy&&!s.error)html+=empty(s.hasMore?'Seguimos buscando música':'Por acá todavía no suena nada',s.hasMore?'Esta tanda no tenía audio musical identificable. Podés revisar las siguientes coincidencias.':'Probá menos palabras, otro artista o desactivá el filtro musical en Ajustes.',s.hasMore?'':btn('Buscar otra cosa','focus-search'),'search');
    if(s.busy)html+='<div class="smp-boot" style="padding:24px"><span class="smp-spinner"></span><p>Buscando música…</p></div>';
    else if(s.hasMore)html+=`<div class="smp-load-more">${btn('Cargar más resultados','search-more',{},'smp-button','down')}</div>`;
    if(s.limitReached)html+='<p class="smp-note">Archive limita cada grupo a 10.000 resultados. Agregá un artista o álbum para afinar la búsqueda.</p>';
    return html;
  }
  function repaintSearch(){if(view.name==='search'){const el=$('#smp-search-results');if(el)el.innerHTML=searchResultsHTML();}}
  async function loadSearchPage(state,signal){
    if(state.mode==='song'){await loadSongBatch(state,signal);return;}
    const result=await searchForState(state,state.mode,signal,state.cursor);
    if(signal.aborted)throw new DOMException('Cancelado','AbortError');
    state.page++;state.total=result.total;state.cursor=result.next;state.hasMore=!!result.next;state.filtered+=result.filtered;state.limitReached||=result.limitReached;
    const known=new Set(state.items.map(a=>a.id));
    for(const a of result.items){if(!known.has(a.id)){state.items.push(a);known.add(a.id);}if(!albums.has(a.id))rememberAlbum(a);}
    state.items.sort((a,b)=>compareResults(a,b,state.effectiveQuery,state.mode,state.sort));
  }
  async function runSearch(query,{more=false,mode:requestedMode,sort:requestedSort,exact=false,keepSpelling=false}={}){
    clearTimeout(debounceTimer);query=text(query,'',160);
    if(more&&(searchState.busy||(!searchState.hasMore&&!searchState.error)))return;
    searchController?.abort();const controller=new AbortController();searchController=controller;
    if(!more){
      const previous=searchState,mode=['all','artist','album','song'].includes(requestedMode)?requestedMode:previous.mode,sort=['relevance','newest','downloads'].includes(requestedSort)?requestedSort:previous.sort;
      const inherit=keepSpelling&&previous.query===query;
      searchState={...emptySearch(),mode,sort,query,effectiveQuery:inherit?(previous.effectiveQuery||query):query,exact:exact||(inherit&&previous.exact)};
      if(searchState.exact)searchState.effectiveQuery=query;
      searchState.correctionChecked=searchState.exact||searchState.effectiveQuery!==query;
      if(mode==='song'){searchState.mix=createSongMix(previous,query,sort,searchState.effectiveQuery);searchState.hasMore=true;}
      trackDisplayLimit=80;
    }
    const state=searchState;
    state.busy=true;state.error='';
    if(view.name!=='search')navigate('search');else if(!more)renderSearch();else repaintSearch();
    if(query&&!more){meta.searches=unique([query,...meta.searches]).slice(0,10);changed();}
    try{
      await loadSearchPage(state,controller.signal);
      if(!controller.signal.aborted&&state===searchState)changed();
    }catch(e){if(e.name!=='AbortError'&&!controller.signal.aborted&&state===searchState)state.error=e.message;}
    finally{if(searchController===controller){state.busy=false;state.correcting=false;repaintSearch();}}
  }
  let backView={name:'home',id:null};
  function navigate(name,id=null){
    if(!['home','search','library','favorites','history','settings','hidden','album','playlist'].includes(name))return;
    if(name!=='home'&&discovery.loading){discoveryController?.abort();discovery.loading=false;discovery.started=discovery.items.some(visibleAlbum);}
    if(name==='hidden'){hiddenLimit=40;hiddenFilter='';}
    if(name==='album'&&view.name!=='album')backView={...view};
    albumController?.abort();viewSerial++;view={name,id};trackDisplayLimit=80;trackContext=[];libraryAlbumLimit=36;libraryPlaylistLimit=40;
    $('#smp-player').hidden=true;setFullInert(false);
    $$('.smp-desktop-nav [data-view],.smp-bottom-nav [data-view]').forEach(b=>{const active=b.dataset.view===name||(b.dataset.view==='library'&&name==='playlist');if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    renderView();main.scrollTop=0;
    if(name==='home')discover();
    if(name==='search'&&!searchState.query&&!searchState.page)$('#smp-search').focus({preventScroll:true});
  }
  function renderView(){
    if(view.name==='home')renderHome();
    else if(view.name==='search')renderSearch();
    else if(view.name==='album')renderAlbum(view.id);
    else if(view.name==='library')renderLibrary();
    else if(view.name==='favorites')renderFavorites();
    else if(view.name==='playlist')renderPlaylist(view.id);
    else if(view.name==='history')renderHistory();
    else if(view.name==='settings')renderSettings();
    else if(view.name==='hidden')renderHidden();
  }
  async function renderAlbum(id,force=false){
    const serial=viewSerial;
    const cached=albums.get(id);
    const loaded=cached?.loadedAt&&cached.trackIds.every(tid=>tracks.has(tid));
    if(loaded&&!force)paintAlbum(cached);
    else main.innerHTML=btn('Volver','back',{},'smp-text-button smp-back','back')+skeleton(4);
    const controller=new AbortController();albumController=controller;
    if(loaded&&!force&&Date.now()-cached.loadedAt<24*60*60*1000)return;
    try{const data=await loadAlbum(id,controller.signal,force);if(viewSerial===serial&&view.name==='album')paintAlbum(data.album);}
    catch(e){if(e.name==='AbortError'||serial!==viewSerial)return;if(loaded){toast('Mostrando las pistas guardadas. '+e.message);}else main.innerHTML=btn('Volver','back',{},'smp-text-button smp-back','back')+empty('No pudimos abrir este álbum',e.message,btn('Volver a intentar','album-refresh',{id}),'disc')+`<p class="smp-note"><a href="${detailsURL(id)}" target="_blank" rel="noopener noreferrer">Ver el elemento en Archive ${icon('external')}</a></p>`;}
  }
  function paintAlbum(a){
    const list=a.trackIds.filter(id=>tracks.has(id)), total=list.reduce((s,id)=>s+tracks.get(id).duration,0);
    main.innerHTML=btn('Volver','back',{},'smp-text-button smp-back','back')+`<section class="smp-album-hero">${cover(a,true)}<div><span class="smp-eyebrow">ÁLBUM / INTERNET ARCHIVE</span><h1>${esc(a.title)}</h1><p>${esc(a.artist)}${a.year?` · ${esc(a.year)}`:''}<br />${list.length} canciones${total?' · '+Math.round(total/60)+' min':''}</p><div class="smp-actions">${list.length?btn('Reproducir','album-play',{id:a.id},'smp-button smp-primary','play'):''}${ibtn(meta.albumLikes.includes(a.id)?'Quitar álbum guardado':'Guardar álbum','album-like',{id:a.id},'heart',meta.albumLikes.includes(a.id))}${ibtn('Agregar álbum a la cola','album-queue',{id:a.id},'queue')}${ibtn('Actualizar canciones','album-refresh',{id:a.id},'repeat')}${btn(hiddenAlbums.has(a.id)?'Volver a mostrar':'No mostrar más',hiddenAlbums.has(a.id)?'album-unhide':'album-hide',{id:a.id},'smp-text-button',hiddenAlbums.has(a.id)?'eye':'hide')}</div></div></section>`+
      (a.description?`<details class="smp-description"><summary>Acerca de esta publicación</summary><p>${esc(a.description)}</p></details>`:'')+
      (list.length?trackRows(list):empty('Este álbum no tiene audio disponible','Puede contener archivos privados, archivos eliminados o formatos que no podemos ofrecer. Podés consultar la publicación original.','', 'disc'))+
      `<p class="smp-note"><a href="${detailsURL(a.id)}" target="_blank" rel="noopener noreferrer">Ver publicación y condiciones en Internet Archive ${icon('external')}</a></p>`;
  }
  function renderLibrary(){
    main.innerHTML=pageHead('Tu biblioteca','Un lugar para todo lo que querés volver a escuchar.',btn('Nueva playlist','playlist-new',{},'smp-button','plus'))+
      `<div class="smp-stat-grid"><div class="smp-stat"><strong>${meta.likes.length}</strong><span>canciones favoritas</span></div><div class="smp-stat"><strong>${meta.albumLikes.length}</strong><span>álbumes guardados</span></div><div class="smp-stat"><strong>${meta.playlists.length}</strong><span>playlists tuyas</span></div></div><div class="smp-pills">${btn('Me gusta','navigate',{view:'favorites'},'smp-pill','heart')}${btn('Historial','navigate',{view:'history'},'smp-pill','history')}${btn('Exportar biblioteca','export',{},'smp-pill','download')}</div>`+
      sectionHead('Tus playlists','Para cada momento, una banda sonora.')+
      (meta.playlists.length?`<div class="smp-playlist-grid">${meta.playlists.slice(0,libraryPlaylistLimit).map(p=>`<button type="button" class="smp-playlist-card" data-action="playlist" data-id="${esc(p.id)}"><span>${icon('music')}</span><span><strong>${esc(p.name)}</strong><small>${p.trackIds.length} canciones</small></span></button>`).join('')}</div>${meta.playlists.length>libraryPlaylistLimit?`<div class="smp-load-more">${btn('Más playlists','library-playlists-more')}</div>`:''}`:empty('Dale un nombre a tu próxima playlist','Creala acá y sumá canciones desde el menú de cada tema.',btn('Crear mi primera playlist','playlist-new',{},'smp-button smp-primary','plus'),'list'))+
      sectionHead('Álbumes que se quedan')+(meta.albumLikes.length?albumCards(meta.albumLikes.slice(0,libraryAlbumLimit).map(id=>albums.get(id)).filter(Boolean))+(meta.albumLikes.length>libraryAlbumLimit?`<div class="smp-load-more">${btn('Más álbumes guardados','library-albums-more')}</div>`:''):empty('Todavía no guardaste discos','Tocá el corazón de un álbum y lo vas a encontrar acá.',btn('Descubrir música','navigate',{view:'search'}),'disc'));
  }
  function renderFavorites(){
    main.innerHTML=pageHead('Las que te gustan',`${meta.likes.length} canciones que vale la pena repetir.`,meta.likes.length?btn('Escuchar','favorites-play',{},'smp-button smp-primary','play'):'')+
      (meta.likes.length?trackRows(meta.likes):empty('Acá van tus imprescindibles','Guardá una canción con el corazón. Va a seguir acá cuando vuelvas.',btn('Encontrar canciones','navigate',{view:'search'}),'heart'));
  }
  function renderPlaylist(id){
    const p=meta.playlists.find(p=>p.id===id);
    if(!p){navigate('library');return;}
    main.innerHTML=btn('Tu biblioteca','navigate',{view:'library'},'smp-text-button smp-back','back')+pageHead(p.name,`${p.trackIds.length} canciones · Creada el ${dateLabel(p.created)}`)+
      `<div class="smp-actions">${p.trackIds.length?btn('Reproducir','playlist-play',{id},'smp-button smp-primary','play'):''}${btn('Renombrar','playlist-rename',{id},'smp-button','edit')}${btn('Eliminar','playlist-delete',{id},'smp-text-button','trash')}</div>`+
      (p.trackIds.length?trackRows(p.trackIds):empty('Esta playlist espera su primer tema','Buscá una canción, tocá sus tres puntos y elegí «Agregar a playlist».',btn('Buscar música','navigate',{view:'search'}),'list'));
  }
  function renderHistory(){
    const recent=unique(meta.history.map(h=>h.id));
    const counts=new Map();meta.history.forEach(h=>counts.set(h.id,(counts.get(h.id)||0)+1));
    const top=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id])=>tracks.get(id));
    main.innerHTML=pageHead('Tu recorrido musical','Las canciones se registran después de empezar a escucharlas.',meta.history.length?btn('Borrar historial','history-clear',{},'smp-text-button','trash'):'')+
      `<div class="smp-stat-grid"><div class="smp-stat"><strong>${Math.floor(meta.seconds/60).toLocaleString('es-AR')}</strong><span>minutos escuchados</span></div><div class="smp-stat"><strong>${meta.plays.toLocaleString('es-AR')}</strong><span>reproducciones</span></div><div class="smp-stat"><strong>${recent.length}</strong><span>temas en el historial</span></div></div>`+
      (top.length?sectionHead('En tu rotación', 'Las que más repetiste en tu historial')+`<div class="smp-pills">${top.map(t=>btn(t.title,'play-single',{id:t.id},'smp-pill','music')).join('')}</div>`:'')+
      sectionHead('Reproducidas recientemente')+(recent.length?trackRows(recent,{history:true}):empty('Tu historia arranca con un play','Escuchá un tema y empezamos a guardar tu recorrido.','', 'history'));
  }
  function renderSettings(){
    const s=meta.settings;
    const check=(key,title,sub)=>`<div class="smp-setting"><label for="smp-setting-${key}"><strong>${title}</strong><p>${sub}</p></label><input id="smp-setting-${key}" type="checkbox" data-setting="${key}"${s[key]?' checked':''} /></div>`;
    main.innerHTML=pageHead('A tu manera','Tu música y tus datos, bajo tu control.')+
      `<section class="smp-settings-group"><h2>Tu sonido</h2><div class="smp-setting"><div><strong>Ecualizador y refuerzo</strong><p id="smp-eq-summary">${esc(equalizerStatus())}</p></div>${btn('Ajustar','equalizer',{},'smp-button','equalizer')}</div></section>`+
      `<section class="smp-settings-group"><h2>Tu experiencia</h2><div class="smp-setting"><label for="smp-theme"><strong>Color de acento</strong><p>El mismo universo, otro tono.</p></label><select id="smp-theme" data-setting="theme">${[['coral','Atardecer coral'],['violet','Noche violeta'],['mint','Menta suave']].map(([v,l])=>`<option value="${v}"${s.theme===v?' selected':''}>${l}</option>`).join('')}</select></div><div class="smp-setting"><label for="smp-quality"><strong>Calidad preferida</strong><p>Se aplica al próximo tema. Depende de los archivos disponibles.</p></label><select id="smp-quality" data-setting="quality">${[['balanced','Equilibrada'],['saver','Ahorrar datos'],['best','Máxima disponible']].map(([v,l])=>`<option value="${v}"${s.quality===v?' selected':''}>${l}</option>`).join('')}</select></div>${check('musicOnly','Priorizar música','Oculta podcasts, entrevistas y audiolibros identificados por sus metadatos. Podés desactivarlo para ampliar la búsqueda.')}${check('remember','Recordar dónde quedaste','Guarda canción, cola y posición. La reproducción se retoma al tocar Play.')}${check('skipErrors','Saltar archivos que fallan','Prueba otra versión antes de avanzar. Se detiene después de tres canciones fallidas.')}</section>`+
      `<section class="smp-settings-group"><h2>Discos ocultos</h2><p class="smp-note">${meta.hiddenAlbums.length} discos fuera del inicio y las búsquedas. Se guardan en tus respaldos. Tus playlists y favoritos se conservan.</p>${btn('Administrar discos ocultos','navigate',{view:'hidden'},'smp-button','hide')}</section>`+
      `<section class="smp-settings-group"><h2>Tu biblioteca viaja con vos</h2><p class="smp-note">El respaldo incluye favoritos, playlists, historial, cola y ajustes. No incluye archivos de audio. Guardá una copia antes de cambiar de navegador, borrar sus datos o cambiar el dominio de tu blog.</p><div class="smp-actions">${btn('Exportar respaldo','export',{},'smp-button smp-primary','download')}${btn('Importar respaldo','import',{},'smp-button','upload')}</div><p class="smp-note">Podés combinar el respaldo con tu biblioteca actual o reemplazarla después de revisar su contenido.</p></section>`+
      `<section class="smp-settings-group"><h2>Almacenamiento y privacidad</h2><p class="smp-note">${db.mode==='indexedDB'?'Guardado local activo (IndexedDB).':db.mode==='localStorage'?'Guardado local alternativo activo; el espacio disponible es menor.':'El navegador bloqueó el guardado: exportá tus datos antes de cerrar.'} Tus datos musicales quedan en este navegador y dominio. Las búsquedas, portadas y audios se solicitan a Internet Archive, que recibe esas conexiones. No usamos analítica ni cuentas propias.</p><div class="smp-actions">${btn('Limpiar caché','cache-clear')}${btn('Restaurar ajustes','settings-reset')}${btn('Borrar todos mis datos','data-clear',{},'smp-button smp-danger','trash')}</div></section>`+
      `<section class="smp-settings-group"><h2>Sanavera MP3 ${VERSION}</h2><p class="smp-note">Creado por Sebastián Sanavera. La biblioteca es local; para reproducir necesitás conexión. La disponibilidad, licencias y metadatos de cada publicación dependen de Internet Archive. Consultá la página de origen antes de reutilizar un archivo.</p><p class="smp-note">En computadoras: espacio reproduce/pausa, ← y → retroceden o avanzan 10 segundos, y M silencia. Los controles de pantalla bloqueada dependen del navegador y de Android.</p><p class="smp-note">Para conservar la música en segundo plano, evitá cerrar esta pestaña. El sistema puede suspenderla para ahorrar batería.</p></section>`;
  }
  function updateSidebar(){
    if(!root||!meta)return;
    $('#smp-sidebar-playlists').innerHTML=meta.playlists.length?meta.playlists.slice(0,40).map(p=>btn(p.name,'playlist',{id:p.id},'smp-side-playlist','list')).join(''):'<p class="smp-side-empty">Un nombre, unos temas.<br />Y ya tenés tu lugar.</p>';
  }
  function rerenderKeepingScroll(){const top=main.scrollTop;if(view.name==='album'&&albums.get(view.id)?.loadedAt)paintAlbum(albums.get(view.id));else renderView();main.scrollTop=top;updatePlayerUI();}
  function showDialog(title,html,onSubmit=null){
    if(!dialog.open)returnFocus=document.activeElement;
    $('#smp-dialog-title').textContent=title;$('#smp-dialog-body').innerHTML=html;dialogAction=onSubmit;
    if(!dialog.open)dialog.showModal();
    const field=dialog.querySelector('[autofocus]');if(field){field.focus();field.select?.();}
  }
  function closeDialog(){dialogAction=null;dialog.close();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
  function confirmDialog(title,message,callback,label='Confirmar',danger=false){
    showDialog(title,`<form class="smp-dialog-form" id="smp-confirm-form"><p class="smp-note">${esc(message)}</p><div class="smp-actions">${btn('Cancelar','dialog-close')}<button type="submit" class="smp-button ${danger?'smp-danger':'smp-primary'}">${esc(label)}</button></div></form>`,async()=>{closeDialog();await callback();});
  }

  function pruneHiddenMix(mix){
    if(!mix)return;
    mix.pending=mix.pending.filter(visibleAlbum);mix.retry=mix.retry.filter(visibleAlbum);
    mix.pools=mix.pools.filter(p=>!hiddenAlbums.has(p.albumId));mix.ready=mix.ready.filter(visibleTrack);
  }
  function albumMenu(id){
    const a=albums.get(id);if(!a)return;
    const hidden=hiddenAlbums.has(id);
    showDialog(a.title,`<p class="smp-note">${esc(a.artist)}</p><div class="smp-menu">${btn('Abrir álbum','menu-album',{id},'smp-menu-item','disc')}${btn(hidden?'Volver a mostrar':'No mostrar más',hidden?'album-unhide':'album-hide',{id},'smp-menu-item',hidden?'eye':'hide')}</div><p class="smp-note">Ocultar quita este disco del inicio y las búsquedas, incluidas sus canciones. Se conservan tus favoritos, playlists y la cola actual. Podés recuperarlo desde Ajustes.</p>`);
  }
  function changeAlbumVisibility(id,show){
    if(!validId(id))return;
    if(!show&&!hiddenAlbums.has(id)&&hiddenAlbums.size>=LIMIT.hidden){toast('Llegaste a 5.000 discos ocultos. Revisalos desde Ajustes.');return;}
    if(show){hiddenAlbums.delete(id);meta.hiddenAlbums=meta.hiddenAlbums.filter(x=>x!==id);}
    else{
      hiddenAlbums.add(id);meta.hiddenAlbums=[id,...meta.hiddenAlbums.filter(x=>x!==id)];
      pruneHiddenMix(searchState.mix);
    }
    if(dialog.open)closeDialog();changed();rerenderKeepingScroll();
    toast(show?'Este disco vuelve a aparecer.':'Disco oculto del inicio y las búsquedas.',show?null:id);
    if(!show&&view.name==='home'&&discovery.items.filter(visibleAlbum).length===0&&!discovery.loading&&homeHasMore())discover({more:true});
  }
  function hiddenListHTML(){
    const query=norm(hiddenFilter),list=meta.hiddenAlbums.map(id=>albums.get(id)||cleanAlbum({id,title:id})).filter(a=>!query||norm(a.title+' '+a.artist+' '+a.id).includes(query));
    if(!list.length)return empty(meta.hiddenAlbums.length?'No hay coincidencias':'Tu archivo, a tu gusto',meta.hiddenAlbums.length?'Probá otro nombre.':'Tocá los tres puntos de un disco y elegí «No mostrar más». Podés recuperar los discos desde acá.','','hide');
    return `<p class="smp-note">${list.length} ${list.length===1?'disco oculto':'discos ocultos'}</p><div class="smp-hidden-list">${list.slice(0,hiddenLimit).map(a=>`<div class="smp-hidden-row"><button type="button" class="smp-hidden-info" data-action="album" data-id="${esc(a.id)}" aria-label="Revisar ${esc(a.title)}">${cover(a)}<span><strong>${esc(a.title)}</strong><small>${esc(a.artist)}</small></span></button>${btn('Mostrar','album-unhide',{id:a.id},'smp-button','eye')}</div>`).join('')}</div>${list.length>hiddenLimit?`<div class="smp-load-more">${btn('Ver más ocultos','hidden-more',{},'smp-button','down')}</div>`:''}`;
  }
  function renderHidden(){
    main.innerHTML=btn('Ajustes','navigate',{view:'settings'},'smp-text-button smp-back','back')+pageHead('Discos ocultos','No aparecen en el inicio ni en las búsquedas. Tus favoritos y playlists se conservan.',meta.hiddenAlbums.length?btn('Mostrar todos','hidden-restore-all',{},'smp-button','eye'):'')+
      `<label class="smp-hidden-search" for="smp-hidden-filter"><span>Buscar entre los ocultos</span><input id="smp-hidden-filter" type="search" value="${esc(hiddenFilter)}" placeholder="Título o artista…" maxlength="160" autocomplete="off" /></label><div id="smp-hidden-results">${hiddenListHTML()}</div>`;
  }

  // Audio: un único elemento compartido por todas las pantallas y por Media Session.
  // Ecualizador opcional. No decodifica ni descarga canciones completas en memoria.
  // El elemento se pide con CORS antes de asignar src. Si ese modo falla, se intenta
  // el mismo archivo con reproducción nativa, sin pasar audio opaco a Web Audio.
  const audioContextClass=()=>window.AudioContext||window.webkitAudioContext;
  const dbLabel=value=>`${value>0?'+':''}${Number(value).toLocaleString('es-AR')} dB`;
  function createSoundGraph(ctx){
    const bass=ctx.createBiquadFilter(),mid=ctx.createBiquadFilter(),treble=ctx.createBiquadFilter();
    bass.type='lowshelf';bass.frequency.value=160;
    mid.type='peaking';mid.frequency.value=1000;mid.Q.value=.8;
    treble.type='highshelf';treble.frequency.value=4000;
    const boost=ctx.createGain(),compressor=ctx.createDynamicsCompressor(),ceiling=ctx.createWaveShaper();
    compressor.threshold.value=-3;compressor.knee.value=3;compressor.ratio.value=12;
    compressor.attack.value=.003;compressor.release.value=.18;
    // Techo suave de muestras: lineal hasta 0,85 y redondeado después. El compresor
    // reduce los picos; este último tramo acota los que puedan superar su ataque.
    const curve=new Float32Array(4097);
    for(let i=0;i<curve.length;i++){
      const x=i*2/(curve.length-1)-1,a=Math.abs(x),t=(a-.85)/.15;
      curve[i]=a<=.85?x:Math.sign(x)*(.85+.15*(t-t*t/2));
    }
    ceiling.curve=curve;
    const dry=ctx.createGain(),wet=ctx.createGain(),output=ctx.createGain();
    dry.gain.value=1;wet.gain.value=0;
    bass.connect(mid);mid.connect(treble);treble.connect(boost);boost.connect(compressor);
    compressor.connect(ceiling);ceiling.connect(wet);wet.connect(output);dry.connect(output);output.connect(ctx.destination);
    return {bass,mid,treble,boost,compressor,ceiling,dry,wet,output};
  }
  function smoothParam(param,value,ctx,immediate=false){
    const now=ctx.currentTime;
    if(immediate){param.cancelScheduledValues(now);param.setValueAtTime(value,now);return;}
    if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);
    else{const current=param.value;param.cancelScheduledValues(now);param.setValueAtTime(current,now);}
    param.linearRampToValueAtTime(value,now+.035);
  }
  function applyEqualizer(immediate=false){
    const n=sound.nodes,ctx=sound.context,eq=meta.settings.equalizer;
    if(!n||!ctx||ctx.state==='closed')return;
    ['bass','mid','treble'].forEach(key=>smoothParam(n[key].gain,eq[key],ctx,immediate));
    smoothParam(n.boost.gain,Math.pow(10,eq.boost/20),ctx,immediate);
    // Un ajuste plano o apagado atraviesa una rama limpia, sin compresor ni techo.
    const wet=eq.enabled&&[eq.bass,eq.mid,eq.treble,eq.boost].some(v=>v!==0);
    smoothParam(n.dry.gain,wet?0:1,ctx,immediate);smoothParam(n.wet.gain,wet?1:0,ctx,immediate);
  }
  function disconnectSound(){
    clearTimeout(sound.resumeTimer);sound.resumeTask=null;
    try{sound.source?.disconnect();}catch{}
    sound.source=null;sound.element=null;
  }
  function closeSound(){
    disconnectSound();const ctx=sound.context;sound.context=null;
    if(sound.nodes)Object.values(sound.nodes).forEach(node=>{try{node.disconnect();}catch{}});
    sound.nodes=null;
    if(ctx){ctx.onstatechange=null;try{ctx.close().catch(()=>{});}catch{}}
  }
  function replaceAudioElement(){
    // Desconectar un MediaElementAudioSourceNode no devuelve su elemento a la
    // salida nativa. Se necesita un elemento nuevo, con los mismos controles.
    const old=audio;player.token++;audioListeners?.abort();disconnectSound();
    old.pause();old.removeAttribute('src');old.load();
    const fresh=document.createElement('audio');fresh.id='smp-audio';fresh.preload='metadata';fresh.setAttribute('playsinline','');
    fresh.volume=meta.settings.volume;fresh.muted=meta.settings.muted;
    old.replaceWith(fresh);audio=fresh;bindAudioEvents();
  }
  function rememberNativeFile(url){
    if(!url)return;sound.blocked.add(url);
    if(sound.blocked.size>128)sound.blocked.delete(sound.blocked.values().next().value);
  }
  function fallbackToNative(message,{fileOnly=false}={}){
    const source=player.source,t=currentTrack(),url=audio.getAttribute('src');
    const pos=player.pendingSeek??(audio.readyState?audio.currentTime:player.position),wants=player.wants;
    if(fileOnly)rememberNativeFile(url);else sound.disabled=true;
    sound.notice=message;
    replaceAudioElement();
    if(!fileOnly)closeSound();
    if(source&&t)loadSource(source,pos,wants);else updateEqualizerUI();
    if(meta.settings.equalizer.enabled)toast(message);
  }
  function wakeSound(restart=false){
    const ctx=sound.context;
    if(!ctx||sound.element!==audio||ctx.state==='running'){updateEqualizerUI();return;}
    if(ctx.state==='closed'){fallbackToNative('El ecualizador se detuvo. Seguimos con el audio normal.');return;}
    if(sound.resumeTask&&!restart){
      // Un resume pendiente mientras estaba pausado también necesita un límite
      // cuando se vuelve a tocar Play (la política de autoplay puede dejarlo pendiente).
      if(player.wants){clearTimeout(sound.resumeTimer);sound.resumeTimer=setTimeout(()=>{
        if(sound.context===ctx&&sound.element===audio&&ctx.state!=='running'&&player.wants)
          fallbackToNative('El navegador pausó los efectos. Seguimos con el audio normal.');
      },3500);}
      return;
    }
    // resume() se invoca dentro del gesto del usuario; no se demora detrás de fetch.
    let task;try{task=ctx.resume();}catch{fallbackToNative('No pudimos activar los efectos. Seguimos con el audio normal.');return;}
    sound.resumeTask=task;
    clearTimeout(sound.resumeTimer);
    sound.resumeTimer=setTimeout(()=>{
      if(sound.context===ctx&&sound.element===audio&&ctx.state!=='running'&&player.wants)
        fallbackToNative('El navegador pausó los efectos. Seguimos con el audio normal.');
    },3500);
    Promise.resolve(task).then(()=>{
      if(sound.context!==ctx||sound.resumeTask!==task)return;
      sound.resumeTask=null;clearTimeout(sound.resumeTimer);updateEqualizerUI();
    }).catch(()=>{
      if(sound.context!==ctx||sound.resumeTask!==task)return;
      sound.resumeTask=null;fallbackToNative('No pudimos activar los efectos. Seguimos con el audio normal.');
    });
  }
  function prepareSound(){
    if(sound.element===audio&&sound.source){applyEqualizer();wakeSound(true);return;}
    if(!meta.settings.equalizer.enabled||sound.disabled||!audioContextClass()||audio.crossOrigin!=='anonymous')return;
    try{
      if(!sound.context){
        const Context=audioContextClass();sound.context=new Context({latencyHint:'playback'});
        sound.nodes=createSoundGraph(sound.context);
        const ctx=sound.context;
        ctx.onstatechange=()=>{
          if(sound.context!==ctx)return;
          updateEqualizerUI();
          if(ctx.state==='running'){clearTimeout(sound.resumeTimer);return;}
          if(player.wants&&sound.element===audio)wakeSound();
        };
      }
      sound.source=sound.context.createMediaElementSource(audio);sound.element=audio;
      sound.source.connect(sound.nodes.dry);sound.source.connect(sound.nodes.bass);
      applyEqualizer(true);wakeSound(true);
    }catch{fallbackToNative('Este navegador no pudo iniciar el ecualizador. El audio sigue en modo normal.');}
  }
  function equalizerStatus(){
    const eq=meta.settings.equalizer;
    if(!audioContextClass())return 'Este navegador no admite el ecualizador. Podés escuchar con el audio normal.';
    if(!eq.enabled)return 'Sonido original · tus ajustes quedan guardados.';
    if(sound.disabled)return sound.notice||'Efectos no disponibles en esta sesión. El audio sigue en modo normal.';
    if(sound.blocked.has(audio.getAttribute('src')))return 'Este archivo se reproduce sin efectos. Los ajustes vuelven en el próximo compatible.';
    if(sound.element===audio&&sound.context?.state==='running')return 'Activado · ajustá el sonido mientras escuchás.';
    return currentTrack()?'Ajustes listos · tocá Play para escuchar.':'Ajustes listos · elegí una canción para escuchar.';
  }
  function updateEqualizerUI(){
    if(!root||!meta)return;
    const eq=meta.settings.equalizer,status=equalizerStatus();
    const active=eq.enabled&&!sound.disabled&&!!audioContextClass()&&!sound.blocked.has(audio.getAttribute('src'));
    $$('[data-action="equalizer"]').forEach(b=>{
      b.classList.toggle('is-active',active);b.setAttribute('aria-label',`Abrir ecualizador${active?', activado':''}`);
    });
    const summary=$('#smp-eq-summary');if(summary&&summary.textContent!==status)summary.textContent=status;
    const panel=$('#smp-equalizer');if(!panel)return;
    const toggle=$('#smp-eq-enabled');toggle.checked=eq.enabled;toggle.disabled=!audioContextClass();
    panel.dataset.enabled=String(eq.enabled);const statusNode=$('#smp-eq-status');if(statusNode.textContent!==status)statusNode.textContent=status;
    const preset=EQ_PRESETS.find(p=>['bass','mid','treble'].every(key=>p[key]===eq[key]));
    $('#smp-eq-preset-label').textContent=preset?.name||'Personalizado';
    panel.querySelectorAll('[data-eq]').forEach(el=>{
      const key=el.dataset.eq,value=eq[key];el.value=String(value);
      el.disabled=!audioContextClass();
      el.style.setProperty('--progress',((value-number(el.min))/(number(el.max)-number(el.min))*100)+'%');
      el.setAttribute('aria-valuetext',dbLabel(value));$('#smp-eq-'+key+'-value').textContent=dbLabel(value);
    });
    panel.querySelectorAll('[data-action="eq-preset"]').forEach(b=>{const selected=b.dataset.preset===preset?.id;b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));b.disabled=!audioContextClass();});
    $('#smp-eq-retry').hidden=!(eq.enabled&&(sound.disabled||sound.blocked.has(audio.getAttribute('src'))));
  }
  function setEqualizer(patch,{retry=false}={}){
    meta.settings.equalizer=equalizerFrom({...meta.settings.equalizer,...patch});
    if(retry){
      sound.disabled=false;sound.notice='';sound.blocked.delete(audio.getAttribute('src'));
      if(currentTrack()&&player.source&&audio.crossOrigin!=='anonymous'){
        const pos=player.pendingSeek??(audio.readyState?audio.currentTime:player.position);
        loadSource(player.source,pos,player.wants||!audio.paused);
      }
    }
    if(meta.settings.equalizer.enabled)prepareSound();else applyEqualizer();
    changed();updateEqualizerUI();
  }
  function showEqualizer(){
    const slider=(key,label,sub,min,max)=>`<div class="smp-eq-band"><div class="smp-eq-label"><label for="smp-eq-${key}"><strong>${label}</strong><small>${sub}</small></label><output id="smp-eq-${key}-value" for="smp-eq-${key}">0 dB</output></div><input id="smp-eq-${key}" type="range" data-eq="${key}" min="${min}" max="${max}" step="0.5" value="0" /><div class="smp-eq-scale" aria-hidden="true"><span>${min>0?'+':''}${min} dB</span><span>${min<0?'0 · neutro':'Sin refuerzo'}</span><span>+${max} dB</span></div></div>`;
    showDialog('Tu sonido',`<section id="smp-equalizer" class="smp-equalizer"><div class="smp-eq-power"><span class="smp-eq-symbol">${icon('equalizer')}</span><label for="smp-eq-enabled"><strong>Ecualizador</strong><span id="smp-eq-preset-label">Equilibrado</span></label><input type="checkbox" role="switch" id="smp-eq-enabled" aria-describedby="smp-eq-status" /></div><p id="smp-eq-status" class="smp-eq-status" role="status"></p><div class="smp-eq-presets" aria-label="Ajustes de sonido">${EQ_PRESETS.map(p=>`<button type="button" class="smp-pill" data-action="eq-preset" data-preset="${p.id}" aria-pressed="false">${p.name}</button>`).join('')}</div><div class="smp-eq-bands">${slider('bass','Graves','Cuerpo y bajos',-9,9)}${slider('mid','Medios','Voces e instrumentos',-9,9)}${slider('treble','Agudos','Brillo y detalle',-9,9)}</div><div class="smp-eq-boost">${slider('boost','Refuerzo extra','Para grabaciones que suenan bajito',0,6)}<p>Control de picos incluido. Si suena áspero, bajá el refuerzo.</p></div><div class="smp-eq-actions">${btn('Restablecer','eq-reset',{},'smp-text-button','repeat')}${btn('Listo','dialog-close',{},'smp-button smp-primary','check')}</div><button type="button" id="smp-eq-retry" class="smp-button" data-action="eq-retry" hidden>Reintentar efectos</button><p class="smp-eq-footnote">Se guarda automáticamente. Apagalo para comparar con el sonido original.</p></section>`);
    updateEqualizerUI();
  }
  function mountEqualizer(){
    // Compatible con el HTML 2.0 existente: no hace falta volver a pegar la página.
    const toolbar=$('.smp-player-tools');
    if(toolbar&&!toolbar.querySelector('[data-action="equalizer"]')){
      toolbar.insertAdjacentHTML('afterbegin',`<button type="button" data-action="equalizer" aria-haspopup="dialog">${icon('equalizer')}Ecualizador</button>`);
      toolbar.classList.add('smp-player-tools-with-eq');
    }
    const extras=$('.smp-dock-extras');
    if(extras&&!extras.querySelector('[data-action="equalizer"]'))extras.insertAdjacentHTML('afterbegin',`<button type="button" class="smp-icon-button smp-desktop-only" data-action="equalizer" aria-label="Abrir ecualizador" aria-haspopup="dialog">${icon('equalizer')}</button>`);
  }
  function supported(s){return !!audio.canPlayType(AUDIO[s.ext]||'');}
  function sourceRank(s){
    const quality=meta.settings.quality, lossless=['flac','wav','aiff','aif','alac'].includes(s.ext);
    if(quality==='best')return (lossless?1000000:0)+(s.bitrate||0)+(['flac','alac'].includes(s.ext)?10000:0);
    if(quality==='saver')return -(lossless?1000000:0)-(s.bitrate||(s.size?s.size/100000:160));
    return ({mp3:9000,m4a:8000,ogg:7000,oga:7000,opus:6500,aac:6000,flac:2000,wav:1000}[s.ext]||0)+(s.bitrate||0);
  }
  function availableSources(t){return t.sources.filter(supported).sort((a,b)=>sourceRank(b)-sourceRank(a));}
  function sourceLabel(s){return `${s.ext.toUpperCase()}${s.bitrate?' · '+Math.round(s.bitrate)+' kbps':''}${['flac','wav','alac','aiff','aif'].includes(s.ext)?' · sin pérdida':''}${s.original?' · original':''}`;}
  function setStatus(message){player.error=message;$('#smp-player-status').textContent=message;}
  function resetOrder(){
    const all=player.queue.map((_,i)=>i);
    player.order=meta.settings.shuffle?[player.index,...shuffleArray(all.filter(i=>i!==player.index))]:all;
    player.cursor=Math.max(0,player.order.indexOf(player.index));
  }
  function playQueue(ids,index=0,options={}){
    const selected=ids[index];const queue=ids.filter(id=>tracks.has(id)).slice(0,LIMIT.queue);
    if(!queue.length){toast('Primero agregá una canción.');return;}
    saveResume(true);player.queue=queue;player.index=Math.max(0,queue.indexOf(selected));player.failures=0;resetOrder();
    playAt(player.index,options);
    if(ids.length>LIMIT.queue)toast(`La cola admite hasta ${LIMIT.queue} canciones por vez.`);
  }
  function playAt(index,{autoplay=true,position=0,restored=false}={}){
    if(index<0||index>=player.queue.length)return;
    clearTimeout(player.watchdog);player.token++;audio.pause();player.index=index;
    player.cursor=player.order.indexOf(index);player.wants=autoplay;player.position=Math.max(0,number(position));
    player.pendingSeek=player.position;player.attempted=new Set();player.refreshed=false;player.counted=false;player.heard=0;player.lastTime=0;player.lastWall=0;player.source=null;player.error='';
    const t=currentTrack();if(!t)return;
    const sources=availableSources(t);
    if(!sources.length){audio.removeAttribute('src');audio.load();updatePlayerUI();failTrack('Este navegador no admite los formatos de esta canción. Podés descargarla o abrirla en Archive.');return;}
    loadSource(sources[0],player.position,autoplay);
    updatePlayerUI();updateMediaMetadata();
    if(!restored)saveResume(true);
  }
  function loadSource(source,position=0,autoplay=player.wants){
    const t=currentTrack();if(!t)return;
    const url=mediaURL(t.albumId,source.name),cors=!!audioContextClass()&&!sound.disabled&&!sound.blocked.has(url);
    if(!cors&&sound.element===audio)replaceAudioElement();
    clearTimeout(player.watchdog);player.token++;const token=player.token;
    audio.pause();player.source=source;player.attempted.add(source.name);player.wants=autoplay;player.pendingSeek=position;player.position=position;
    player.lastWall=0;player.lastTime=position;
    if(cors)audio.crossOrigin='anonymous';else audio.removeAttribute('crossorigin');
    audio.src=url;audio.preload='metadata';audio.load();
    setStatus(autoplay?'Conectando con el audio…':'');updatePlayerUI();
    if(autoplay)requestPlay(token);
  }
  async function requestPlay(token=player.token){
    if(!currentTrack())return;
    player.wants=true;setStatus('Cargando audio…');startWatchdog();
    prepareSound();if(token!==player.token)return;
    try{await audio.play();if(token!==player.token)return;setStatus('');}
    catch(e){
      if(token!==player.token||e.name==='AbortError')return;
      if(e.name==='NotAllowedError'){player.wants=false;clearTimeout(player.watchdog);setStatus('Tocá Play para iniciar la reproducción.');toast('Tocá Play para habilitar el audio en este navegador.');}
      else if(e.name==='NotSupportedError'){if(!audio.error)await recoverSource();}
      else {player.wants=false;clearTimeout(player.watchdog);setStatus('No pudimos iniciar el audio. Tocá Play para reintentar.');}
    }
    updatePlayerUI();
  }
  function togglePlay(){
    if(!currentTrack()){if(meta.resume){playQueue(meta.resume.queue,meta.resume.index,{position:meta.resume.position});}else{toast('Elegí una canción para empezar.');navigate('search');}return;}
    if(!audio.paused||player.wants){pausePlayer();return;}
    if(audio.error||!audio.getAttribute('src')){player.failures=0;playAt(player.index,{position:player.position});}
    else {if(audio.ended)seekTo(0);requestPlay();}
  }
  function pausePlayer(){player.wants=false;audio.pause();clearTimeout(player.watchdog);setStatus('');saveResume(true);updatePlayerUI();}
  function startWatchdog(){
    clearTimeout(player.watchdog);const token=player.token;
    player.watchdog=setTimeout(()=>{if(token===player.token&&player.wants&&audio.readyState<3)recoverSource();},25000);
  }
  const recovering=new Set();
  async function recoverSource(){
    const token=player.token,t=currentTrack(),wants=player.wants,pos=player.pendingSeek??(Number.isFinite(audio.currentTime)?audio.currentTime:player.position);
    if(recovering.has(token)||!t)return;recovering.add(token);
    try{
      clearTimeout(player.watchdog);
      if(navigator.onLine===false){player.wants=false;audio.pause();setStatus('Sin conexión. Reconectate y tocá Play.');updatePlayerUI();return;}
      if(audio.crossOrigin==='anonymous'&&audio.error&&audio.error.code!==3){
        fallbackToNative('Este archivo no cargó con efectos. Probamos con el audio normal.',{fileOnly:true});return;
      }
      let next=availableSources(t).find(s=>!player.attempted.has(s.name));
      if(next){loadSource(next,pos,wants);toast('Probando otra versión del audio…');return;}
      if(!player.refreshed){
        player.refreshed=true;setStatus('Comprobando si Archive actualizó el archivo…');
        try{await loadAlbum(t.albumId,null,true);}catch{}
        if(token!==player.token)return;
        next=availableSources(tracks.get(t.id)||t).find(s=>!player.attempted.has(s.name));
        if(next){loadSource(next,pos,wants);return;}
      }
      if(token===player.token)failTrack('El audio no está disponible. Probá otra canción o volvé a intentarlo más tarde.');
    }finally{recovering.delete(token);}
  }
  function failTrack(message){
    clearTimeout(player.watchdog);const wasWanted=player.wants;player.wants=false;audio.pause();setStatus(message);updatePlayerUI();
    if(wasWanted&&meta.settings.skipErrors&&++player.failures<3&&player.cursor+1<player.order.length){toast('Una canción no cargó. Pasamos a la siguiente.');const token=player.token;setTimeout(()=>{if(token===player.token)nextTrack(false,true);},800);}
    else if(wasWanted){toast('La reproducción se detuvo: no pudimos cargar el audio.');}
  }
  function nextTrack(ended=false,fromFailure=false){
    if(!player.queue.length)return;
    if(ended&&player.sleepEnd){player.sleepEnd=false;pausePlayer();seekTo(0);updateSleepLabel();toast('Terminó la canción. Descansá.');return;}
    if(ended&&meta.settings.repeat==='one'){player.counted=false;player.heard=0;seekTo(0);requestPlay();return;}
    let cursor=player.cursor+1;
    if(cursor>=player.order.length){
      if(meta.settings.repeat==='all'){
        if(meta.settings.shuffle){const old=player.index;player.order=shuffleArray(player.queue.map((_,i)=>i));if(player.order.length>1&&player.order[0]===old)[player.order[0],player.order[1]]=[player.order[1],player.order[0]];}
        cursor=0;
      }else{if(ended){pausePlayer();setStatus('Llegaste al final de la cola.');}else toast('Llegaste al final de la cola.');return;}
    }
    const autoplay=ended||fromFailure||!audio.paused||player.wants;
    if(!fromFailure)player.failures=0;
    playAt(player.order[cursor],{autoplay});
  }
  function previousTrack(){
    if(!currentTrack())return;
    if(audio.currentTime>3){seekTo(0);return;}
    const index=player.order[Math.max(0,player.cursor-1)];player.failures=0;
    playAt(index,{autoplay:!audio.paused||player.wants});
  }
  function seekTo(position){
    const duration=audio.duration;
    if(!Number.isFinite(duration)||duration<=0)return;
    try{audio.currentTime=clamp(position,0,Math.max(0,duration-.01));player.position=audio.currentTime;player.lastTime=audio.currentTime;player.lastWall=performance.now();updateProgress();saveResume(true);}catch{toast('Este archivo todavía no permite adelantar.');}
  }
  function recordListen(){
    const t=currentTrack();if(!t||player.counted)return;
    player.counted=true;player.failures=0;
    meta.history.unshift({id:t.id,at:Date.now()});meta.history=meta.history.slice(0,LIMIT.history);meta.plays++;
    meta.recentAlbums=[{id:t.albumId,at:Date.now()},...meta.recentAlbums.filter(a=>a.id!==t.albumId)].slice(0,80);
    if(!albums.has(t.albumId))rememberAlbum(albumSummaryFromTrack(t));changed();
  }
  function onTimeUpdate(){
    const now=performance.now(),time=audio.currentTime, delta=time-player.lastTime,wall=(now-player.lastWall)/1000;
    if(!audio.paused&&!audio.seeking&&player.lastWall&&delta>0&&wall>0&&delta<wall+2){const heard=Math.min(delta,wall,2);meta.seconds+=heard;player.heard+=heard;}
    player.lastWall=now;player.lastTime=time;player.position=time;
    const threshold=Math.min(10,Number.isFinite(audio.duration)&&audio.duration>0?audio.duration*.5:10);
    if(player.heard>=threshold)recordListen();
    updateProgress();saveResume();checkSleep();
  }
  function updateProgress(){
    const duration=Number.isFinite(audio.duration)?audio.duration:0,position=player.pendingSeek??(audio.readyState?audio.currentTime:player.position),percent=duration?clamp(position/duration*100,0,100):0;
    $$('[data-time="current"]').forEach(el=>{el.textContent=fmt(position);});$$('[data-time="duration"]').forEach(el=>{el.textContent=duration?fmt(duration):(currentTrack()?.duration?fmt(currentTrack().duration):'0:00');});
    $$('[data-seek]').forEach(el=>{if(el.dataset.scrubbing)return;el.value=String(percent*10);el.disabled=!duration;el.style.setProperty('--progress',percent+'%');el.setAttribute('aria-valuetext',`${fmt(position)} de ${fmt(duration)}`);});
    $('#smp-mini-progress').style.width=percent+'%';
    if(navigator.mediaSession&&Date.now()-lastPositionUpdate>1000&&duration>0){lastPositionUpdate=Date.now();try{navigator.mediaSession.setPositionState({duration,playbackRate:audio.playbackRate||1,position:clamp(position,0,duration)});}catch{}}
  }
  function updatePlayerUI(){
    const t=currentTrack(), playing=t&&!audio.paused, pending=t&&player.wants&&audio.paused;
    $('#smp-mini-info').disabled=!t;
    if($('#smp-mini-info').dataset.track!==(t?.id||'')){
      $('#smp-mini-info').dataset.track=t?.id||'';
      $('#smp-mini-cover').innerHTML=cover(t);$('#smp-full-cover').innerHTML=cover(t,true);
      $('#smp-mini-title').textContent=t?.title||'El próximo tema lo elegís vos';$('#smp-mini-artist').textContent=t?.artist||'Buscá algo que te mueva.';
      $('#smp-full-title').textContent=t?.title||'Elegí tu próxima canción';$('#smp-full-artist').textContent=t?.artist||'';
    }
    $$('[data-action="toggle-play"]').forEach(el=>{el.innerHTML=icon(playing||pending?'pause':'play');el.setAttribute('aria-label',playing||pending?'Pausar':'Reproducir');});
    $$('[data-action="shuffle"]').forEach(el=>{el.classList.toggle('is-active',meta.settings.shuffle);el.setAttribute('aria-pressed',String(meta.settings.shuffle));el.setAttribute('aria-label',meta.settings.shuffle?'Desactivar aleatorio':'Activar aleatorio');});
    $$('[data-action="repeat"]').forEach(el=>{el.classList.toggle('is-active',meta.settings.repeat!=='off');el.dataset.repeat=meta.settings.repeat;el.setAttribute('aria-label',meta.settings.repeat==='off'?'Repetición desactivada':meta.settings.repeat==='all'?'Repetir cola':'Repetir canción');});
    $$('[data-action="current-like"]').forEach(el=>{const liked=!!t&&meta.likes.includes(t.id);el.classList.toggle('is-active',liked);el.setAttribute('aria-pressed',String(liked));el.setAttribute('aria-label',liked?'Quitar canción de favoritos':'Guardar canción en favoritos');el.disabled=!t;});
    $$('[data-action="mute"]').forEach(el=>{el.innerHTML=icon(audio.muted||audio.volume===0?'muted':'volume');el.setAttribute('aria-label',audio.muted?'Activar sonido':'Silenciar');});
    $$('[data-volume]').forEach(el=>{el.value=String(audio.volume);el.style.setProperty('--progress',(audio.muted?0:audio.volume*100)+'%');});
    $('#smp-quality-tag').textContent=player.source?sourceLabel(player.source):'TU MÚSICA, A TU MANERA';
    $$('.smp-track').forEach(el=>el.classList.toggle('is-current',el.dataset.trackId===t?.id));
    if(navigator.mediaSession){try{navigator.mediaSession.playbackState=t?(playing?'playing':'paused'):'none';}catch{}}
    updateProgress();
    updateEqualizerUI();
  }
  function updateMediaMetadata(){
    const t=currentTrack();if(!t||!('mediaSession'in navigator)||!('MediaMetadata'in window))return;
    try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album,artwork:[{src:thumbURL(t.albumId)}]});}catch{}
  }
  function bindMediaSession(){
    if(!navigator.mediaSession)return;
    const handlers={play:()=>{if(audio.paused)togglePlay();},pause:pausePlayer,previoustrack:previousTrack,nexttrack:()=>nextTrack(),seekbackward:d=>seekTo(audio.currentTime-(d.seekOffset||10)),seekforward:d=>seekTo(audio.currentTime+(d.seekOffset||10)),seekto:d=>seekTo(d.seekTime),stop:()=>{pausePlayer();seekTo(0);}};
    for(const [name,handler]of Object.entries(handlers)){try{navigator.mediaSession.setActionHandler(name,handler);}catch{}}
  }
  function setFullInert(on){
    ['.smp-workspace','.smp-sidebar','#smp-dock','.smp-bottom-nav'].forEach(s=>{$(s).inert=on;});
  }
  function openPlayer(){
    if(!currentTrack()){toast('Elegí una canción primero.');return;}
    fullReturnFocus=document.activeElement;$('#smp-player').hidden=false;setFullInert(true);updatePlayerUI();
    $('[data-action="player-close"]').focus({preventScroll:true});
  }
  function closePlayer(){ $('#smp-player').hidden=true;setFullInert(false);fullReturnFocus?.focus?.({preventScroll:true}); }
  function showQuality(){
    const t=currentTrack();if(!t)return;
    showDialog('Las versiones de este tema',`<p class="smp-note">Son los archivos que publica Archive. Cambiar de versión conserva la posición. Un formato sin pérdida no mejora una grabación que ya era de baja calidad.</p><div class="smp-menu">${t.sources.map((s,i)=>`<div class="smp-queue-row"><button type="button" class="smp-menu-item${player.source?.name===s.name?' is-active':''}" data-action="quality-select" data-index="${i}"${!supported(s)?' disabled':''}>${icon(player.source?.name===s.name?'check':'quality')}<span>${esc(sourceLabel(s))}<small>${s.size?(s.size/1048576).toFixed(1)+' MB · ':''}${supported(s)?'Reproducible en este navegador':'Sólo descarga en este navegador'}</small></span></button><a class="smp-icon-button" href="${esc(mediaURL(t.albumId,s.name))}?download=1" target="_blank" rel="noopener noreferrer" aria-label="Descargar ${esc(s.ext.toUpperCase())}">${icon('download')}</a></div>`).join('')}</div>`);
  }
  function addToQueue(ids,next=false){
    const valid=ids.filter(id=>tracks.has(id)).slice(0,Math.max(0,LIMIT.queue-player.queue.length));
    if(!valid.length){toast('No hay canciones para agregar o la cola está llena.');return;}
    if(!player.queue.length){playQueue(valid,0,{autoplay:false});toast('Agregado a la cola. Tocá Play para escuchar.');return;}
    const start=player.queue.length;player.queue.push(...valid);const indices=valid.map((_,i)=>start+i);
    if(next)player.order.splice(player.cursor+1,0,...indices);else player.order.push(...indices);
    saveResume(true);toast(next?'Va a sonar a continuación.':`${valid.length===1?'Canción agregada':valid.length+' canciones agregadas'} a la cola.`);
  }
  function showQueue(){
    const order=player.order.slice(0,queueDisplayLimit);
    showDialog('A continuación',player.queue.length?`<p class="smp-note">${player.queue.length} canciones · ${meta.settings.shuffle?'Orden aleatorio':'Orden de reproducción'}. Las flechas cambian el orden real de escucha.</p><div class="smp-menu">${order.map((idx,ordinal)=>{
      const t=tracks.get(player.queue[idx]);if(!t)return '';
      return `<div class="smp-queue-row${idx===player.index?' is-current':''}"><button type="button" class="smp-menu-item" data-action="queue-play" data-index="${idx}">${icon(idx===player.index?'music':'play')}<span>${esc(t.title)}<small>${esc(t.artist)}</small></span></button>${ordinal>0?ibtn('Subir en la cola','queue-up',{index:ordinal},'up'):''}${ibtn('Quitar de la cola','queue-remove',{index:idx},'close')}</div>`;
    }).join('')}</div>${player.order.length>queueDisplayLimit?btn('Mostrar más','queue-more'):''}<div class="smp-actions">${btn('Guardar cola como playlist','queue-save',{},'smp-button','plus')}${btn('Vaciar cola','queue-clear',{},'smp-text-button','trash')}</div>`:empty('La cola está esperando','Podés agregar temas desde sus tres puntos o reproducir un álbum.','', 'queue'));
  }
  function removeQueue(index){
    if(index<0||index>=player.queue.length)return;
    const wasPlaying=!audio.paused||player.wants,wasCurrent=player.index===index;
    const nextOld=player.order[player.cursor+1]??player.order[player.cursor-1];
    player.queue.splice(index,1);player.order=player.order.filter(i=>i!==index).map(i=>i>index?i-1:i);
    if(!player.queue.length){stopAndClear();showQueue();return;}
    if(wasCurrent){const next=nextOld==null?0:nextOld>index?nextOld-1:nextOld;playAt(clamp(next,0,player.queue.length-1),{autoplay:wasPlaying});}
    else{if(index<player.index)player.index--;player.cursor=player.order.indexOf(player.index);}
    saveResume(true);showQueue();
  }
  function stopAndClear(){
    clearTimeout(player.watchdog);player.token++;player.wants=false;audio.pause();audio.removeAttribute('src');audio.load();
    Object.assign(player,{queue:[],index:-1,order:[],cursor:0,source:null,position:0,pendingSeek:null,error:''});
    meta.resume=null;try{localStorage.removeItem(RESUME_KEY);}catch{}
    if(navigator.mediaSession)navigator.mediaSession.metadata=null;
    changed();updatePlayerUI();setStatus('');
  }
  function showSleep(){
    showDialog('Una canción más… y a descansar',`<p class="smp-note">El temporizador pausa la música. Si el sistema suspende por completo la pestaña, se aplica al volver a activarla.</p><div class="smp-menu">${[15,30,45,60,90].map(m=>btn(`${m} minutos`,'sleep-set',{minutes:m},'smp-menu-item','moon')).join('')}${btn('Al terminar esta canción','sleep-end',{},'smp-menu-item','music')}${btn('Desactivar temporizador','sleep-cancel',{},'smp-menu-item','close')}</div>`);
  }
  function updateSleepLabel(){ $('#smp-sleep-label').textContent=player.sleepEnd?'Fin del tema':player.sleepAt?Math.max(1,Math.ceil((player.sleepAt-Date.now())/60000))+' min':'Timer'; }
  function checkSleep(){if(player.sleepAt&&Date.now()>=player.sleepAt){player.sleepAt=0;pausePlayer();toast('Terminó el temporizador. Que descanses.');}updateSleepLabel();}

  // Biblioteca: cambios puntuales, confirmaciones para acciones destructivas y respaldo versionado.
  function toggleTrackLike(id){
    if(!tracks.has(id))return;
    const liked=meta.likes.includes(id);meta.likes=liked?meta.likes.filter(x=>x!==id):[id,...meta.likes];changed();
    toast(liked?'Quitada de tus favoritas.':'Esta se queda con vos.');rerenderKeepingScroll();
  }
  function toggleAlbumLike(id){
    if(!albums.has(id))return;
    const liked=meta.albumLikes.includes(id);meta.albumLikes=liked?meta.albumLikes.filter(x=>x!==id):[id,...meta.albumLikes];changed();
    toast(liked?'Álbum quitado de tu biblioteca.':'Álbum guardado en tu biblioteca.');rerenderKeepingScroll();
  }
  function playlistForm(id=null,initialIds=[]){
    const p=meta.playlists.find(p=>p.id===id);
    if(!p&&meta.playlists.length>=LIMIT.playlists){toast('Llegaste al límite de 500 playlists.');return;}
    showDialog(p?'Renombrar playlist':'Dale un nombre a tu playlist',`<form class="smp-dialog-form" id="smp-playlist-form"><label for="smp-playlist-name">Nombre<input id="smp-playlist-name" name="name" type="text" maxlength="90" placeholder="Temas para el camino" value="${esc(p?.name||'')}" required autofocus /></label><div class="smp-actions">${btn('Cancelar','dialog-close')}<button type="submit" class="smp-button smp-primary">${p?'Guardar nombre':'Crear playlist'}</button></div></form>`,()=>{
      const name=text($('#smp-playlist-name').value,'',90);if(!name){$('#smp-playlist-name').focus();return;}
      if(p)p.name=name;else meta.playlists.unshift({id:uuid(),name,trackIds:unique(initialIds.filter(id=>tracks.has(id))).slice(0,LIMIT.playlist),created:Date.now()});
      changed();closeDialog();toast(p?'Nombre actualizado.':'Tu playlist ya está lista.');rerenderKeepingScroll();
    });
  }
  function addToPlaylistDialog(id){
    const t=tracks.get(id);if(!t)return;
    showDialog('Agregar a playlist',`<p class="smp-note">${esc(t.title)} · ${esc(t.artist)}</p><div class="smp-menu">${btn('Crear una nueva playlist','playlist-new-with',{id},'smp-menu-item','plus')}${meta.playlists.map(p=>`<button type="button" class="smp-menu-item" data-action="playlist-add" data-id="${esc(p.id)}" data-track="${esc(id)}"${p.trackIds.includes(id)?' disabled':''}>${icon(p.trackIds.includes(id)?'check':'list')}<span>${esc(p.name)}<small>${p.trackIds.includes(id)?'Ya está en esta playlist':p.trackIds.length+' canciones'}</small></span></button>`).join('')}</div>`);
  }
  function trackMenu(id){
    const t=tracks.get(id);if(!t)return;
    const p=view.name==='playlist'?meta.playlists.find(p=>p.id===view.id):null;
    showDialog(t.title,`<p class="smp-note">${esc(t.artist)} · ${esc(t.album)}</p><div class="smp-menu">${btn(meta.likes.includes(id)?'Quitar de Me gusta':'Agregar a Me gusta','menu-like',{id},'smp-menu-item','heart')}${btn('Agregar a playlist','track-add',{id},'smp-menu-item','plus')}${btn('Reproducir a continuación','queue-add-next',{id},'smp-menu-item','next')}${btn('Agregar al final de la cola','queue-add',{id},'smp-menu-item','queue')}${btn('Ir al álbum','menu-album',{id:t.albumId},'smp-menu-item','disc')}${btn(hiddenAlbums.has(t.albumId)?'Volver a mostrar este álbum':'No mostrar más este álbum',hiddenAlbums.has(t.albumId)?'album-unhide':'album-hide',{id:t.albumId},'smp-menu-item',hiddenAlbums.has(t.albumId)?'eye':'hide')}${btn('Descargar canción','track-download',{id},'smp-menu-item','download')}${p?btn('Quitar de esta playlist','playlist-remove',{id:p.id,track:id},'smp-menu-item','trash')+btn('Mover hacia arriba','playlist-up',{id:p.id,track:id},'smp-menu-item','up'):''}<a class="smp-menu-item" href="${detailsURL(t.albumId)}" target="_blank" rel="noopener noreferrer">${icon('external')}Ver en Internet Archive</a></div>`);
  }
  function downloadTrack(id){
    const t=tracks.get(id);if(!t)return;
    const s=t.id===currentTrack()?.id&&player.source?player.source:availableSources(t)[0]||t.sources[0];
    if(!s){toast('Esta canción no tiene archivos disponibles.');return;}
    // Un enlace normal evita descargar todo el archivo en RAM y no exige CORS al servidor de audio.
    const a=document.createElement('a');a.href=mediaURL(t.albumId,s.name)+'?download=1';a.target='_blank';a.rel='noopener noreferrer';a.download=s.name.split('/').pop();root.append(a);a.click();a.remove();
    toast('Se abrió la descarga en Archive. El navegador puede mostrar primero el audio.');
  }
  function librarySnapshot(){
    saveResume(true);
    const neededTracks=new Set([...meta.likes,...meta.playlists.flatMap(p=>p.trackIds),...meta.history.map(h=>h.id),...(meta.resume?.queue||[])]);
    const neededAlbums=new Set([...meta.albumLikes,...meta.hiddenAlbums,...meta.recentAlbums.map(a=>a.id)]);
    for(const id of meta.albumLikes)(albums.get(id)?.trackIds||[]).forEach(t=>neededTracks.add(t));
    const savedTracks=[...neededTracks].map(id=>tracks.get(id)).filter(Boolean);savedTracks.forEach(t=>neededAlbums.add(t.albumId));
    return {app:'Sanavera MP3',schema:2,appVersion:VERSION,exportedAt:new Date().toISOString(),meta:structuredClone(meta),tracks:savedTracks,albums:[...neededAlbums].map(id=>albums.get(id)).filter(Boolean)};
  }
  function exportLibrary(){
    const data=librarySnapshot(), blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`Sanavera-MP3-respaldo-${new Date().toISOString().slice(0,10)}.json`;root.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Respaldo preparado. Guardalo en un lugar seguro.');
  }
  function validateImport(data){
    if(!data||data.app!=='Sanavera MP3'||data.schema!==2||!data.meta||!Array.isArray(data.tracks)||!Array.isArray(data.albums))throw new Error('Este archivo no es un respaldo compatible de Sanavera MP3 2.0.');
    if(data.tracks.length>LIMIT.tracks||data.albums.length>LIMIT.albums||(data.meta.playlists?.length||0)>LIMIT.playlists)throw new Error('El respaldo supera los límites de esta versión.');
    if((data.meta.hiddenAlbums?.length||0)>LIMIT.hidden)throw new Error('El respaldo supera el límite de 5.000 discos ocultos.');
    const importedTracks=new Map(),importedAlbums=new Map();
    for(const raw of data.tracks){const t=cleanTrack(raw);if(!t)throw new Error('El respaldo contiene canciones con datos inválidos. No se importó nada.');if(importedTracks.has(t.id))throw new Error('El respaldo contiene identificadores duplicados.');importedTracks.set(t.id,t);}
    for(const raw of data.albums){const a=cleanAlbum(raw);if(!a)throw new Error('El respaldo contiene álbumes con datos inválidos.');importedAlbums.set(a.id,a);}
    for(const t of importedTracks.values())if(!importedAlbums.has(t.albumId))importedAlbums.set(t.albumId,albumSummaryFromTrack(t));
    const m=cleanMeta(data.meta,importedTracks,importedAlbums);
    const missing=(Array.isArray(data.meta.likes)?data.meta.likes:[]).some(id=>!importedTracks.has(id))||(Array.isArray(data.meta.playlists)?data.meta.playlists:[]).some(p=>(Array.isArray(p?.trackIds)?p.trackIds:[]).some(id=>!importedTracks.has(id)));
    if(missing)throw new Error('Faltan canciones referenciadas por el respaldo. No se importó nada.');
    return {tracks:importedTracks,albums:importedAlbums,meta:m};
  }
  let pendingImport=null;
  async function importFile(file){
    if(!file)return;
    try{
      if(file.size>LIMIT.importBytes)throw new Error('El respaldo supera los 20 MB permitidos.');
      let data;try{data=JSON.parse(await file.text());}catch{throw new Error('No pudimos leer el JSON. Elegí un respaldo exportado por Sanavera MP3.');}
      pendingImport=validateImport(data);const m=pendingImport.meta;
      showDialog('Tu respaldo está listo',`<p class="smp-note">Encontramos ${m.likes.length} favoritas, ${m.albumLikes.length} álbumes guardados, ${m.playlists.length} playlists, ${m.history.length} entradas del historial y ${m.hiddenAlbums.length} discos ocultos.</p><div class="smp-menu">${btn('Combinar con mi biblioteca','import-merge',{},'smp-menu-item','plus')}${btn('Reemplazar mi biblioteca','import-replace',{},'smp-menu-item','repeat')}${btn('Cancelar','dialog-close',{},'smp-menu-item','close')}</div><p class="smp-note">Combinar conserva tus ajustes y tu reproducción actual. Reemplazar requiere una confirmación adicional.</p>`);
    }catch(e){toast(e.message);}
    finally{$('#smp-import-file').value='';}
  }
  async function applyImport(replace=false){
    const imported=pendingImport;if(!imported)return;
    dataEpoch++;searchController?.abort();albumController?.abort();resetDiscovery();
    const nextTracks=replace?new Map(imported.tracks):new Map([...tracks,...imported.tracks]);
    const nextAlbums=replace?new Map(imported.albums):new Map([...albums,...imported.albums]);
    if(nextTracks.size>LIMIT.tracks||nextAlbums.size>LIMIT.albums){toast('La biblioteca combinada supera el tamaño permitido. No se cambió nada.');return;}
    let nextMeta;
    if(replace)nextMeta=structuredClone(imported.meta);
    else{
      nextMeta=structuredClone(meta);nextMeta.hiddenAlbums=unique([...meta.hiddenAlbums,...imported.meta.hiddenAlbums]);
      if(nextMeta.hiddenAlbums.length>LIMIT.hidden){toast('La combinación supera los 5.000 discos ocultos. No se cambió nada.');return;}
      nextMeta.likes=unique([...meta.likes,...imported.meta.likes]);nextMeta.albumLikes=unique([...meta.albumLikes,...imported.meta.albumLikes]);
      for(const p of imported.meta.playlists){const own=nextMeta.playlists.find(x=>x.id===p.id);if(own)own.trackIds=unique([...own.trackIds,...p.trackIds]).slice(0,LIMIT.playlist);else nextMeta.playlists.push(structuredClone(p));}
      if(nextMeta.playlists.length>LIMIT.playlists){toast('La combinación supera las 500 playlists. No se cambió nada.');return;}
      const historyMap=new Map([...meta.history,...imported.meta.history].map(h=>[h.id+'@'+h.at,h]));nextMeta.history=[...historyMap.values()].sort((a,b)=>b.at-a.at).slice(0,LIMIT.history);
      const recentMap=new Map();for(const a of [...meta.recentAlbums,...imported.meta.recentAlbums].sort((a,b)=>b.at-a.at))if(!recentMap.has(a.id))recentMap.set(a.id,a);
      nextMeta.recentAlbums=[...recentMap.values()].slice(0,80);
      nextMeta.seconds=Math.max(meta.seconds,imported.meta.seconds);nextMeta.plays=Math.max(meta.plays,imported.meta.plays);nextMeta.searches=unique([...meta.searches,...imported.meta.searches]).slice(0,10);
    }
    nextMeta.updated=Date.now();clearTimeout(saveTimer);await saveChain;
    try{
      // Una transacción completa: un fallo de cuota no deja media biblioteca importada.
      await db.save(nextMeta,nextTracks,nextAlbums,[...nextTracks.keys()],[...nextAlbums.keys()],true);
    }catch{toast('No hubo espacio para guardar el respaldo. Tu biblioteca anterior sigue intacta.');return;}
    if(replace){pausePlayer();player.token++;audio.removeAttribute('src');audio.load();player.queue=[];player.index=-1;}
    tracks=nextTracks;albums=nextAlbums;meta=nextMeta;hiddenAlbums=new Set(meta.hiddenAlbums);dirtyTracks.clear();dirtyAlbums.clear();pendingImport=null;
    if(replace){resetDiscovery();searchState=emptySearch();$('#smp-search').value='';}
    applySettings();if(replace){try{localStorage.removeItem(RESUME_KEY);}catch{}restorePlayer();}
    closeDialog();navigate('library');updateSidebar();updatePlayerUI();toast(replace?'Biblioteca restaurada.':'Respaldo combinado con tu biblioteca.');
  }
  async function clearAllData(){
    dataEpoch++;searchController?.abort();albumController?.abort();resetDiscovery();clearTimeout(debounceTimer);
    pausePlayer();clearTimeout(saveTimer);await saveChain;
    const fresh=emptyMeta();
    try{await db.save(fresh,new Map(),new Map(),[],[],true);await db.clearCache();}
    catch{toast('No pudimos borrar los datos del almacenamiento. Volvé a intentarlo.');return;}
    player.token++;audio.removeAttribute('src');audio.load();tracks.clear();albums.clear();dirtyTracks.clear();dirtyAlbums.clear();meta=fresh;hiddenAlbums=new Set();
    player.queue=[];player.order=[];player.index=-1;player.position=0;player.pendingSeek=null;player.source=null;player.sleepAt=0;player.sleepEnd=false;
    // La clave genérica de la versión 1 no se borra: podría pertenecer a otra app del mismo blog.
    try{localStorage.removeItem(RESUME_KEY);localStorage.removeItem(FALLBACK_KEY);localStorage.setItem(LEGACY_DONE,'1');}catch{}
    resetDiscovery();searchState=emptySearch();
    applySettings();updatePlayerUI();updateSidebar();navigate('home');toast('Los datos de Sanavera MP3 2.0 fueron borrados.');
  }
  function applySettings(){
    root.dataset.theme=meta.settings.theme;audio.volume=meta.settings.volume;audio.muted=meta.settings.muted;
    applyEqualizer();updateEqualizerUI();
  }
  async function migrateLegacy(){
    let old;try{if(localStorage.getItem(LEGACY_DONE))return;old=JSON.parse(localStorage.getItem('favorites')||'[]');}catch{return;}
    if(!Array.isArray(old)||!old.length)return;
    let count=0;
    for(const f of old.slice(0,10000)){
      if(!f||!f.urls||typeof f.urls!=='object')continue;
      const list=[];let albumId=null;
      for(const url of Object.values(f.urls)){
        try{const u=new URL(url);if(u.hostname!=='archive.org'||u.protocol!=='https:')continue;const match=u.pathname.match(/^\/download\/([^/]+)\/(.+)$/);if(!match)continue;const id=decodeURIComponent(match[1]),name=decodeURIComponent(match[2]);if(!validId(id)||!validFile(name)||(albumId&&albumId!==id))continue;const s=cleanSource({name});if(s){albumId=id;list.push(s);}}catch{}
      }
      if(!albumId||!list.length)continue;
      const t=cleanTrack({id:albumId+'::'+stem(list[0].name),albumId,title:f.title,artist:f.artist,album:albumId,sources:list});
      if(t){rememberTrack(t);if(!albums.has(albumId))rememberAlbum(albumSummaryFromTrack(t));if(!meta.likes.includes(t.id)){meta.likes.push(t.id);count++;}}
    }
    if(count){changed();await flush();if(!storageFailed){try{localStorage.setItem(LEGACY_DONE,'1');}catch{}}toast(`Recuperamos ${count} favoritas de Sanavera MP3 anterior.`);}
  }

  async function action(button){
    const {action:a,id,index,track}=button.dataset;
    switch(a){
      case 'navigate': navigate(button.dataset.view);break;
      case 'back': navigate(backView.name,backView.id);break;
      case 'focus-search': $('#smp-search').focus();$('#smp-search').select();break;
      case 'quick-search': $('#smp-search').value=button.dataset.query||'';runSearch(button.dataset.query||'',{mode:button.dataset.mode||'all'});break;
      case 'search-mode': if(searchState.page||$('#smp-search').value.trim())runSearch($('#smp-search').value,{mode:button.dataset.mode,keepSpelling:true});else{searchState.mode=button.dataset.mode;renderSearch();}break;
      case 'search-exact':runSearch(searchState.query,{exact:true});break;
      case 'search-spelling-retry':runSearch(searchState.query);break;
      case 'search-suggestion':$('#smp-search').value=button.dataset.query;runSearch(button.dataset.query);break;
      case 'search-more':runSearch(searchState.query,{more:true});break;
      case 'search-retry':runSearch(searchState.query,{more:searchState.page>0,keepSpelling:true});break;
      case 'song-mix-play':playQueue(searchState.trackIds.filter(visibleTrack));break;
      case 'discovery-retry':discover({more:true});break;
      case 'discovery-more':discover({more:true});break;
      case 'discovery-remix':discover({remix:true});main.scrollTop=0;break;
      case 'album-menu':albumMenu(id);break;
      case 'album-hide':changeAlbumVisibility(id,false);break;
      case 'album-unhide':changeAlbumVisibility(id,true);break;
      case 'hidden-more':hiddenLimit+=40;$('#smp-hidden-results').innerHTML=hiddenListHTML();break;
      case 'hidden-restore-all':confirmDialog('¿Volver a mostrar todos?',`Los ${meta.hiddenAlbums.length} discos ocultos podrán aparecer otra vez en el inicio y las búsquedas.`,()=>{meta.hiddenAlbums=[];hiddenAlbums.clear();changed();renderHidden();toast('Todos los discos vuelven a estar visibles.');},'Mostrar todos');break;
      case 'album':navigate('album',id);break;
      case 'album-refresh':if(validId(id))renderAlbum(id,true);break;
      case 'album-like':toggleAlbumLike(id);break;
      case 'album-play':playQueue(albums.get(id)?.trackIds||[]);break;
      case 'album-queue':addToQueue(albums.get(id)?.trackIds||[]);break;
      case 'track-play':playQueue(trackContext,Number(index));break;
      case 'play-single':playQueue([id]);break;
      case 'track-like':toggleTrackLike(id);break;
      case 'menu-like':closeDialog();toggleTrackLike(id);break;
      case 'track-menu':trackMenu(id);break;
      case 'current-menu':if(currentTrack())trackMenu(currentTrack().id);break;
      case 'track-add':addToPlaylistDialog(id);break;
      case 'current-add':if(currentTrack())addToPlaylistDialog(currentTrack().id);break;
      case 'menu-album':closeDialog();navigate('album',id);break;
      case 'current-album':if(currentTrack())navigate('album',currentTrack().albumId);break;
      case 'current-like':if(currentTrack())toggleTrackLike(currentTrack().id);break;
      case 'favorites-play':playQueue(meta.likes);break;
      case 'toggle-play':togglePlay();break;
      case 'next':nextTrack();break;
      case 'previous':previousTrack();break;
      case 'resume':if(currentTrack()){if(audio.paused)requestPlay();openPlayer();}else if(meta.resume){playQueue(meta.resume.queue,meta.resume.index,{position:meta.resume.position});openPlayer();}break;
      case 'shuffle':meta.settings.shuffle=!meta.settings.shuffle;resetOrder();changed();updatePlayerUI();toast(meta.settings.shuffle?'Aleatorio activado.':'Orden original de la cola.');break;
      case 'repeat':meta.settings.repeat={off:'all',all:'one',one:'off'}[meta.settings.repeat];changed();updatePlayerUI();toast({off:'Repetición desactivada.',all:'Repetir toda la cola.',one:'Repetir esta canción.'}[meta.settings.repeat]);break;
      case 'mute':audio.muted=!audio.muted;meta.settings.muted=audio.muted;changed();updatePlayerUI();break;
      case 'player-open':openPlayer();break;
      case 'player-close':closePlayer();break;
      case 'quality':showQuality();break;
      case 'equalizer':showEqualizer();break;
      case 'eq-preset':{
        const preset=EQ_PRESETS.find(p=>p.id===button.dataset.preset);
        if(preset)setEqualizer({enabled:true,bass:preset.bass,mid:preset.mid,treble:preset.treble});break;
      }
      case 'eq-reset':setEqualizer(EQ_DEFAULTS);toast('Sonido original. Ecualizador y refuerzo restablecidos.');break;
      case 'eq-retry':setEqualizer({enabled:true},{retry:true});break;
      case 'quality-select':{
        const source=currentTrack()?.sources[Number(index)];if(source&&supported(source)){const pos=player.pendingSeek??(audio.readyState?audio.currentTime:player.position);loadSource(source,pos,!audio.paused||player.wants);saveResume(true);closeDialog();}break;
      }
      case 'download':if(currentTrack())downloadTrack(currentTrack().id);break;
      case 'track-download':downloadTrack(id);break;
      case 'queue':queueDisplayLimit=80;showQueue();break;
      case 'queue-more':queueDisplayLimit+=80;showQueue();break;
      case 'queue-play':player.failures=0;playAt(Number(index));showQueue();break;
      case 'queue-add':addToQueue([id]);closeDialog();break;
      case 'queue-add-next':addToQueue([id],true);closeDialog();break;
      case 'queue-remove':removeQueue(Number(index));break;
      case 'queue-up':{const i=Number(index);if(i>0&&i<player.order.length){[player.order[i-1],player.order[i]]=[player.order[i],player.order[i-1]];player.cursor=player.order.indexOf(player.index);saveResume(true);showQueue();}break;}
      case 'queue-clear':confirmDialog('¿Vaciar la cola?','La música se va a detener. Tus favoritos y playlists quedan guardados.',()=>{stopAndClear();closePlayer();},'Vaciar',true);break;
      case 'queue-save':playlistForm(null,player.order.map(i=>player.queue[i]));break;
      case 'playlist':navigate('playlist',id);break;
      case 'playlist-new':playlistForm();break;
      case 'playlist-new-with':playlistForm(null,[id]);break;
      case 'playlist-rename':playlistForm(id);break;
      case 'playlist-play':playQueue(meta.playlists.find(p=>p.id===id)?.trackIds||[]);break;
      case 'playlist-add':{
        const p=meta.playlists.find(p=>p.id===id);if(!p||!tracks.has(track))break;
        if(p.trackIds.length>=LIMIT.playlist){toast('La playlist llegó a su límite de canciones.');break;}
        if(!p.trackIds.includes(track)){p.trackIds.push(track);changed();}closeDialog();toast('Canción agregada a '+p.name);rerenderKeepingScroll();break;
      }
      case 'playlist-remove':{const p=meta.playlists.find(p=>p.id===id);if(p){p.trackIds=p.trackIds.filter(t=>t!==track);changed();closeDialog();rerenderKeepingScroll();toast('Canción quitada de la playlist.');}break;}
      case 'playlist-up':{const p=meta.playlists.find(p=>p.id===id),i=p?.trackIds.indexOf(track);if(p&&i>0){[p.trackIds[i-1],p.trackIds[i]]=[p.trackIds[i],p.trackIds[i-1]];changed();closeDialog();rerenderKeepingScroll();}else toast('Ya está al principio.');break;}
      case 'playlist-delete':{const p=meta.playlists.find(p=>p.id===id);if(p)confirmDialog('¿Eliminar esta playlist?',`Se eliminará «${p.name}». Las canciones de tus favoritos quedan guardadas.`,()=>{meta.playlists=meta.playlists.filter(p=>p.id!==id);changed();navigate('library');toast('Playlist eliminada.');},'Eliminar',true);break;}
      case 'tracks-more':trackDisplayLimit+=80;rerenderKeepingScroll();break;
      case 'library-albums-more':libraryAlbumLimit+=36;rerenderKeepingScroll();break;
      case 'library-playlists-more':libraryPlaylistLimit+=40;rerenderKeepingScroll();break;
      case 'sleep':showSleep();break;
      case 'sleep-set':player.sleepAt=Date.now()+Number(button.dataset.minutes)*60000;player.sleepEnd=false;updateSleepLabel();closeDialog();toast('Temporizador activado.');break;
      case 'sleep-end':if(!currentTrack()){toast('Primero elegí una canción.');break;}player.sleepEnd=true;player.sleepAt=0;updateSleepLabel();closeDialog();toast('La música se pausa al terminar este tema.');break;
      case 'sleep-cancel':player.sleepAt=0;player.sleepEnd=false;updateSleepLabel();closeDialog();toast('Temporizador desactivado.');break;
      case 'dialog-close':closeDialog();pendingImport=null;break;
      case 'export':exportLibrary();break;
      case 'import':$('#smp-import-file').click();break;
      case 'import-merge':await applyImport(false);break;
      case 'import-replace':confirmDialog('¿Reemplazar tu biblioteca?','Se reemplazarán los datos de esta app por los del respaldo y se detendrá la música. Exportá primero si querés conservar lo actual.',()=>applyImport(true),'Reemplazar',true);break;
      case 'cache-clear':await db.clearCache();toast('Caché limpio. Tu biblioteca sigue intacta.');break;
      case 'history-clear':confirmDialog('¿Borrar tu historial?','Se borrarán el historial, los álbumes recientes y las estadísticas. Tus playlists y favoritos se conservan.',()=>{meta.history=[];meta.recentAlbums=[];meta.seconds=0;meta.plays=0;changed();renderHistory();},'Borrar historial',true);break;
      case 'settings-reset':confirmDialog('¿Restaurar ajustes?','Volvemos al color, volumen y preferencias originales. Tu biblioteca queda guardada.',()=>{const musicChanged=meta.settings.musicOnly!==DEFAULTS.musicOnly;meta.settings={...DEFAULTS};if(musicChanged){searchController?.abort();clearTimeout(debounceTimer);searchState={...emptySearch(),query:searchState.query,mode:searchState.mode,sort:searchState.sort};resetDiscovery();}applySettings();resetOrder();changed();renderSettings();updatePlayerUI();},'Restaurar');break;
      case 'data-clear':confirmDialog('¿Borrar todos tus datos?','Se eliminarán favoritos, álbumes, playlists, historial, cola y ajustes de Sanavera MP3 2.0 en este navegador. Esta acción no se puede deshacer. Exportá un respaldo antes si querés conservarlos.',clearAllData,'Borrar todo',true);break;
    }
  }
  function updateConnectivity(){
    if(storageFailed||db.mode==='memory'){persistentWarning('El guardado local no está disponible. Exportá un respaldo antes de cerrar.');return;}
    if(navigator.onLine===false)persistentWarning('Estás sin conexión. Podés consultar tu biblioteca guardada; el audio necesita Internet.');
    else $('#smp-banner').hidden=true;
  }
  function bindAudioEvents(){
    audioListeners?.abort();audioListeners=new AbortController();
    const element=audio,signal=audioListeners.signal;
    const on=(event,handler)=>element.addEventListener(event,e=>{if(audio===element)handler(e);},{signal});
    on('loadedmetadata',()=>{
      if(player.pendingSeek!=null&&Number.isFinite(audio.duration)&&audio.duration>0){try{audio.currentTime=clamp(player.pendingSeek,0,Math.max(0,audio.duration-.05));player.position=audio.currentTime;player.lastTime=audio.currentTime;}catch{}player.pendingSeek=null;}
      updateProgress();
    });
    on('durationchange',updateProgress);
    on('timeupdate',onTimeUpdate);
    on('playing',()=>{wakeSound();clearTimeout(player.watchdog);player.wants=true;player.lastWall=performance.now();player.lastTime=audio.currentTime;setStatus('');updatePlayerUI();});
    on('pause',()=>{updatePlayerUI();saveResume(true);});
    on('play',updatePlayerUI);
    on('ended',()=>{if(player.heard>0)recordListen();nextTrack(true);});
    on('waiting',()=>{if(player.wants){setStatus('Cargando un poco más de audio…');startWatchdog();}});
    on('stalled',()=>{if(player.wants)startWatchdog();});
    on('seeking',()=>{player.lastWall=0;});
    on('seeked',()=>{player.lastTime=audio.currentTime;player.lastWall=performance.now();});
    on('error',()=>{if(audio.getAttribute('src')&&audio.error?.code!==1)recoverSource();});
    on('volumechange',updatePlayerUI);
  }
  function bindEvents(){
    root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&root.contains(b)&&!b.disabled){Promise.resolve(action(b)).catch(err=>{console.warn('Sanavera MP3:',err);toast('No pudimos completar esa acción. Podés volver a intentar.');});}});
    root.addEventListener('submit',e=>{
      e.preventDefault();
      if(e.target.id==='smp-search-form'){runSearch($('#smp-search').value);$('#smp-search').blur();}
      else if(e.target.id==='smp-open-archive'){
        const value=text(new FormData(e.target).get('archive'),' ',500);let id=value;
        if(/^https?:/i.test(value)){try{const url=new URL(value);if(!['archive.org','www.archive.org'].includes(url.hostname))throw new Error();id=decodeURIComponent(url.pathname.match(/^\/(?:details|download)\/([^/]+)/)?.[1]||'');}catch{id='';}}
        if(validId(id))navigate('album',id);else toast('Pegá un enlace público de archive.org/details/ o un identificador válido.');
      }else if(dialog.contains(e.target)&&dialogAction)Promise.resolve(dialogAction(e)).catch(()=>toast('No se pudo completar la acción.'));
    });
    $('#smp-search').addEventListener('input',()=>{
      clearTimeout(debounceTimer);searchController?.abort();
      const q=$('#smp-search').value.trim();
      if(q.length>=2)debounceTimer=setTimeout(()=>runSearch(q),550);
      else if(!q){searchState={...emptySearch(),mode:searchState.mode,sort:searchState.sort};if(view.name==='search')renderSearch();}
    });
    root.addEventListener('input',e=>{
      const el=e.target;
      if(el.id==='smp-hidden-filter'){hiddenFilter=text(el.value,'',160);hiddenLimit=40;$('#smp-hidden-results').innerHTML=hiddenListHTML();}
      if(['bass','mid','treble','boost'].includes(el.dataset.eq))setEqualizer({[el.dataset.eq]:el.value});
      if(el.matches('[data-volume]')){audio.volume=clamp(el.value,0,1);audio.muted=false;meta.settings.volume=audio.volume;meta.settings.muted=false;changed();updatePlayerUI();}
      if(el.matches('[data-seek]')){el.dataset.scrubbing='1';el.style.setProperty('--progress',number(el.value)/10+'%');const duration=audio.duration;if(Number.isFinite(duration))$$('[data-time="current"]').forEach(t=>t.textContent=fmt(duration*number(el.value)/1000));}
    });
    root.addEventListener('change',e=>{
      const el=e.target;
      if(el.id==='smp-eq-enabled')setEqualizer({enabled:el.checked},{retry:el.checked&&sound.disabled});
      if(el.matches('[data-seek]')){delete el.dataset.scrubbing;seekTo(audio.duration*number(el.value)/1000);}
      if(el.id==='smp-search-sort'){runSearch($('#smp-search').value,{sort:el.value,keepSpelling:true});}
      if(el.dataset.setting){
        const key=el.dataset.setting;meta.settings=settingsFrom({...meta.settings,[key]:el.type==='checkbox'?el.checked:el.value});applySettings();
        if(key==='remember'&&!meta.settings.remember){meta.resume=null;try{localStorage.removeItem(RESUME_KEY);}catch{}}
        if(key==='musicOnly'){searchController?.abort();clearTimeout(debounceTimer);searchState={...emptySearch(),query:searchState.query,mode:searchState.mode,sort:searchState.sort};resetDiscovery();}
        changed();updatePlayerUI();
      }
      if(el.id==='smp-import-file')importFile(el.files[0]);
    });
    root.addEventListener('error',e=>{
      const img=e.target;if(img.tagName!=='IMG')return;
      if(!img.dataset.triedFallback&&img.dataset.fallback&&img.src!==img.dataset.fallback){img.dataset.triedFallback='1';img.src=img.dataset.fallback;}
      else{img.hidden=true;img.removeAttribute('src');}
    },true);
    dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeDialog();}});
    dialog.addEventListener('cancel',()=>{dialogAction=null;pendingImport=null;});
    bindAudioEvents();
    window.addEventListener('online',()=>{updateConnectivity();toast('Volvió la conexión. Tocá Play para continuar.');});
    window.addEventListener('offline',updateConnectivity);
    window.addEventListener('pagehide',()=>{saveResume(true);flush();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){saveResume(true);flush();}else{checkSleep();if(player.wants)wakeSound();}});
    document.addEventListener('keydown',e=>{
      if(!root.isConnected||(!root.contains(e.target)&&root.dataset.fullscreen!=='true'))return;
      if(dialog.open)return;
      if(e.key==='Escape'&&!$('#smp-player').hidden){closePlayer();return;}
      if(e.target.closest('input,select,textarea,button,a,[contenteditable="true"]')||e.ctrlKey||e.metaKey||e.altKey)return;
      if(e.code==='Space'){e.preventDefault();togglePlay();}
      else if(e.key==='ArrowRight'){e.preventDefault();seekTo(audio.currentTime+10);}
      else if(e.key==='ArrowLeft'){e.preventDefault();seekTo(audio.currentTime-10);}
      else if(e.key.toLowerCase()==='m'){audio.muted=!audio.muted;meta.settings.muted=audio.muted;changed();updatePlayerUI();}
    });
    // Mantener el foco dentro del reproductor expandido; el dialog nativo hace su propia gestión.
    root.addEventListener('keydown',e=>{
      if(e.key!=='Tab'||$('#smp-player').hidden||dialog.open)return;
      // El layout por altura puede retirar acciones secundarias de esta vista.
      const focusable=[...$('#smp-player').querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(el=>el.getClientRects().length);
      if(!focusable.length)return;
      if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}
      else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}
    });
    setInterval(checkSleep,1000);bindMediaSession();
  }
  function restorePlayer(){
    if(!meta.settings.remember){player.queue=[];player.index=-1;updatePlayerUI();return;}
    const r=meta.resume;if(!r){player.queue=[];player.index=-1;player.order=[];player.source=null;player.position=0;player.pendingSeek=null;updatePlayerUI();return;}
    player.queue=r.queue.slice();player.index=r.index;resetOrder();
    const t=tracks.get(r.trackId);const position=t?.duration&&r.position>t.duration-5?0:r.position;
    playAt(r.index,{autoplay:false,position,restored:true});
  }
  async function boot(){
    root=document.getElementById('smp-app');if(!root||root.dataset.ready)return;root.dataset.ready='true';
    if(root.dataset.fullscreen==='true'){document.body.append(root);document.documentElement.classList.add('smp-lock');}
    if(!document.querySelector('meta[name="viewport"]')){const viewport=document.createElement('meta');viewport.name='viewport';viewport.content='width=device-width, initial-scale=1';document.head.append(viewport);}
    main=$('#smp-main');audio=$('#smp-audio');dialog=$('#smp-dialog');
    if(audioContextClass())audio.crossOrigin='anonymous';
    mountEqualizer();
    $$('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
    try{
      db=new Database();const data=await db.open();
      tracks=new Map((Array.isArray(data.tracks)?data.tracks:[]).map(cleanTrack).filter(Boolean).map(t=>[t.id,t]));
      albums=new Map((Array.isArray(data.albums)?data.albums:[]).map(cleanAlbum).filter(Boolean).map(a=>[a.id,a]));
      for(const t of tracks.values())if(!albums.has(t.albumId))rememberAlbum(albumSummaryFromTrack(t));
      meta=cleanMeta(data.meta,tracks,albums);hiddenAlbums=new Set(meta.hiddenAlbums);
      if(data.recoveredFallback){tracks.forEach(t=>dirtyTracks.add(t.id));albums.forEach(a=>dirtyAlbums.add(a.id));changed();}
      // localStorage recibe sólo un pequeño punto de reanudación en pagehide.
      try{const r=cleanResume(JSON.parse(localStorage.getItem(RESUME_KEY)||'null'),tracks);if(r&&r.updated>number(meta.resume?.updated))meta.resume=r;}catch{}
      applySettings();bindEvents();await migrateLegacy();restorePlayer();updateSidebar();navigate('home');updatePlayerUI();updateConnectivity();
    }catch(e){console.error('Sanavera MP3 no pudo iniciar',e);main.innerHTML=empty('No pudimos iniciar tu biblioteca','Recargá la página. Si el problema continúa, probá un navegador actualizado. Tus datos guardados no se borraron.','','info');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
