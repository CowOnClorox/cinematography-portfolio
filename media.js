(function(root){
  'use strict';
  function webUrl(value){
    try{const url=new URL(String(value));return /^https?:$/.test(url.protocol)?url.href:null;}catch{return null;}
  }
  function imageUrl(value){
    if(typeof value!=='string'||!value.trim()) return '';
    const clean=value.trim();
    if(webUrl(clean)) return clean;
    if(/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(clean)||clean.startsWith('//')||clean.startsWith('/')||clean.includes('\\')||clean.split('/').includes('..')) return '';
    return clean;
  }
  function videoSource(value){
    if(!value||!String(value).trim()) return {type:'placeholder'};
    const safe=webUrl(String(value).trim());
    if(!safe){
      const local=String(value).trim();
      if(!local.startsWith('/')&&!local.includes('..')&&!local.includes('\\')&&!local.includes(':')&&/\.(mp4|webm)(\?.*)?$/i.test(local))return {type:'video',url:local};
      return {type:'invalid'};
    }
    const url=new URL(safe);const host=url.hostname.toLowerCase().replace(/^www\./,'');
    let id='';
    if(host==='youtu.be')id=url.pathname.split('/')[1];
    if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com') id=url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1]||'';
    if(/^[\w-]{11}$/.test(id))return {type:'iframe',url:'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0'};
    if(host==='vimeo.com'||host==='player.vimeo.com'){
      const parts=url.pathname.split('/').filter(Boolean);const vimeo=parts.find(part=>/^\d+$/.test(part));
      if(vimeo){const hash=url.searchParams.get('h')||parts[parts.indexOf(vimeo)+1];const embed=new URL('https://player.vimeo.com/video/'+vimeo);embed.searchParams.set('autoplay','1');if(hash&&/^[a-zA-Z\d]+$/.test(hash))embed.searchParams.set('h',hash);return {type:'iframe',url:embed.href};}
    }
    if(/\.(mp4|webm)$/i.test(url.pathname))return {type:'video',url:safe};
    return {type:'external',url:safe};
  }
  root.PortfolioMedia={webUrl,imageUrl,videoSource};
})(typeof window!=='undefined'?window:globalThis);
