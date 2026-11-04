(function(){
  'use strict';
  const base=new URL(document.body.dataset.root||'./',document.baseURI);const media=window.PortfolioMedia;
  function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=String(text);return el;}
  function url(path){return new URL(path,base).href;}
  function asset(path){const safe=media.imageUrl(path);return safe?new URL(safe,base).href:'';}
  function slug(project){return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug||'')?project.slug:project.id;}
  function projectUrl(project){return url('work/'+encodeURIComponent(slug(project))+'/');}
  function image(parent,path,alt='',lazy=true){const src=asset(path);if(!src)return null;const img=node('img');img.src=src;img.alt=alt;img.loading=lazy?'lazy':'eager';img.decoding='async';img.addEventListener('error',()=>{img.hidden=true;},{once:true});parent.append(img);return img;}
  async function load(){const embedded=document.getElementById('portfolio-content');if(embedded){try{const data=JSON.parse(embedded.textContent);if(data.profile&&Array.isArray(data.projects))return data;}catch{}}const response=await fetch(url('content/site.json'),{cache:'no-store'});if(!response.ok)throw Error('Content unavailable');const data=await response.json();if(!data.profile||!Array.isArray(data.projects))throw Error('Invalid content');return data;}
  function chrome(data,page){
    const p=data.profile;document.querySelectorAll('[data-profile]').forEach(el=>el.textContent=p[el.dataset.profile]||'');document.querySelectorAll('[data-year],#copyright-year').forEach(el=>el.textContent=new Date().getFullYear());
    const links={home:url('./'),work:url('work/'),information:url('./#information'),contact:url('./#information')};document.querySelectorAll('[data-link]').forEach(el=>{el.href=links[el.dataset.link]||links.home;});
    if(page!=='film')document.title=page==='work'?'All work — '+(p.name||'Portfolio'):(p.name||'Portfolio')+' — '+(p.role||'Cinematography');
    const description=document.querySelector('meta[name="description"]');if(description&&page!=='film')description.content=p.intro||'Cinematography portfolio';
    const email=typeof p.email==='string'?p.email.trim():'';if(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)){const href='mailto:'+encodeURIComponent(email).replace('%40','@');const contact=document.querySelector('#contact-email');if(contact){const a=node('a','',email);a.href=href;contact.replaceChildren(a);}const button=document.querySelector('#contact-button');if(button){button.href=href;button.setAttribute('aria-label','Email '+p.name);}}
    const social=document.querySelector('#social-links');if(social){social.replaceChildren();for(const key of ['instagram','vimeo']){const href=media.webUrl(p[key]);if(href){const a=node('a','',key[0].toUpperCase()+key.slice(1)+' ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';social.append(a);}}}
  }
  function mountVideo(container,value,poster,options={}){
    const source=media.videoSource(value);container.replaceChildren();
    if(source.type==='iframe'){const src=new URL(source.url);src.searchParams.set('autoplay',options.autoplay?'1':'0');if(options.muted)src.searchParams.set('mute','1');const frame=node('iframe');frame.src=src.href;frame.title=options.title||'Film player';frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';container.append(frame);return true;}
    if(source.type==='video'){const video=node('video');video.src=url(source.url);video.controls=options.controls!==false;video.autoplay=Boolean(options.autoplay);video.muted=Boolean(options.muted);video.loop=Boolean(options.loop);video.playsInline=true;video.preload='metadata';if(poster)video.poster=asset(poster);container.append(video);return true;}
    return false;
  }
  window.Portfolio={load,chrome,node,url,asset,image,projectUrl,mountVideo,slug,mediaVideo:media.videoSource};
})();
