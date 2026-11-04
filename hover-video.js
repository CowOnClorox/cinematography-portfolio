(function(){
  'use strict';
  const P=window.Portfolio;
  const scripts=new Map();
  const hover=window.matchMedia('(hover: hover) and (pointer: fine)');
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let activePreview=null;
  let youtubeReady=null;

  function eligible(){return hover.matches&&!motion.matches;}
  function script(src){
    if(scripts.has(src))return scripts.get(src);
    const pending=new Promise((resolve,reject)=>{
      const tag=document.createElement('script');
      tag.src=src;tag.async=true;
      tag.addEventListener('load',resolve,{once:true});
      tag.addEventListener('error',()=>reject(Error('Player unavailable')),{once:true});
      document.head.append(tag);
    });
    scripts.set(src,pending);return pending;
  }
  function youtube(){
    if(window.YT?.Player)return Promise.resolve(window.YT);
    if(youtubeReady)return youtubeReady;
    youtubeReady=new Promise((resolve,reject)=>{
      const previous=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=()=>{
        try{if(typeof previous==='function')previous();}finally{resolve(window.YT);}
      };
      script('https://www.youtube.com/iframe_api').catch(reject);
    });
    return youtubeReady;
  }
  function preconnect(origin){
    if(document.querySelector('link[rel="preconnect"][href="'+origin+'"]'))return;
    const link=document.createElement('link');link.rel='preconnect';link.href=origin;document.head.append(link);
  }
  function sources(film){
    const seen=new Set();const list=[];
    for(const value of [film.previewVideoUrl,film.trailerUrl,film.videoUrl]){
      const source=P.mediaVideo(value);
      if(!['video','iframe'].includes(source.type)||seen.has(source.url))continue;
      seen.add(source.url);list.push(source);
    }
    return list;
  }
  function attach(link,frame,film){
    if(!eligible())return {ready:Promise.resolve(false),destroy(){}};
    const candidates=sources(film);
    if(!candidates.length)return {ready:Promise.resolve(false),destroy(){}};
    const layer=P.node('div','hover-preview');layer.setAttribute('aria-hidden','true');frame.append(layer);
    let destroyed=false;let ticket=0;let index=0;let backend=null;let prepared=false;
    let pointer=false;let focused=false;let active=false;let starting=false;let playingNow=false;let bufferingNow=false;let attempt=0;
    let inView=true;let observer=null;let timer=0;let playTimer=0;let revealTimer=0;
    let settle;const ready=new Promise(resolve=>{settle=resolve;});
    const enabled=()=>eligible()&&!document.hidden&&inView;
    const hide=()=>{clearTimeout(revealTimer);frame.classList.remove('preview-playing');};
    function finish(value){if(settle){settle(value);settle=null;}}
    function pause(){
      active=false;starting=false;playingNow=false;bufferingNow=false;++attempt;clearTimeout(playTimer);hide();
      try{backend?.pause();}catch{}
      if(activePreview===controller)activePreview=null;
    }
    function refresh(){
      if(destroyed)return;
      if(!(pointer||focused)||!enabled()){pause();return;}
      if(activePreview&&activePreview!==controller)activePreview.stop();
      activePreview=controller;active=true;
      if(prepared)play();
    }
    function play(){
      if(!active||!backend||!prepared||starting||playingNow)return;
      const current=ticket;
      const run=++attempt;
      starting=true;
      clearTimeout(playTimer);
      playTimer=setTimeout(()=>{if(current===ticket&&run===attempt&&active)advance();},12000);
      try{
        const result=backend.play();
        if(result?.catch)result.catch(()=>{if(current===ticket&&run===attempt&&active)advance();});
      }catch{if(current===ticket&&run===attempt)advance();}
    }
    function advance(){
      if(destroyed)return;
      const current=++ticket;
      clearTimeout(timer);clearTimeout(playTimer);hide();prepared=false;starting=false;playingNow=false;bufferingNow=false;
      try{backend?.destroy();}catch{}
      backend=null;layer.replaceChildren();
      const source=candidates[index++];
      if(!source){finish(false);return;}
      const valid=()=>!destroyed&&ticket===current;
      const failed=()=>{if(valid())advance();};
      const loaded=()=>{
        if(!valid())return;
        clearTimeout(timer);prepared=true;finish(true);if(active)play();
      };
      const playing=()=>{
        if(!valid())return;
        clearTimeout(playTimer);clearTimeout(revealTimer);starting=false;playingNow=true;bufferingNow=false;
        if(active&&enabled()){
          revealTimer=setTimeout(()=>{
            if(valid()&&active&&enabled()&&playingNow)frame.classList.add('preview-playing');
          },160);
        }else pause();
      };
      const buffering=()=>{
        if(!valid()||!active)return;
        starting=true;playingNow=false;bufferingNow=true;hide();
        const run=attempt;clearTimeout(playTimer);
        playTimer=setTimeout(()=>{if(valid()&&run===attempt&&active)advance();},12000);
      };
      timer=setTimeout(failed,20000);
      if(source.type==='video'){
        const video=P.node('video');
        video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
        video.preload='auto';video.controls=false;video.tabIndex=-1;
        video.setAttribute('muted','');video.setAttribute('playsinline','');
        video.setAttribute('disablepictureinpicture','');
        video.addEventListener('loadeddata',loaded,{once:true});
        video.addEventListener('playing',playing);
        video.addEventListener('waiting',buffering);
        video.addEventListener('error',failed,{once:true});
        backend={play:()=>video.play(),pause:()=>video.pause(),destroy(){video.pause();video.removeAttribute('src');video.load();video.remove();}};
        layer.append(video);video.src=P.url(source.url);video.load();return;
      }
      const url=new URL(source.url);
      preconnect(url.origin);
      const iframe=P.node('iframe');iframe.tabIndex=-1;iframe.title=film.title+' — silent preview';
      iframe.allow='autoplay; encrypted-media';iframe.referrerPolicy='strict-origin-when-cross-origin';
      iframe.setAttribute('aria-hidden','true');
      if(url.hostname.includes('youtube')){
        const size=frame.getBoundingClientRect();
        if(size.width<200||size.height<200){failed();return;}
        const id=url.pathname.split('/').pop();
        for(const [key,value] of Object.entries({autoplay:0,enablejsapi:1,origin:location.origin,controls:0,disablekb:1,playsinline:1,mute:1,loop:1,playlist:id,rel:0}))url.searchParams.set(key,String(value));
        iframe.src=url.href;layer.append(iframe);
        youtube().then(YT=>{
          if(!valid())return;
          let player;
          player=new YT.Player(iframe,{events:{
            onReady:event=>{if(valid()){event.target.mute();loaded();}},
            onStateChange:event=>{
              if(!valid())return;
              if(event.data===1)playing();
              if(event.data===3)buffering();
              if(event.data===0&&active){event.target.seekTo(0,true);event.target.playVideo();}
            },
            onError:failed,
            onAutoplayBlocked:failed
          }});
          backend={play(){player.mute();player.playVideo();},pause:()=>player.pauseVideo(),destroy:()=>player.destroy()};
        }).catch(failed);
      }else{
        for(const [key,value] of Object.entries({autoplay:0,muted:1,loop:1,controls:0,title:0,byline:0,portrait:0,playsinline:1,dnt:1}))url.searchParams.set(key,String(value));
        iframe.src=url.href;layer.append(iframe);
        script('https://player.vimeo.com/api/player.js').then(()=>{
          if(!valid())return;
          const player=new window.Vimeo.Player(iframe);
          backend={play:()=>player.play(),pause:()=>{player.pause().catch(()=>{});},destroy:()=>{player.destroy().catch(()=>{});}};
          player.on('playing',playing);player.on('error',failed);
          player.on('bufferstart',buffering);player.on('bufferend',()=>{if(bufferingNow)playing();});
          player.ready().then(()=>player.setMuted(true)).then(loaded).catch(failed);
        }).catch(failed);
      }
    }
    function enter(){pointer=true;refresh();}
    function leave(){pointer=false;refresh();}
    function focus(){focused=true;refresh();}
    function blur(){focused=false;refresh();}
    function visibility(){if(document.hidden)pause();else refresh();}
    const controller={ready,stop:pause,destroy(){
      if(destroyed)return;
      destroyed=true;++ticket;pause();finish(false);clearTimeout(timer);
      link.removeEventListener('pointerenter',enter);link.removeEventListener('pointerleave',leave);
      link.removeEventListener('focus',focus);link.removeEventListener('blur',blur);
      document.removeEventListener('visibilitychange',visibility);
      hover.removeEventListener('change',refresh);motion.removeEventListener('change',refresh);
      observer?.disconnect();
      try{backend?.destroy();}catch{}layer.remove();
    }};
    link.addEventListener('pointerenter',enter);link.addEventListener('pointerleave',leave);
    link.addEventListener('focus',focus);link.addEventListener('blur',blur);
    document.addEventListener('visibilitychange',visibility);
    hover.addEventListener('change',refresh);motion.addEventListener('change',refresh);
    if(typeof IntersectionObserver==='function'){
      observer=new IntersectionObserver(entries=>{
        const entry=entries.find(item=>item.target===frame);if(!entry)return;
        inView=entry.isIntersecting;refresh();
      },{threshold:0});
      observer.observe(frame);
    }
    advance();return controller;
  }
  window.PortfolioHover={attach};
})();
