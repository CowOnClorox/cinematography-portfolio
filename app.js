(async function(){
  'use strict';
  const P=window.Portfolio;
  const $=selector=>document.querySelector(selector);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let data;let active='All';let previews=[];

  function render(){
    previews.forEach(preview=>preview.destroy());previews=[];
    const grid=$('#projects');grid.replaceChildren();
    const selected=data.projects.filter(film=>film.featured!==false);
    const films=selected.filter(film=>active==='All'||film.category===active);
    grid.classList.toggle('filtered',active!=='All');
    grid.classList.toggle('layout-three',films.length===3);
    grid.classList.toggle('layout-single',films.length===1);
    $('.showcase').classList.toggle('many-projects',films.length>4);
    $('#work-count').textContent=String(films.length).padStart(2,'0');
    for(const film of films){
      const i=data.projects.indexOf(film);
      const article=P.node('article','project-card');
      const link=P.node('a','project-button');link.href=P.projectUrl(film);link.setAttribute('aria-label','View '+film.title);
      const top=P.node('div','project-topline');
      top.append(P.node('span','project-index',String(i+1).padStart(2,'0')+' /'),P.node('span','project-type',film.category||''));
      const frame=P.node('div','project-image');
      const useHero=film.id===data.hero?.projectId&&Boolean(data.hero?.image);
      P.image(frame,useHero?data.hero.image:film.image,useHero?data.hero.imageAlt:film.imageAlt,false);
      frame.append(P.node('span','project-arrow','↗'),P.node('span','frame-caption','View film'));
      const bottom=P.node('div','project-bottom');bottom.append(P.node('h3','',film.title),P.node('span','',film.year||''));
      link.append(top,frame,bottom);article.append(link);grid.append(article);
      if(window.PortfolioHover)previews.push(window.PortfolioHover.attach(link,frame,film));
    }
    grid.setAttribute('aria-busy','false');$('#featured-empty').hidden=films.length>0;
  }

  async function reveal(){
    const root=document.documentElement;const loader=$('#site-loader');
    if(!root.classList.contains('is-loading')){loader?.remove();return;}
    if(!reduced.matches){
      const images=[...document.querySelectorAll('#projects img')];
      const imagesReady=Promise.allSettled(images.map(img=>img.decode?img.decode():Promise.resolve()));
      await Promise.all([Promise.race([imagesReady,new Promise(resolve=>setTimeout(resolve,1400))]),new Promise(resolve=>setTimeout(resolve,520))]);
      if(root.classList.contains('is-loading')&&loader){
        const targets=[...document.querySelectorAll('#projects .project-image')].slice(0,3);
        const outlines=[...loader.children];const animations=[];
        outlines.forEach((outline,i)=>{
          const target=targets[i];if(!target){outline.hidden=true;return;}
          const start=outline.getBoundingClientRect();const end=target.getBoundingClientRect();
          if(typeof outline.animate==='function')animations.push(outline.animate([
            {left:start.left+'px',top:start.top+'px',width:start.width+'px',height:start.height+'px',opacity:1},
            {left:end.left+'px',top:end.top+'px',width:end.width+'px',height:end.height+'px',opacity:1,offset:.78},
            {left:end.left+'px',top:end.top+'px',width:end.width+'px',height:end.height+'px',opacity:0}
          ],{duration:650,easing:'cubic-bezier(.22,.7,.25,1)',fill:'forwards'}).finished.catch(()=>{}));
        });
        root.classList.add('is-revealing');
        await Promise.all(animations);
      }
    }
    clearTimeout(window.portfolioBoot);root.classList.remove('is-loading','is-revealing');loader?.remove();
  }

  try{
    data=await P.load();P.chrome(data,'home');
    $('#hero-eyebrow').textContent=data.hero?.eyebrow||'Independent cinematography';
    $('#intro-title').textContent=data.hero?.title||'';
    $('#categories').textContent=[...new Set(data.projects.map(film=>film.category).filter(Boolean))].join(' / ');
    const categories=['All',...new Set(data.projects.filter(film=>film.featured!==false).map(film=>film.category).filter(Boolean))];
    for(const label of categories){
      const button=P.node('button','filter',label);button.type='button';button.setAttribute('aria-pressed',String(label===active));
      button.addEventListener('click',()=>{active=label;$('#filters').querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();});
      $('#filters').append(button);
    }
    render();
  }catch(error){$('#load-error').hidden=false;$('#projects').setAttribute('aria-busy','false');}
  finally{await reveal();}
})();
