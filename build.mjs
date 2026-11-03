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
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const files=['index.html','404.html','style.css','media.js','site.js','app.js','work.css','work.js','project.css','project.js'];
const hash=createHash('sha256');for(const file of [...files,'work/index.html','work/film.html','content/site.json'])hash.update(readFileSync(join(root,file)));
const version=hash.digest('hex').slice(0,12);
const versioned=html=>html.replace(/((?:src|href)="[^"?]+\.(?:css|js))"/g,'$1?v='+version+'"');
for(const file of files){const target=join(out,file);writeFileSync(target,file.endsWith('.html')?versioned(readFileSync(join(root,file),'utf8')):readFileSync(join(root,file)));}
cpSync(join(root,'assets'),join(out,'assets'),{recursive:true});mkdirSync(join(out,'content'));cpSync(join(root,'content/site.json'),join(out,'content/site.json'));if(existsSync(join(root,'CNAME')))cpSync(join(root,'CNAME'),join(out,'CNAME'));
mkdirSync(join(out,'work'));writeFileSync(join(out,'work/index.html'),versioned(readFileSync(join(root,'work/index.html'),'utf8')));
const template=readFileSync(join(root,'work/film.html'),'utf8');const escape=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const host=existsSync(join(root,'CNAME'))?readFileSync(join(root,'CNAME'),'utf8').trim():'';const origin=/^[a-z0-9.-]+$/i.test(host)?'https://'+host:'';
for(const {project,slug} of routes){const folder=join(out,'work',slug);mkdirSync(folder,{recursive:true});const canonical=origin?origin+'/work/'+slug+'/':'';let cover='';try{const parsed=new URL(project.image,origin+'/');if(/^https?:$/.test(parsed.protocol))cover=parsed.href;}catch{}const values={__PROJECT_ID__:project.id,__PROJECT_TITLE__:project.title,__PROFILE_NAME__:data.profile.name||'Cinematography',__PROJECT_DESCRIPTION__:project.description?.trim().slice(0,170)||project.title,__PROJECT_CANONICAL__:canonical,__PROJECT_IMAGE__:cover};let html=template.replace(/__PROJECT_ID__|__PROJECT_TITLE__|__PROFILE_NAME__|__PROJECT_DESCRIPTION__|__PROJECT_CANONICAL__|__PROJECT_IMAGE__/g,token=>escape(values[token]));writeFileSync(join(folder,'index.html'),versioned(html));}
console.log('Built '+routes.length+' film pages.');
