(function(){
  'use strict';
  const $=selector=>document.querySelector(selector);
  const {webUrl,imageUrl,videoSource}=window.PortfolioMedia;
  let data;let activeFilter='All';let lastTrigger;
  const dialog=$('#film-dialog');
  function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;}
  function addImage(parent,path,alt,lazy=true){const img=el('img');img.src=imageUrl(path);img.alt=alt||'';img.loading=lazy?'lazy':'eager';img.decoding='async';img.addEventListener('error',()=>{img.hidden=true;},{once:true});parent.append(img);return img;}
  function renderProfile(){
    const profile=data.profile;
    document.querySelectorAll('[data-profile]').forEach(node=>node.textContent=profile[node.dataset.profile]||'');
    document.title=(profile.name||'Portfolio')+' — '+(profile.role||'Cinematography');
    document.querySelector('meta[name=description]').content=profile.intro||'Cinematography portfolio';
    $('#hero-eyebrow').textContent=data.hero.eyebrow||'Independent cinematography';
    $('#intro-title').textContent=data.hero.title||'In a different\nlight.';
    $('#copyright-year').textContent=new Date().getFullYear();
    $('#categories').textContent=[...new Set(data.projects.map(project=>project.category).filter(Boolean))].join(' / ');
    const email=typeof profile.email==='string'?profile.email.trim():'';
    if(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)){
      const link=el('a','',email);link.href='mailto:'+encodeURIComponent(email).replace('%40','@');$('#contact-email').replaceChildren(link);
      $('#contact-button').href=link.href;$('#contact-button').setAttribute('aria-label','Email '+profile.name);
    }
    for(const key of ['instagram','vimeo']){const url=webUrl(profile[key]);if(url){const link=el('a','',key[0].toUpperCase()+key.slice(1)+' ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';$('#social-links').append(link);}}
  }
  function renderFilters(){
    const categories=['All',...new Set(data.projects.map(project=>project.category).filter(Boolean))];
    for(const category of categories){const button=el('button','filter',category);button.type='button';button.setAttribute('aria-pressed',String(category===activeFilter));button.addEventListener('click',()=>{activeFilter=category;$('#filters').querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));renderProjects();});$('#filters').append(button);}
  }
  function renderProjects(){
    const grid=$('#projects');grid.replaceChildren();grid.classList.toggle('filtered',activeFilter!=='All');
    const projects=data.projects.filter(project=>activeFilter==='All'||project.category===activeFilter);
    $('#work-count').textContent=String(projects.length).padStart(2,'0');
    for(const project of projects){
      const index=data.projects.indexOf(project);const number=String(index+1).padStart(2,'0');
      const card=el('article','project-card');const button=el('button','project-button');button.type='button';button.setAttribute('aria-label','View '+project.title);
      const top=el('div','project-topline');top.append(el('span','project-index',number+' /'),el('span','project-type',project.category));
      const frame=el('div','project-image');const isFeatured=project.id===data.hero.projectId&&Boolean(data.hero.image);
      addImage(frame,isFeatured?data.hero.image:project.image,isFeatured?data.hero.imageAlt:project.imageAlt,index!==0);
      const play=el('span','play-circle');play.setAttribute('aria-hidden','true');play.innerHTML='<svg viewBox="0 0 10 12"><path d="M0 0 10 6 0 12Z"/></svg>';
      frame.append(play,el('span','frame-caption','Explore film ↗'));
      const bottom=el('div','project-bottom');bottom.append(el('h3','',project.title),el('span','',project.year));button.append(top,frame,bottom);button.addEventListener('click',()=>openFilm(project,index,button));card.append(button);grid.append(card);
    }
    grid.setAttribute('aria-busy','false');
  }
  function showPlaceholder(project,type){
    const wrap=el('div','placeholder-player');addImage(wrap,project.image,'',false);
    const message=el('div','placeholder-message');
    message.append(el('span','',type==='placeholder'?'Sample project':'Film'),el('h3','',type==='placeholder'?'Film unavailable.':'Watch the full film.'));
    message.append(el('p','',type==='placeholder'?'A sample frame from the collection.':type==='invalid'?'This film is currently unavailable.':'View the film on its original website.'));
    if(type==='external'){const source=videoSource(project.videoUrl);if(source.url){const link=el('a','external-film','Open film ↗');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';message.append(link);}}
    wrap.append(message);$('#film-player').append(wrap);
  }
  function openFilm(project,index,trigger){
    lastTrigger=trigger;$('#film-number').textContent=String(index+1).padStart(2,'0');$('#film-title').textContent=project.title;$('#film-description').textContent=project.description||'';$('#film-category').textContent=project.category||'';
    const credits=$('#film-credits');credits.replaceChildren();
    for(const [title,value]of [['Director',project.director],['Year',project.year],['Duration',project.duration]]){if(value){const group=el('div');group.append(el('dt','',title),el('dd','',value));credits.append(group);}}
    const player=$('#film-player');player.replaceChildren();const source=videoSource(project.videoUrl);
    if(source.type==='iframe'){const frame=el('iframe');frame.src=source.url;frame.title=project.title+' — film player';frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';player.append(frame);}
    else if(source.type==='video'){const video=el('video');video.controls=true;video.autoplay=true;video.playsInline=true;video.src=source.url;video.poster=imageUrl(project.image);video.addEventListener('error',()=>{player.replaceChildren();showPlaceholder(project,'external');},{once:true});player.append(video);}
    else showPlaceholder(project,source.type);
    document.body.classList.add('modal-open');dialog.showModal();$('#close-film').focus();
  }
  function closeFilm(){dialog.close();}
  $('#close-film').addEventListener('click',closeFilm);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeFilm();}});
  dialog.addEventListener('close',()=>{$('#film-player').replaceChildren();document.body.classList.remove('modal-open');lastTrigger?.focus();});
  async function init(){
    try{const response=await fetch('content/site.json');if(!response.ok)throw Error('Content unavailable');data=await response.json();if(!data.profile||!data.hero||!Array.isArray(data.projects))throw Error('Invalid content');renderProfile();renderFilters();renderProjects();}
    catch(error){$('#load-error').hidden=false;$('#projects').setAttribute('aria-busy','false');console.error('Portfolio content:',error.message);}
  }
  init();
})();
