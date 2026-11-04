import {readFileSync,writeFileSync,mkdirSync,rmSync,cpSync,existsSync,lstatSync} from 'node:fs';
import {resolve,dirname,relative,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=dirname(fileURLToPath(import.meta.url));const out=resolve(root,'dist');
if(relative(root,out)!=='dist'||!out.startsWith(root+sep)||(existsSync(out)&&lstatSync(out).isSymbolicLink()))throw Error('Invalid output directory');
const data=JSON.parse(readFileSync(join(root,'content/site.json'),'utf8'));
if(!data.profile||!Array.isArray(data.projects))throw Error('Invalid content');
const used=new Set();const ids=new Set();
const routes=data.projects.map(project=>{
  if(typeof project.id!=='string'||!project.id||ids.has(project.id))throw Error('Film IDs must be unique');ids.add(project.id);
  const slug=project.slug||project.id;
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||used.has(slug))throw Error('Film page addresses must be unique lowercase slugs');used.add(slug);return {project,slug};
});
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const embedded=JSON.stringify(data).replace(/[<>&\u2028\u2029]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
function setText(html,id,value){return html.replace(new RegExp('(<([a-z][a-z0-9]*)\\b[^>]*\\bid="'+id+'"[^>]*>)[\\s\\S]*?(</\\2>)','i'),(_,open,tag,close)=>open+escape(value)+close);}
function populated(html){
  html=html.replace(/(<([a-z][a-z0-9]*)\b[^>]*\bdata-profile="([^"]+)"[^>]*>)[\s\S]*?(<\/\2>)/gi,(_,open,tag,key,close)=>open+escape(data.profile[key]||'')+close);
  html=html.replace(/(<span\b[^>]*(?:\bdata-year|\bid="copyright-year")[^>]*>)[\s\S]*?(<\/span>)/gi,(_,open,close)=>open+new Date().getFullYear()+close);
  const isHome=/\bdata-page="home"/.test(html);const isWork=/\bdata-page="work"/.test(html);
  if(isHome||isWork){
    const title=isWork?'All work — '+(data.profile.name||'Portfolio'):(data.profile.name||'Portfolio')+' — '+(data.profile.role||'Cinematography');
    html=html.replace(/<title>[\s\S]*?<\/title>/i,()=>'<title>'+escape(title)+'</title>');
    html=html.replace(/(<meta\b[^>]*\bname="description"\s+content=")[^"]*(")/i,(_,open,close)=>open+escape(data.profile.intro||'Cinematography portfolio')+close);
  }
  if(isHome){
    html=setText(html,'hero-eyebrow',data.hero?.eyebrow||'Independent cinematography');
    html=setText(html,'intro-title',data.hero?.title||'In a different light.');
    html=setText(html,'work-count',String(data.projects.filter(project=>project.featured!==false).length).padStart(2,'0'));
    html=setText(html,'categories',[...new Set(data.projects.map(project=>project.category).filter(Boolean))].join(' / '));
    const email=typeof data.profile.email==='string'?data.profile.email.trim():'';
    if(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)){
      const href='mailto:'+encodeURIComponent(email).replace('%40','@');
      html=html.replace(/(<p\b[^>]*\bid="contact-email"[^>]*>)[\s\S]*?(<\/p>)/i,(_,open,close)=>open+'<a href="'+escape(href)+'">'+escape(email)+'</a>'+close);
    }
  }
  return html.replace('</head>',()=>'<script id="portfolio-content" type="application/json">'+embedded+'</script>\n</head>');
}
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const files=['index.html','404.html','style.css','media.js','site.js','app.js','hover-video.js','work.css','work.js','project.css','project.js'];
const hash=createHash('sha256');for(const file of [...files,'work/index.html','work/film.html','content/site.json'])hash.update(readFileSync(join(root,file)));
const version=hash.digest('hex').slice(0,12);
const versioned=html=>html.replace(/((?:src|href)="[^"?]+\.(?:css|js))"/g,'$1?v='+version+'"');
for(const file of files){const target=join(out,file);writeFileSync(target,file.endsWith('.html')?versioned(populated(readFileSync(join(root,file),'utf8'))):readFileSync(join(root,file)));}
cpSync(join(root,'assets'),join(out,'assets'),{recursive:true});mkdirSync(join(out,'content'));cpSync(join(root,'content/site.json'),join(out,'content/site.json'));if(existsSync(join(root,'CNAME')))cpSync(join(root,'CNAME'),join(out,'CNAME'));
mkdirSync(join(out,'work'));writeFileSync(join(out,'work/index.html'),versioned(populated(readFileSync(join(root,'work/index.html'),'utf8'))));
const template=readFileSync(join(root,'work/film.html'),'utf8');
const host=existsSync(join(root,'CNAME'))?readFileSync(join(root,'CNAME'),'utf8').trim():'';const origin=/^[a-z0-9.-]+$/i.test(host)?'https://'+host:'';
for(const {project,slug} of routes){const folder=join(out,'work',slug);mkdirSync(folder,{recursive:true});const canonical=origin?origin+'/work/'+slug+'/':'';let cover='';try{const parsed=new URL(project.image,origin+'/');if(/^https?:$/.test(parsed.protocol))cover=parsed.href;}catch{}const values={__PROJECT_ID__:project.id,__PROJECT_TITLE__:project.title,__PROFILE_NAME__:data.profile.name||'Cinematography',__PROJECT_DESCRIPTION__:project.description?.trim().slice(0,170)||project.title,__PROJECT_CANONICAL__:canonical,__PROJECT_IMAGE__:cover};let html=template.replace(/__PROJECT_ID__|__PROJECT_TITLE__|__PROFILE_NAME__|__PROJECT_DESCRIPTION__|__PROJECT_CANONICAL__|__PROJECT_IMAGE__/g,token=>escape(values[token]));writeFileSync(join(folder,'index.html'),versioned(populated(html)));}
console.log('Built '+routes.length+' film pages.');
