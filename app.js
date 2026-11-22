'use strict';

/* Ясный день 50+ — исследовательский прототип 1.6.
   Все данные хранятся только на устройстве. Нет аналитики, регистрации или сервера.
   Типы заданий основаны на изученных методах когнитивной тренировки;
   именно эта программная реализация НЕ проходила клиническую проверку. */

const STORE = 'yasny-den-v1'; // История старой версии — только для безопасного переноса
const IS_PREVIEW = new URLSearchParams(location.search).get('preview') === '1';
const PROFILES_STORE = IS_PREVIEW ? 'yasny-den-preview-profiles-v1' : 'yasny-den-profiles-v1';
// Примерные по длительности планы. 20 минут — режим по умолчанию.
// Ни длительность, ни наша конкретная программа не прошли клиническую валидацию.
function buildPlan(minutes, date = new Date()) {
 const configured=window.YASNY_CONTENT?.PLAN_ORDER;
 const order=Array.isArray(configured)?configured:[];
 const prioritize=items=>items.map((type,index)=>({type,index})).sort((x,y)=>{
  const ix=order.indexOf(x.type),iy=order.indexOf(y.type);
  const px=ix<0?1000+x.index:ix,py=iy<0?1000+y.index:iy;
  return px-py||x.index-y.index;
 }).map(row=>row.type);
 const day = Math.floor(new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime()/86400000);
 const alt = (items, step=0) => items[(day+step)%items.length];
 if(minutes === 15) return prioritize([alt(['words','changes','picturepairs']),alt(['focus','symbols','picturefind']),alt(['logic','association']), 'neuro', 'calm']);
 if(minutes === 30) return prioritize([alt(['words','changes','picturepairs']),alt(['focus','symbols','picturefind']), 'sequence',alt(['logic','association']), 'wordfluency', alt(['everyday','planning']),alt(['picturefind','picturepairs','changes']), 'neuro', 'calm']);
 return prioritize([alt(['words','changes','picturepairs']),alt(['focus','symbols','picturefind']), 'sequence',alt(['logic','association']),alt(['wordfluency','planning','everyday'],1), 'neuro', 'calm']);
}
const EXERCISES = {
  picturepairs: {name:'Найди пару',icon:'▧',label:'Зрительная память',time:'3–5 мин',desc:'Открывайте карточки с фотографиями и ищите одинаковые пары.',source:'review'},
  picturefind: {name:'Запомни и найди картинку',icon:'▣',label:'Зрительная память',time:'2–4 мин',desc:'Сначала запомните одну фотографию. Когда она исчезнет, найдите её среди других.',source:'review'},
  words:    {name:'Запомните слова', icon:'✦',label:'Память',time:'3–5 мин',desc:'Запоминайте слова и узнавайте их среди других.',source:'active'},
  focus:    {name:'Найдите и сосчитайте',icon:'◎',label:'Внимание',time:'2–4 мин',desc:'Ищите нужное слово среди похожих.',source:'review'},
  sequence: {name:'Вспомните порядок',icon:'☷',label:'Рабочая память',time:'3–5 мин',desc:'Запоминайте последовательность и повторяйте её.',source:'review'},
  logic:    {name:'Продолжите ряд',icon:'⊞',label:'Мышление',time:'3–5 мин',desc:'Находите закономерности без ограничения времени.',source:'active'},
  everyday: {name:'Задачи из жизни',icon:'⌑',label:'Повседневные навыки',time:'3–5 мин',desc:'Потренируйтесь решать знакомые бытовые задачи.',source:'rus'},
  calm:     {name:'Спокойное дыхание',icon:'◌',label:'Расслабление',time:'1,5 мин',desc:'Медленный вдох и плавный выдох в удобном ритме.',source:'breath'},
  neuro:    {name:'Нейрогимнастика',icon:'↔',label:'Движение и внимание',time:'4–6 мин',desc:'Мягкие движения рук, переключение и упражнения с двумя задачами.',source:'dual'},
  changes:  {name:'Что исчезло?',icon:'◫',label:'Зрительная память',time:'3–4 мин',desc:'Запомните предметы и определите, какой пропал.',source:'review'},
  symbols:  {name:'Найдите символ',icon:'◇',label:'Зрительное внимание',time:'2–3 мин',desc:'Найдите нужный символ среди других без ограничения времени.',source:'active'},
  association: {name:'Три подсказки',icon:'✧',label:'Ассоциации и речь',time:'3–4 мин',desc:'Определите предмет по трём связанным подсказкам.',source:'rusmanual'},
  wordfluency: {name:'Подберите слова',icon:'А',label:'Речь и словарный запас',time:'3–4 мин',desc:'Придумайте слова по теме или на определённую букву.',source:'rusmanual'},
  planning: {name:'Расставьте по порядку',icon:'☑',label:'Планирование',time:'3–4 мин',desc:'Найдите правильный порядок повседневных действий.',source:'rus'}
};
const WORD_POOLS = window.YASNY_CONTENT.WORD_POOLS;
const FOCUS_POOLS = window.YASNY_CONTENT.FOCUS_POOLS;
const SEQ_POOLS = window.YASNY_CONTENT.SEQ_POOLS;
const LOGIC = window.YASNY_CONTENT.LOGIC;
const EVERYDAY = window.YASNY_CONTENT.EVERYDAY;

// Авторские варианты заданий, созданные по принципам, описанным в методических пособиях.
// Это НЕ воспроизведение валидированных диагностических тестов или патентованных игр.
const ASSOCIATIONS = window.YASNY_CONTENT.ASSOCIATIONS;
const SPEECH_PROMPTS = window.YASNY_CONTENT.SPEECH_PROMPTS;
const PLANNING_TASKS = window.YASNY_CONTENT.PLANNING_TASKS;
// Отдельные галереи для двух разных упражнений. Старые опубликованные фото продолжают работать.
const PICTURE_PAIR_SETS = window.YASNY_CONTENT.PICTURE_PAIR_SETS || window.YASNY_CONTENT.PICTURE_SETS || [];
const PICTURE_MEMORY_SETS = window.YASNY_CONTENT.PICTURE_MEMORY_SETS || window.YASNY_CONTENT.PICTURE_SETS || [];
let photoStudyTimer=null;
function clearPhotoStudyTimer(){if(photoStudyTimer!==null){clearInterval(photoStudyTimer);photoStudyTimer=null}}
function startPhotoStudyTimer(g){
 clearPhotoStudyTimer();
 const sec=Number(g.record.studySeconds);
 if(!Number.isFinite(sec)||sec<=0||g.phase!=='show')return;
 let remaining=sec;
 const el=document.getElementById('picture-countdown');
 if(el)el.textContent=String(remaining);
 photoStudyTimer=setInterval(()=>{
  if(game!==g||view!=='exercise'||g.phase!=='show'){clearPhotoStudyTimer();return}
  if(document.hidden)return; // Не сокращаем время, пока вкладка скрыта
  remaining--;
  const clock=document.getElementById('picture-countdown');
  if(clock)clock.textContent=String(Math.max(0,remaining));
  if(remaining<=0){clearPhotoStudyTimer();g.phase='answer';renderGame()}
 },1000);
}

const SYMBOL_TYPES=['●','▲','◆','■','★','✚'];

const SOURCES = {
 dual:{name:'Обзор моторно-когнитивной тренировки у пожилых (PMC, 2025)',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC11857035/'},
  who: {name:'ВОЗ, рекомендации по снижению риска когнитивных нарушений (2026)',url:'https://www.who.int/publications/i/item/9789240123557'},
  rus: {name:'Минздрав РФ: клинические рекомендации по когнитивным расстройствам (2024)',url:'https://cr.minzdrav.gov.ru/view-cr/617_5'},
  rusmanual: {name:'Минздрав РФ: «Когнитивный тренинг: упражнение интеллекта и речи» (2021)',url:'https://minzdrav.gov.ru/special/ministry/natsproektzdravoohranenie/stranitsa-5729/informatsionno-metodicheskie-materialy'},
  active: {name:'Национальные институты здоровья США: исследование ACTIVE (2026)',url:'https://www.nih.gov/news-events/news-releases/cognitive-speed-training-over-weeks-may-delay-diagnosis-dementia-over-decades'},
  review: {name:'Систематический обзор когнитивных тренировок пожилых (2017)',url:'https://pubmed.ncbi.nlm.nih.gov/28726168/'},
  nhs: {name:'NHS: поведение и эмоциональное напряжение при деменции',url:'https://www.nhs.uk/conditions/dementia/living-with-dementia/behaviour/'},
  breath: {name:'NHS: мягкие дыхательные упражнения при стрессе',url:'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/'},
  nia: {name:'NIA, Cognitive Health and Older Adults',url:'https://www.nia.nih.gov/health/brain-health/cognitive-health-and-older-adults'},
  pointer: {name:'U.S. POINTER, Alzheimer’s Association (2025)',url:'https://www.alz.org/us-pointer/study-results'},
  nice: {name:'NICE, рекомендации по помощи людям с деменцией',url:'https://www.nice.org.uk/guidance/ng97/chapter/recommendations'},
  wcag: {name:'W3C, рекомендации по доступности для пожилых пользователей',url:'https://www.w3.org/WAI/older-users/'},
  nih: {name:'NIH, исследование ACTIVE (2026)',url:'https://www.nih.gov/news-events/news-releases/cognitive-speed-training-over-weeks-may-delay-diagnosis-dementia-over-decades'}
};
const ARTICLES = window.YASNY_CONTENT.ARTICLES;
// Ссылки на официальные страницы авторов. Встроенный плеер загружается только по нажатию.
// Это НЕ копии видео: они остаются у правообладателей и могут быть удалены ими.
// Позже можно заменить записи собственными роликами в массиве NEURO_VIDEOS.
const NEURO_VIDEOS = window.YASNY_CONTENT.NEURO_VIDEOS;
// Вспомогательный домашний комплекс: упражнения с опорой и сидя, без движений на баланс.
// Каждое время ориентировочное, без принудительного таймера. Можно пропускать шаги.
const NEURO_STEPS = window.YASNY_CONTENT.NEURO_STEPS;
let activeNeuroVideo=null;
const MAX_ROUNDS = {picturepairs:3,picturefind:3,words:3,focus:4,sequence:3,logic:4,everyday:4,calm:1,neuro:NEURO_STEPS.length,changes:3,symbols:4,association:4,wordfluency:3,planning:3};


const main = document.getElementById('main');
let profileStore = loadProfiles();
let state = currentProfile()?.data || defaultState();
let view = currentProfile() ? 'home' : 'profiles';
let game = null;
let lastResult = null;
let breathingTimer = null;
let installPrompt = null;

function defaultState(){return {mode:20,font:0,history:[],activityLog:[],rotationLog:[],session:null,dailyDraft:null,soloDraft:null}}
function normalizeState(data){
 const d=data&&typeof data==='object'?data:{};
 return {mode:[15,20,30].includes(Number(d.mode))?Number(d.mode):20,
  font:[0,1,2].includes(d.font)?d.font:0,
  history:Array.isArray(d.history)?d.history.filter(e=>e&&typeof e.date==='string'&&typeof e.total==='number').slice(-365):[],
  activityLog:Array.isArray(d.activityLog)?d.activityLog.filter(e=>e&&typeof e.date==='string'&&Object.prototype.hasOwnProperty.call(EXERCISES,e.type)).slice(-1200):[],
  rotationLog:Array.isArray(d.rotationLog)?d.rotationLog.filter(e=>e&&typeof e.date==='string'&&typeof e.key==='string'&&typeof e.type==='string').slice(-1500):[],
  session:d.session&&Array.isArray(d.session.plan)&&Number.isInteger(d.session.position)?d.session:null,
  dailyDraft:validDraft(d.dailyDraft)?d.dailyDraft:null,
  soloDraft:validDraft(d.soloDraft)?d.soloDraft:null};
}
function validDraft(g){return g&&typeof g==='object'&&Object.prototype.hasOwnProperty.call(EXERCISES,g.type)&&Number.isInteger(g.round)&&g.round>=0&&g.round<MAX_ROUNDS[g.type]&&typeof g.phase==='string'&&g.record&&typeof g.record==='object'}
function loadProfiles(){
 try{
  const stored=JSON.parse(localStorage.getItem(PROFILES_STORE)||'null');
  if(stored&&Array.isArray(stored.profiles)){
   const profiles=stored.profiles.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim()).slice(0,30).map(p=>({id:p.id,name:p.name.slice(0,40),data:normalizeState(p.data)}));
   return {profiles,activeId:profiles.some(p=>p.id===stored.activeId)?stored.activeId:null};
  }
 }catch(e){console.warn('Не удалось загрузить список участников',e)}
 // Если человек уже занимался в предыдущей версии, сохраняем его старую историю.
 try{const old=IS_PREVIEW?null:localStorage.getItem(STORE);if(old){const data=normalizeState(JSON.parse(old));return {activeId:'original-user',profiles:[{id:'original-user',name:'Мой профиль',data}]}}}catch(e){console.warn('Не удалось перенести старую историю',e)}
 return {profiles:[],activeId:null};
}
function currentProfile(){return profileStore.profiles.find(p=>p.id===profileStore.activeId)||null}
function save(){
 const profile=currentProfile();if(profile)profile.data=state;
 try{localStorage.setItem(PROFILES_STORE,JSON.stringify(profileStore));return true}
 catch(e){console.warn('Не удалось сохранить данные',e);return false}
}
function saveGameDraft(){
 if(!game||!currentProfile())return;
 // Дыхание после закрытия вкладки запускается заново: таймер не восстанавливается наугад.
 const snapshot=JSON.parse(JSON.stringify(game));
 if(snapshot.type==='calm'&&snapshot.phase==='breathing')snapshot.phase='ready';
 if(game.daily)state.dailyDraft=snapshot;else state.soloDraft=snapshot;
 save();
}
function resumeSolo(){const draft=state.soloDraft;if(!validDraft(draft)){state.soloDraft=null;save();setView('library');return}game=draft;view='exercise';renderGame();window.scrollTo({top:0,behavior:'instant'});focusMain()}
function chooseProfile(id){
 if(!profileStore.profiles.some(p=>p.id===id))return;
 stopBreathing();game=null;activeNeuroVideo=null;lastResult=null;
 profileStore.activeId=id;state=currentProfile().data;save();setView('home');
}
function createProfile(name){
 name=String(name||'').trim().replace(/\s+/g,' ');
 if(name.length<2||name.length>40){alert('Введите имя от 2 до 40 символов.');return}
 if(profileStore.profiles.some(p=>p.name.toLowerCase()===name.toLowerCase())){alert('Такое имя уже есть. Добавьте фамилию или другое обозначение.');return}
 if(profileStore.profiles.length>=30){alert('Можно добавить не более 30 участников.');return}
 const id='p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
 profileStore.profiles.push({id,name,data:defaultState()});chooseProfile(id);
}
function renameProfile(id){
 const profile=profileStore.profiles.find(p=>p.id===id);if(!profile)return;
 const name=prompt('Как назвать участника?',profile.name);
 if(name===null)return;
 const trimmed=name.trim().replace(/\s+/g,' ');
 if(trimmed.length<2||trimmed.length>40){alert('Имя должно содержать от 2 до 40 символов.');return}
 if(profileStore.profiles.some(p=>p.id!==id&&p.name.toLowerCase()===trimmed.toLowerCase())){alert('Такое имя уже есть.');return}
 profile.name=trimmed;save();renderProfiles();
}
function removeProfile(id){
 const profile=profileStore.profiles.find(p=>p.id===id);if(!profile)return;
 if(!confirm(`Удалить участника «${profile.name}» вместе со всеми его занятиями? Это действие нельзя отменить.`))return;
 if(!confirm('Подтвердите ещё раз: все результаты этого участника будут удалены с этого устройства.'))return;
 profileStore.profiles=profileStore.profiles.filter(p=>p.id!==id);
 if(profileStore.activeId===id){profileStore.activeId=profileStore.profiles[0]?.id||null;state=currentProfile()?.data||defaultState();game=null;}
 save();setView('profiles');
}
function backupProfiles(){
 save();
 const blob=new Blob([JSON.stringify({format:'yasny-profiles',version:1,exportedAt:new Date().toISOString(),profiles:profileStore.profiles},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`yasny-den-backup-${dateKey()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function restoreProfiles(file){
 if(!file)return;
 try{
  const raw=await file.text();if(raw.length>2000000)throw Error('Файл слишком большой');
  const imported=JSON.parse(raw);
  if(imported.format!=='yasny-profiles'||imported.version!==1||!Array.isArray(imported.profiles)||!imported.profiles.length||imported.profiles.length>30)throw Error('Неподходящий файл');
  const profiles=imported.profiles.map(p=>{
   if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>40||typeof p.id!=='string'||p.id.length>100)throw Error('Неверные данные');
   return {id:p.id,name:p.name,data:normalizeState(p.data)};
  });
  if(new Set(profiles.map(p=>p.id)).size!==profiles.length)throw Error('Повторяющиеся идентификаторы');
  if(!confirm('Заменить текущие профили и результаты данными из резервной копии?'))return;
  profileStore={profiles,activeId:profiles[0].id};state=profiles[0].data;game=null;save();setView('profiles');
 }catch(e){alert('Не удалось восстановить данные. Выберите резервную копию, созданную этим приложением.')}
}
function renderProfiles(){
 const current=currentProfile();
 setMain(`<span class="eyebrow">Личные занятия</span><h1>${profileStore.profiles.length?'Выберите участника':'Добро пожаловать!'}</h1>
 <p class="lead">У каждого будет свой план и история занятий. Можно закрывать вкладку — результаты сохраняются в этом браузере.</p>
 <div class="stack section">${profileStore.profiles.map(p=>`<section class="card profile-card"><div class="row between"><div><h2>${escapeText(p.name)}</h2><p class="muted small">Завершённых занятий: ${(p.data.history||[]).reduce((n,x)=>n+x.total,0)}${p.data.session?' · Есть начатое занятие':''}</p></div>${p.id===profileStore.activeId?'<span class="chip">Выбран</span>':''}</div><div class="profile-actions">${btn(p.id===profileStore.activeId?'Продолжить занятия':'Заниматься','profile-select','full',`data-id="${escapeText(p.id)}"`)}${btn('Переименовать','profile-rename','secondary small-btn',`data-id="${escapeText(p.id)}"`)}${btn('Удалить','profile-delete','secondary small-btn',`data-id="${escapeText(p.id)}"`)}</div></section>`).join('')}</div>
 <section class="card section"><h2>Добавить человека</h2><p class="muted">Достаточно имени. Пароль и электронная почта не нужны.</p><form id="profile-form" class="profile-form"><label for="profile-name">Имя участника</label><input id="profile-name" name="profileName" type="text" autocomplete="off" required minlength="2" maxlength="40" placeholder="Например, Мария"/><button class="btn full" type="submit">Добавить участника</button></form></section>
 <section class="card section"><h2>Резервная копия</h2><p>Результаты сохраняются после закрытия вкладки. Если очистить данные браузера или сменить телефон, они могут исчезнуть. Можно сохранить копию в файл.</p><div class="row">${btn('Скачать копию','backup','secondary')}${btn('Восстановить из файла','restore-click','secondary')}</div><input type="file" id="restore-input" accept=".json,application/json" hidden aria-label="Выберите резервную копию"/></section>
 <p class="footnote">Профили хранятся только на этом устройстве и в этом браузере. На другом устройстве они не появятся автоматически.</p>`);
}
function escapeText(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function shuffle(a){const arr=[...a];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function dateKey(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function dayLabel(d){return d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}
// История именно ПОКАЗАННЫХ материалов каждого участника. Не содержит фотографий,
// имён пользователей или полного текста заданий — только короткий ключ варианта.
function utcDay(key){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(key||'');return m?Date.UTC(+m[1],+m[2]-1,+m[3])/86400000:-1}
function rotationKey(data){let s=String(data);let hash=2166136261;for(let i=0;i<s.length;i++){hash^=s.charCodeAt(i);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(36)}
function chooseFresh(type,items,keyFn){
 if(!items.length)return null;
 const current=utcDay(dateKey());const past=(state.rotationLog||[]).filter(e=>e.type===type&&current-utcDay(e.date)>=0&&current-utcDay(e.date)<14);
 const last=new Map(),week=new Set(),today=new Set();for(const e of past){const when=utcDay(e.date);last.set(e.key,Math.max(last.get(e.key)||-1,when));if(current-when<7)week.add(e.key);if(current===when)today.add(e.key)}
 const options=items.map(item=>({item,key:rotationKey(keyFn(item))}));
 const avoidSameRound=options.filter(o=>!game?.used?.includes(o.key));
 const pool=avoidSameRound.length?avoidSameRound:options;
 // Предпочтение: не показанный за 14 дней -> за 7 дней -> сегодня -> самый давний.
 const available14=pool.filter(o=>!last.has(o.key));
 const available7=pool.filter(o=>!week.has(o.key));
 const availableToday=pool.filter(o=>!today.has(o.key));
 const eligible=available14.length?available14:available7.length?available7:availableToday.length?availableToday:pool;
 const bestAge=Math.min(...eligible.map(o=>last.has(o.key)?last.get(o.key):-1));
 const leastRecent=eligible.filter(o=>(last.has(o.key)?last.get(o.key):-1)===bestAge);
 const selected=leastRecent[Math.floor(Math.random()*leastRecent.length)];
 if(game){game.used=game.used||[];game.used.push(selected.key)}
 state.rotationLog=state.rotationLog||[];
 state.rotationLog.push({date:dateKey(),type,key:selected.key});
 state.rotationLog=state.rotationLog.filter(e=>current-utcDay(e.date)<21).slice(-1500);
 return selected.item;
}
function shuffledCandidates(pools,count,variants=12){
 const results=[];for(let p=0;p<pools.length;p++)for(let n=0;n<variants;n++){const words=shuffle(pools[p]).slice(0,Math.min(count,pools[p].length));results.push({pool:p,words})}return results;
}
function weekStart(date){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
function weekSummary(offset){
 const monday=weekStart(new Date());monday.setDate(monday.getDate()+7*offset);
 const sunday=new Date(monday);sunday.setDate(sunday.getDate()+6);
 const start=dateKey(monday),end=dateKey(sunday),logs=state.activityLog.filter(e=>e.date>=start&&e.date<=end),days=new Set(logs.map(e=>e.date));
 const complete=state.history.filter(e=>e.date>=start&&e.date<=end).reduce((sum,e)=>sum+e.total,0);
 const types=new Set(logs.map(e=>e.type));const counts={};for(const e of logs)counts[e.type]=(counts[e.type]||0)+1;
 const most=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([type])=>EXERCISES[type]?.name||'Упражнение');
 const opportunities=Object.keys(EXERCISES).filter(t=>!['calm','neuro'].includes(t)&&!types.has(t));
 const suggestion=opportunities.length?`На следующей неделе можно попробовать: ${EXERCISES[opportunities[0]].name}.`:'На следующей неделе можно продолжить чередовать знакомые упражнения.';
 return {start,end,days:days.size,exercises:logs.length,complete,types:types.size,most,suggestion};
}
function renderWeekReport(w,heading){
 const dates=`${w.start.slice(8,10)}.${w.start.slice(5,7)} – ${w.end.slice(8,10)}.${w.end.slice(5,7)}`;
 return `<section class="card section weekly-report"><div class="row between"><h2>${heading}</h2><span class="chip">${dates}</span></div>
 <div class="weekly-stats"><div><strong>${w.days}</strong><span>дней с упражнениями</span></div><div><strong>${w.exercises}</strong><span>упражнений выполнено</span></div><div><strong>${w.types}</strong><span>видов практик</span></div></div>
 <p>${w.exercises?`Больше всего вы занимались: ${escapeText(w.most.join(' и '))}.`:'Пока нет завершённых упражнений за этот период. Можно начать с небольшого занятия.'}</p>
 <p class="muted small">${escapeText(w.suggestion)}</p><p class="small muted">Это история занятий, а не медицинская оценка памяти или мышления. Пропуски не считаются неудачами.</p></section>`;
}

function focusMain(){const h=main.querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}}
function applyFont(){document.documentElement.style.setProperty('--font-size',([20,22,24][state.font]||20)+'px')}
function setView(name){stopBreathing();clearPhotoStudyTimer();view=name;game=null;render();window.scrollTo({top:0,behavior:'instant'});focusMain()}
function setMain(html){const profile=currentProfile();const switcher=profile&&view!=='profiles'?`<div class="profile-switch"><span>Занимается: <strong>${escapeText(profile.name)}</strong></span><button class="profile-switch-btn" data-action="profiles" type="button">Сменить участника</button></div>`:'';main.innerHTML=switcher+html;document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.target===view || (view==='exercise'&&b.dataset.target==='library') || (view==='article'&&b.dataset.target==='articles')));document.title=`${({home:'Главная',library:'Упражнения',neuro:'Нейрогимнастика',articles:'Статьи',progress:'Мои занятия',settings:'Настройки',exercise:'Задание',article:'Статья',between:'Следующее задание',finished:'Занятие завершено',profiles:'Участники'})[view]||'Ясный день'} — Ясный день 50+`}
function btn(label,action,cls='',extra=''){return `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`}
function linkSource(key){const s=SOURCES[key];return `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeText(s.name)}</a>`}
function render(){applyFont();if(!currentProfile()&&view!=='profiles'){view='profiles'}switch(view){case'profiles':renderProfiles();break;case'home':renderHome();break;case'library':renderLibrary();break;case'neuro':renderNeuro();break;case'articles':renderArticles();break;case'article':renderArticle();break;case'progress':renderProgress();break;case'settings':renderSettings();break;case'exercise':renderGame();break;case'between':renderBetween();break;case'finished':renderFinished();break;default:renderHome()}}
function renderHome(){
 const today=dateKey(),done=state.history.some(e=>e.date===today),session=state.session;
 setMain(`<section class="hero">
  <span class="eyebrow">Забота о себе каждый день</span>
  <h1>Немного времени для ясной головы</h1>
  <p class="lead">Простые занятия для памяти, внимания и координации движений. Без спешки и строгих оценок.</p>
  <span class="badge">Ваш темп — правильный темп</span>
 </section>
 <section class="section">
  <div class="section-header"><h2>Занятие на сегодня</h2><span class="chip">${done?'✓ Вы уже занимались':'Подходит для начала'}</span></div>
  <div class="card">
   <h3>Ваш основной режим — 20 минут</h3>
   <p class="muted small">Выбрано по умолчанию. Можно сократить занятие до 15 минут или увеличить до 30. Время примерное: делайте перерывы.</p><p class="small"><strong>В каждом комплексе есть нейрогимнастика:</strong> мягкие движения рук и координация, ориентир 4–6 минут.</p>
   <div class="mode-row" role="group" aria-label="Продолжительность занятия">
     ${[15,20,30].map(m=>`<button type="button" class="mode ${state.mode===m?'selected':''}" aria-pressed="${state.mode===m}" data-action="mode" data-value="${m}">${m} минут</button>`).join('')}
   </div>
   ${session?`<div class="tip"><strong>У вас есть начатое занятие.</strong><p class="small" style="margin:5px 0 0">Выполнено заданий: ${session.position} из ${session.plan.length}. Можно продолжить с текущего упражнения.</p></div>
      <div class="row">${btn('Продолжить занятие','resume','full')}${btn('Начать заново','restart','secondary full')}</div>`:
      `${btn(done?'Позаниматься ещё':'Начать занятие','begin','full')}`}
  </div>
 </section>
 ${state.soloDraft?`<section class="section card"><h2>Сохранённое упражнение</h2><p>Вы остановились посреди задания. Можно продолжить с того же места.</p>${btn('Продолжить упражнение','resume-solo','full')}${btn('Начать другое','clear-solo','secondary full topspace')}</section>`:''}
 <section class="section neuro-banner"><div class="card neuro-feature"><div class="neuro-feature-icon" aria-hidden="true">↔</div><div><span class="eyebrow">Движение и внимание</span><h2>Нейрогимнастика</h2><p>Простые движения рук и упражнения на координацию. Можно выполнять сидя, смотреть видео специалиста или заниматься по тексту.</p><div class="row">${btn('Открыть нейрогимнастику','neuro','full')}${btn('Начать движения','activity','secondary full','data-type="neuro"')}</div></div></div></section>
 <section class="section"><div class="section-header"><h2>Что вы потренируете</h2>${btn('Все упражнения','library','secondary small-btn')}</div>
 <div class="grid">${['words','focus','association','planning'].map(k=>{const e=EXERCISES[k];return `<div class="card feature-card"><span class="feature-icon" aria-hidden="true">${e.icon}</span><h3>${e.label}</h3><p>${e.desc}</p></div>`}).join('')}</div>
 </section>
 <section class="section card soft"><h2>Ваш итог недели</h2><p>Небольшой отчёт о занятиях, которые вы уже выполнили. Он не сравнивает вас с другими.</p>${btn('Посмотреть итог недели','progress','secondary')}</section>
 <section class="section card soft"><h2>Полезное для каждого дня</h2><p>Сон, прогулки, общение и новые впечатления тоже важны. Мы собрали небольшие статьи с простыми идеями, которые удобно применять в жизни.</p>${btn('Читать полезные статьи','articles','secondary')}</section>
 <div class="banner"><strong>Забота о себе в удобном темпе.</strong> Здесь можно тренировать память, внимание и мышление, выбирать интересные упражнения и делать перерывы, когда хочется.</div>
 <p class="footnote">Данные занятий сохраняются только в браузере на этом устройстве. <button class="btn ghost small-btn" data-action="nav" data-target="settings">Настройки и сведения</button></p>`);
}
function renderLibrary(){setMain(`<span class="eyebrow">Тренировка в удобном темпе</span><h1>Упражнения</h1><p class="lead">Здесь ${Object.keys(EXERCISES).length} разных практик, включая нейрогимнастику. Без обязательного таймера.</p><section class="card neuro-small-feature section"><div><h2>↔ Нейрогимнастика</h2><p>Видеоуроки специалистов и 5 простых упражнений с подсказками.</p></div>${btn('Смотреть видео и комплекс','neuro','secondary')}</section><div class="grid section">${Object.entries(EXERCISES).map(([k,e])=>`<section class="card feature-card"><span class="feature-icon" aria-hidden="true">${e.icon}</span><div class="row bottomspace"><span class="chip">${e.label}</span><span class="muted small">${e.time}</span></div><h3>${e.name}</h3><p>${e.desc}</p>${btn('Начать упражнение','activity','secondary full',`data-type="${k}"`)}</section>`).join('')}</div><p class="banner">Выбирайте упражнения по настроению. Можно начать с одного задания, сделать перерыв и вернуться к занятиям позже.</p>`)}
function renderNeuro(){
 const completed=state.session && state.session.plan[state.session.position]==='neuro';
 setMain(`<span class="eyebrow">Движение и внимание</span><h1>Нейрогимнастика</h1>
 <p class="lead">Неспешная гимнастика для рук и координации. Сначала посмотрите пример, затем выполняйте движения в удобном темпе. Все упражнения можно делать сидя.</p>
 <div class="neuro-intro card section"><div class="neuro-symbol" aria-hidden="true">↔</div><div><h2>Комплекс на 4–6 минут</h2><p>5 простых движений с крупными пошаговыми подсказками. Можно повторять и останавливаться в любой момент.</p><div class="row">${completed?btn('Продолжить сегодняшнее занятие','resume','full'):btn('Начать нейрогимнастику','activity','full','data-type="neuro"')}</div></div></div>
 <div class="tip"><strong>Безопасность:</strong> выполняйте движения сидя на устойчивом стуле, не задерживайте дыхание и не преодолевайте боль. Если появляется головокружение, слабость или плохое самочувствие, остановитесь. После инсульта, операции или при ограничениях движения согласуйте занятия со специалистом.</div>
 <section class="section"><div class="section-header"><h2>Видеоуроки специалистов</h2><span class="chip">3 видео</span></div><p class="small muted">Видео размещены авторами на RuTube. Для просмотра нужен интернет. Плеер откроется только после нажатия.</p>
 <div class="stack">${NEURO_VIDEOS.map((video,i)=>`<article class="card neuro-video-card"><div class="row between"><span class="chip">Видеоурок ${i+1} · ${escapeText(video.provider)}</span><span class="muted small">${escapeText(video.length)}</span></div><h3>${escapeText(video.name)}</h3><p>${escapeText(video.desc)}</p><p class="small muted"><strong>Автор:</strong> ${escapeText(video.author)}</p>${activeNeuroVideo===video.id?`<div class="video-frame"><iframe loading="lazy" src="${video.embed}" title="${escapeText(video.name)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>${btn('Закрыть видео','closevideo','secondary full')}`:btn('Смотреть видео здесь','openvideo','full',`data-id="${video.id}"`)}<p class="neuro-video-link"><a href="${video.url}" target="_blank" rel="noopener noreferrer">Открыть оригинал на ${escapeText(video.provider)}</a></p></article>`).join('')}</div></section>
 <section class="section"><h2>Какие движения будем выполнять</h2><div class="stack">${NEURO_STEPS.map((step,i)=>`<div class="card neuro-step-short"><div class="neuro-step-number" aria-hidden="true">${i+1}</div><div><h3>${escapeText(step.name)}</h3><p class="muted small">${escapeText(step.kind)} · ${escapeText(step.duration)}</p><p>${escapeText(step.instruction)}</p></div></div>`).join('')}</div></section>
 <div class="banner"><strong>Движение и внимание.</strong> Эти упражнения помогают попрактиковаться в координации и переключении между действиями. Важнее удобство и регулярность, чем скорость.</div>
 <div class="section">${btn('Начать комплекс движений','activity','full','data-type="neuro"')}</div>`);
}
function renderNeuroStep(){
 const g=game,step=NEURO_STEPS[g.round];
 return `<div class="neuro-guided"><span class="chip">${escapeText(step.kind)}</span><h2>${escapeText(step.name)}</h2><p class="muted">Ориентир: ${escapeText(step.duration)}</p><div class="neuro-instruction">${escapeText(step.instruction)}</div><div class="tip"><strong>Более простой вариант:</strong> ${escapeText(step.easier)}</div><p class="small muted">Попробуйте выполнить несколько повторений. Спешить не нужно. При дискомфорте остановитесь.</p>${btn(g.round===NEURO_STEPS.length-1?'Завершить нейрогимнастику':'Движение выполнено. Далее','next-neuro','full')}${btn('Посмотреть видео с упражнениями','neuro','secondary full topspace')}</div>`;
}
function renderArticles(){setMain(`<span class="eyebrow">Коротко и по делу</span><h1>Полезные статьи</h1><p class="lead">Чтение займёт около двух минут. В конце каждой статьи есть простая идея на сегодня.</p><div class="grid section">${ARTICLES.map(a=>`<article class="card article-card"><span class="chip">${escapeText(a.category)} · ${a.minutes} мин</span><h3>${escapeText(a.title)}</h3><p class="muted small">${escapeText(a.paras[0].slice(0,125))}…</p>${btn('Прочитать','article','secondary',`data-id="${a.id}"`)}</article>`).join('')}</div>`)}
let activeArticle = ARTICLES[0].id;
function renderArticle(){const a=ARTICLES.find(x=>x.id===activeArticle)||ARTICLES[0];setMain(`<button class="back" data-action="nav" data-target="articles">← Все статьи</button><article class="main-content"><span class="eyebrow">${escapeText(a.category)}</span><h1>${escapeText(a.title)}</h1><div class="article-meta">Чтение: примерно ${a.minutes} минуты</div><div class="card article-text">${a.paras.map(p=>`<p>${escapeText(p)}</p>`).join('')}<div class="tip"><strong>Попробуйте сегодня</strong><p style="margin:8px 0 0">${escapeText(a.tip)}</p></div><hr class="divider"><p class="small"><strong>Источник:</strong> ${linkSource(a.source)}</p></div></article><div class="section">${btn('К другим статьям','articles','secondary')}</div>`)}
function renderProgress(){
 const today=new Date(),days=[];for(let i=6;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()-i);days.push({d,key:dateKey(d),done:state.history.some(h=>h.date===dateKey(d))})}
 const total=state.history.reduce((s,h)=>s+h.total,0),week=days.filter(x=>x.done).length;
 setMain(`<span class="eyebrow">Ваш ритм важнее рекордов</span><h1>Мои занятия</h1><p class="lead">Посмотрите, сколько времени вы уже уделили себе. Здесь важна регулярность, а не рекорды.</p>
 <div class="grid section"><section class="card"><div class="muted small">Дней с занятиями</div><div class="count-big">${state.history.length}</div></section><section class="card"><div class="muted small">Завершённых занятий</div><div class="count-big">${total}</div></section><section class="card"><div class="muted small">Выполнено упражнений</div><div class="count-big">${state.activityLog.length}</div></section></div>
 <section class="card section"><h2>Последние 7 дней</h2><div class="days" aria-label="Дни с завершёнными занятиями">${days.map(x=>`<div class="day ${x.done?'completed':''}" aria-label="${dayLabel(x.d)}: ${x.done?'есть занятие':'нет занятия'}"><span>${x.d.toLocaleDateString('ru-RU',{weekday:'short'})}</span><strong>${x.done?'✓':'–'}</strong></div>`).join('')}</div><p class="small muted topspace">На этой неделе занятия были в ${week} из 7 дней. Пропускать дни — нормально.</p></section>
 ${renderWeekReport(weekSummary(0),'Итог этой недели')}${renderWeekReport(weekSummary(-1),'Итог прошлой недели')}
 <section class="card section"><h2>Последние упражнения</h2>${state.activityLog.length?`<ul class="source-list">${state.activityLog.slice(-8).reverse().map(e=>`<li><strong>${escapeText(EXERCISES[e.type]?.name||'Упражнение')}</strong> — ${escapeText(e.date.split('-').reverse().join('.'))}${e.daily?' · в комплексе':' · отдельно'}</li>`).join('')}</ul>`:'<p class="muted">После завершения игр здесь появятся ваши занятия.</p>'}</section><section class="card section"><h2>Участники</h2><p>У каждого человека своя история занятий на этом устройстве.</p>${btn('Выбрать участника','profiles','secondary')}</section><section class="card section"><h2>Ваши маленькие шаги</h2><p>Здесь сохраняется история занятий, чтобы было приятно замечать свою регулярность. Оценивайте свой прогресс по ощущениям и интересу к заданиям, а не только по количеству выполненного.</p>${btn('Новое занятие','tohome')}</section>
 <p class="footnote">Если очистить данные браузера или открыть приложение на другом устройстве, история не перенесётся автоматически.</p>`);
}
function renderSettings(){setMain(`<span class="eyebrow">Настройте под себя</span><h1>Настройки и информация</h1>
 <section class="card section"><h2>Размер текста</h2><p class="muted">Нажимайте кнопку, пока буквы не станут удобными для чтения.</p><div class="row">${btn('Увеличить текст','font','secondary')}${btn('Обычный размер','fontreset','secondary')}</div><p class="small muted topspace">Размер сейчас: ${['обычный','крупный','очень крупный'][state.font]}.</p></section>
 <section class="card section"><h2>Участники и сохранение</h2><p>У каждого человека свой прогресс. После закрытия вкладки результаты остаются в этом браузере, пока не очищены данные сайта.</p>${btn('Управление участниками','profiles','secondary')}<p class="topspace muted small">Данные не отправляются на сервер.</p>${btn('Удалить историю текущего участника','clear','secondary')}</section>
 <section class="card section"><h2>Как установить на телефон</h2><p><strong>На Android:</strong> откройте приложение в Chrome, затем меню браузера и пункт «Установить приложение» или «Добавить на главный экран».</p><p><strong>На iPhone:</strong> откройте страницу в Safari, выберите «Поделиться», затем «На экран Домой».</p><p class="small muted">После первого открытия на опубликованном HTTPS-сайте основные задания могут работать без интернета.</p></section>
 <section class="card section"><h2>О приложении</h2><p>«Ясный день» создан для спокойных занятий на память, внимание, мышление и координацию. В основе упражнений лежат направления, которые изучают специалисты. Сама эта версия приложения ещё не проходила отдельную научную проверку эффективности.</p><p>Материалы носят информационный характер и не заменяют консультацию специалиста. Если изменения памяти или самочувствия заметно мешают привычной жизни, лучше обсудить их с врачом.</p><h3>Научные и методические источники</h3><ul class="source-list">${Object.keys(SOURCES).map(k=>`<li>${linkSource(k)}</li>`).join('')}</ul></section>`)}
function startSession(restart=false){if(state.session && !restart){resumeSession();return}state.dailyDraft=null;state.session={mode:state.mode,plan:buildPlan(state.mode),position:0,startedAt:Date.now(),results:[]};save();resumeSession()}
function resumeSession(){const s=state.session;if(!s){setView('home');return}if(s.position>=s.plan.length){completeSession();return}const draft=state.dailyDraft;if(validDraft(draft)&&draft.daily&&draft.type===s.plan[s.position]){game=draft;view='exercise';renderGame();window.scrollTo({top:0,behavior:'instant'});focusMain();return}startGame(s.plan[s.position],true)}
function startGame(type,daily){if(!EXERCISES[type])return;stopBreathing();clearPhotoStudyTimer();if(daily)state.dailyDraft=null;else state.soloDraft=null;game={type,daily,round:0,phase:'',correct:0,selected:[],answers:[],record:null,used:[]};view='exercise';generateRound();renderGame();window.scrollTo({top:0,behavior:'instant'});focusMain()}
function generateRound(){clearPhotoStudyTimer();const g=game;g.selected=[];g.feedback='';g.why='';g.correctAnswer='';
 switch(g.type){
 case 'picturepairs': {
  const usable=PICTURE_PAIR_SETS.map((s,i)=>({s,i})).filter(({s})=>s.images&&s.images.filter(x=>x.src).length>=2);
  if(!usable.length){g.record={setIndex:-1,tiles:[],opened:[],matched:[],attempts:0};g.phase='answer';break;}
  const allCandidates=[];
  for(const row of usable){const valid=row.s.images.map((_,i)=>i).filter(i=>row.s.images[i].src),count=Math.min(Math.max(2,Math.min(5,Number(row.s.pairs)||3)),valid.length);
   for(let v=0;v<36;v++){const indices=shuffle(valid).slice(0,count);allCandidates.push({chosen:row,indices,signature:`${row.s.id||row.i}:${indices.map(i=>row.s.images[i].id||i).sort().join(',')}`})}}
  // Чтобы завтра показывать другие ФОТО, а не только другую раскладку,
  // отдаём приоритет комбинациям из изображений, которых ещё не было за неделю.
  const now=utcDay(dateKey()),seenImages=new Set((state.rotationLog||[]).filter(e=>e.type==='picturepairs-photo'&&now-utcDay(e.date)>=0&&now-utcDay(e.date)<7).map(e=>e.key));
  const freshness=v=>v.indices.filter(i=>!seenImages.has(rotationKey(v.chosen.s.images[i].id||`${v.chosen.i}:${i}`))).length;
  const mostFresh=Math.max(...allCandidates.map(freshness));
  const candidates=allCandidates.filter(v=>freshness(v)===mostFresh);
  const fresh=chooseFresh('picturepairs',candidates,v=>v.signature);
  const chosen=fresh.chosen,indices=fresh.indices;
  for(const i of indices){state.rotationLog.push({date:dateKey(),type:'picturepairs-photo',key:rotationKey(chosen.s.images[i].id||`${chosen.i}:${i}`)})}
  state.rotationLog=state.rotationLog.slice(-1500);
  const tiles=shuffle(indices.flatMap(n=>[{image:n,key:n},{image:n,key:n}])).map((t,i)=>({...t,slot:i}));
  g.record={setIndex:chosen.i,tiles,opened:[],matched:[],attempts:0};g.phase='answer';break;
 }
 case 'picturefind': {
  const usable=PICTURE_MEMORY_SETS.map((s,i)=>({s,i})).filter(({s})=>s.images&&s.images.filter(x=>x.src).length>=3);
  if(!usable.length){g.record={setIndex:-1,options:[],target:-1};g.phase='answer';break;}
  const allCandidates=[];
  for(const row of usable){const valid=row.s.images.map((_,i)=>i).filter(i=>row.s.images[i].src);for(const candidate of valid){
   const maxOthers=Math.min(Math.max(2,Math.min(5,(Number(row.s.findOptions)||5)-1)),valid.length-1);
   for(let v=0;v<3;v++){const options=shuffle([candidate,...shuffle(valid.filter(i=>i!==candidate)).slice(0,maxOthers)]);
    allCandidates.push({chosen:row,target:candidate,options,signature:`${row.s.id||row.i}:${row.s.images[candidate].id||candidate}`})}}}
  const fresh=chooseFresh('picturefind',allCandidates,v=>v.signature);
  const chosen=fresh.chosen,target=fresh.target,options=fresh.options;
  const sec=Number(chosen.s.studySeconds);
  const studySeconds=[0,10,15,20,30].includes(sec)?sec:15;
  g.record={setIndex:chosen.i,target,options,studySeconds};g.phase='show';break;
 }
 case 'words': {const n=4+(state.font===2?0:Math.min(2,g.round));const rec=chooseFresh('words',shuffledCandidates(WORD_POOLS,n,36),v=>v.pool+':'+[...v.words].sort().join('|'));const pool=WORD_POOLS[rec.pool],words=rec.words;g.record={words,options:shuffle([...words,...shuffle(pool.filter(w=>!words.includes(w))).slice(0,Math.min(6,12-n))])};g.phase='show';break}
 case 'focus': {const n=3+(g.round%3),rec=chooseFresh('focus',FOCUS_POOLS.map((pool,i)=>({pool,i})),v=>v.i);const pool=rec.pool,target=pool[0];const cells=shuffle([...Array(n).fill(target),...Array.from({length:16-n},()=>pick(pool.slice(1)))]);g.record={cells,target,count:n};g.phase='answer';break}
 case 'sequence': {const n=3+(g.round%2),rec=chooseFresh('sequence',shuffledCandidates(SEQ_POOLS,n,30),v=>v.pool+':'+v.words.join('|'));g.record={words:rec.words};g.phase='show';break}
 case 'logic': {const q=chooseFresh('logic',LOGIC.map((record,i)=>({record,i})),x=>x.record.id||x.i).record;g.record=q;g.phase='answer';break}
 case 'everyday': {const q=chooseFresh('everyday',EVERYDAY.map((record,i)=>({record,i})),x=>x.record.id||x.i).record;g.record=q;g.phase='answer';break}
 case 'changes': {const rows=shuffledCandidates(WORD_POOLS,6,36).map(r=>({...r,missing:pick(r.words)}));const rec=chooseFresh('changes',rows,r=>r.pool+':'+[...r.words].sort().join('|')+':'+r.missing),pool=WORD_POOLS[rec.pool],words=rec.words,missing=rec.missing;const options=shuffle([missing,...shuffle(pool.filter(w=>!words.includes(w))).slice(0,3)]);g.record={words,missing,options};g.phase='show';break}
 case 'symbols': {const target=chooseFresh('symbols',SYMBOL_TYPES,x=>x),others=SYMBOL_TYPES.filter(x=>x!==target),n=3+(g.round%3);g.record={target,count:n,cells:shuffle([...Array(n).fill(target),...Array.from({length:18-n},()=>pick(others))])};g.phase='answer';break}
 case 'association': {const q=chooseFresh('association',ASSOCIATIONS,x.answer);g.record={...q,choices:shuffle(q.choices)};g.phase='answer';break}
 case 'wordfluency': {const q=chooseFresh('wordfluency',SPEECH_PROMPTS,x.title);g.record={...q};g.phase='answer';break}
 case 'planning': {const q=chooseFresh('planning',PLANNING_TASKS,x.q);g.record={...q,words:q.steps};g.phase='answer';break}
 case 'calm': {g.phase='ready';g.record={};break}
 case 'neuro': {g.phase='ready';g.record={};break}
 }
}
function renderGame(){clearPhotoStudyTimer();if(!game){setView('library');return}const g=game,e=EXERCISES[g.type],total=MAX_ROUNDS[g.type],cur=Math.min(g.round+1,total);let content='';
 if(g.type==='picturepairs'){
  const r=g.record,photos=PICTURE_PAIR_SETS[r.setIndex]?.images||[];
  content=photos.length?`<p class="hint">Нажимайте на карточки по две. Постарайтесь найти одинаковые фотографии. Если не совпали, следующий выбор закроет их.</p><p class="small muted">Найдено пар: ${r.matched.length} из ${r.tiles.length/2}. Без таймера.</p><div class="photo-pairs-grid">${r.tiles.map((t,i)=>{const open=r.opened.includes(i)||r.matched.includes(t.key);const photo=photos[t.image];return `<button type="button" class="photo-tile ${open?'open':''} ${r.matched.includes(t.key)?'matched':''}" data-action="picture-open" data-index="${i}" aria-label="${open?escapeText(photo.name):`Закрытая карточка ${i+1}`} " ${g.phase==='feedback'||r.matched.includes(t.key)?'disabled':''}>${open?`<img alt="${escapeText(photo.name)}" src="${escapeText(photo.src)}"/>`:'<span aria-hidden="true">?</span>'}</button>`}).join('')}</div>`:'<p class="banner">Добавьте фотографии через редактор игр, чтобы запустить это задание.</p>';
 }
 if(g.type==='picturefind'){
  const r=g.record,photos=PICTURE_MEMORY_SETS[r.setIndex]?.images||[];
  if(!photos.length||!photos[r.target]) content='<p class="banner">Для этой игры нужны фотографии. Добавьте их в редакторе «Запомни и найди картинку».</p>';
  else if(g.phase==='show') content=`<p class="hint">Шаг 1 из 2. Внимательно рассмотрите фотографию и запомните её. Затем образец исчезнет.</p><div class="photo-target"><img src="${escapeText(photos[r.target].src)}" alt="Фотография для запоминания"/><span>ЗАПОМНИТЕ ЭТУ ФОТОГРАФИЮ</span></div>${r.studySeconds>0?`<p class="photo-memory-timer">Картинка исчезнет через <strong id="picture-countdown">${r.studySeconds}</strong> сек.</p>`:'<p class="small muted">Картинка останется, пока не нажмёте кнопку.</p>'}${btn('Я запомнил(а). Показать варианты','picture-memorized','full topspace')}`;
  else {
   content=`<p class="hint">Шаг 2 из 2. Образец скрыт. Вспомните, какую фотографию видели, и найдите её среди вариантов.</p><div class="photo-find-grid">${r.options.map((idx,i)=>`<button type="button" class="photo-choice" data-action="picture-answer" data-index="${idx}" aria-label="Вариант ${i+1}" ${g.phase==='feedback'?'disabled':''}><img src="${escapeText(photos[idx].src)}" alt="Вариант ${i+1}"/></button>`).join('')}</div>`;
   if(g.phase==='feedback')content+=`<div class="photo-memory-result"><p class="small muted">Была показана эта фотография:</p><img src="${escapeText(photos[r.target].src)}" alt="Правильный образец"/></div>`;
  }
 }
 if(g.type==='words'){
  if(g.phase==='show')content=`<p class="hint">Прочитайте слова в удобном темпе. Постарайтесь их запомнить. Когда будете готовы, нажмите кнопку.</p><ul class="memory-words">${g.record.words.map(w=>`<li>${w}</li>`).join('')}</ul>${btn('Я запомнил(а). Дальше','hidewords','full')}`;
  else content=`<p class="hint">Какие слова были на предыдущем экране? Отметьте их, затем нажмите «Проверить».</p><div class="options centered">${g.record.options.map(w=>`<button class="option ${g.selected.includes(w)?'selected':''}" type="button" aria-pressed="${g.selected.includes(w)}" data-action="toggleword" data-value="${w}" ${g.phase==='feedback'?'disabled':''}>${w}</button>`).join('')}</div>${g.phase==='answer'?`<p class="small muted topspace" aria-live="polite">Выбрано: ${g.selected.length}. Можно выбрать столько слов, сколько помните.</p>${btn('Проверить','checkwords','full topspace')}`:''}`;
 }
 if(g.type==='focus'){const r=g.record;const options=Array.from(new Set([Math.max(1,r.count-2),r.count-1,r.count,r.count+1].filter(n=>n>0))).sort((a,b)=>a-b);content=`<p class="hint">Найдите слово <strong>«${r.target}»</strong> и сосчитайте, сколько раз оно встречается.</p><div class="count-grid">${r.cells.map(w=>`<span>${w}</span>`).join('')}</div><div class="options centered">${options.map(n=>`<button type="button" class="option" data-action="answer" data-value="${n}" ${g.phase==='feedback'?'disabled':''}>${n} раз</button>`).join('')}</div>`;}
 if(g.type==='sequence'){
  if(g.phase==='show')content=`<p class="hint">Запомните <strong>порядок</strong> слов. Потом нажмите «Готово».</p><ol class="memory-words">${g.record.words.map((w,i)=>`<li>${i+1}. ${w}</li>`).join('')}</ol>${btn('Готово. Повторю порядок','hidesequence','full')}`;
  else content=`<p class="hint">Нажимайте на слова в том порядке, в котором они были показаны.</p><div class="selected-sequence" aria-live="polite">${g.selected.length?g.selected.map((w,i)=>`<span class="chip">${i+1}. ${w}</span>`).join(''):'Пока ничего не выбрано'}</div><div class="options centered">${shuffleStable(g.record.words).map(w=>`<button type="button" class="option ${g.selected.includes(w)?'selected':''}" data-action="pickseq" data-value="${w}" ${g.selected.includes(w)||g.phase==='feedback'?'disabled':''}>${w}</button>`).join('')}</div>${g.phase==='answer'?`${btn('Начать выбор заново','clearseq','secondary full topspace')}${btn('Проверить','checksequence','full topspace',`${g.selected.length!==g.record.words.length?'disabled':''}`)}`:''}`;
 }
 if(g.type==='logic'||g.type==='everyday'){const q=g.record;content=`<p class="hint">${g.type==='logic'?'Какое число должно быть следующим?':'Выберите подходящий ответ.'}</p>${g.type==='logic'?`<div class="number-sequence">${q.q}</div>`:`<h3 class="topspace" style="line-height:1.5">${q.q}</h3>`}<div class="options centered">${q.choices.map(c=>`<button type="button" class="option" data-action="answer" data-value="${escapeText(c)}" ${g.phase==='feedback'?'disabled':''}>${escapeText(c)}</button>`).join('')}</div>`;}
 if(g.type==='changes'){
  const r=g.record;
  if(g.phase==='show')content=`<p class="hint">Рассмотрите эти шесть предметов и постарайтесь их запомнить. Затем один предмет исчезнет.</p><div class="memory-words">${r.words.map(w=>`<div class="sequence-item">${escapeText(w)}</div>`).join('')}</div>${btn('Готово. Что исчезло?','hidechanges','full')}`;
  else content=`<p class="hint">Какого предмета не стало?</p><div class="memory-words">${r.words.filter(w=>w!==r.missing).map(w=>`<div class="sequence-item">${escapeText(w)}</div>`).join('')}</div><div class="options centered">${r.options.map(w=>`<button type="button" class="option" data-action="answer" data-value="${escapeText(w)}" ${g.phase==='feedback'?'disabled':''}>${escapeText(w)}</button>`).join('')}</div>`;
 }
 if(g.type==='symbols'){
  const r=g.record;const opts=[Math.max(1,r.count-1),r.count,r.count+1,r.count+2].sort((a,b)=>a-b);
  content=`<p class="hint">Сосчитайте, сколько раз встречается символ <strong class="big-symbol">${r.target}</strong>. Можно не торопиться.</p><div class="symbol-grid" aria-label="Поле символов">${r.cells.map(w=>`<span>${w}</span>`).join('')}</div><div class="options centered">${opts.map(n=>`<button type="button" class="option" data-action="answer" data-value="${n}" ${g.phase==='feedback'?'disabled':''}>${n} раз</button>`).join('')}</div>`;
 }
 if(g.type==='association'){
  const r=g.record;
  content=`<p class="hint">Какой предмет или понятие объединяет три подсказки?</p><div class="clue-grid">${r.clues.map((c,i)=>`<div class="clue"><span class="clue-number">${i+1}</span>${escapeText(c)}</div>`).join('')}</div><div class="options centered">${r.choices.map(w=>`<button type="button" class="option" data-action="answer" data-value="${escapeText(w)}" ${g.phase==='feedback'?'disabled':''}>${escapeText(w)}</button>`).join('')}</div>`;
 }
 if(g.type==='wordfluency'){
  const r=g.record;
  content=`<h3 class="topspace">${escapeText(r.title)}</h3><p>${escapeText(r.hint)} Можно называть слова вслух или записывать. <strong>Проверки на скорость нет.</strong></p><div class="tip">${escapeText(r.sample)}</div>${g.phase==='answer'?`<label class="word-label" for="word-response">Мои слова (необязательно)</label><textarea id="word-response" class="word-input" rows="4" placeholder="Пишите слова через запятую…">${escapeText(g.typedText||'')}</textarea>${btn('Готово, продолжить','savefluency','full topspace')}`:''}`;
 }
 if(g.type==='planning'){
  const r=g.record;
  content=`<h3 class="topspace">${escapeText(r.q)}</h3><p class="hint">Нажмите на действия в правильном порядке: что сделать сначала, затем и в конце?</p><div class="selected-sequence" aria-live="polite">${g.selected.length?g.selected.map((w,i)=>`<span class="chip">${i+1}. ${escapeText(w)}</span>`).join(''):'Пока ничего не выбрано'}</div><div class="options">${shuffleStable(r.words).map(w=>`<button type="button" class="option ${g.selected.includes(w)?'selected':''}" data-action="pickseq" data-value="${escapeText(w)}" ${g.selected.includes(w)||g.phase==='feedback'?'disabled':''}>${escapeText(w)}</button>`).join('')}</div>${g.phase==='answer'?`${btn('Начать выбор заново','clearseq','secondary full topspace')}${btn('Проверить','checksequence','full topspace',g.selected.length!==r.words.length?'disabled':'')}`:''}`;
 }
 if(g.type==='calm')content=renderCalm();
 if(g.type==='neuro')content=renderNeuroStep();
 if(g.phase==='feedback')content+=`<div class="feedback ${g.feedback==='В этот раз ответ другой. Посмотрите подсказку.'?'neutral':''}" role="status"><strong>${g.feedback}</strong>${g.why?`<p>${g.why}</p>`:''}</div>${btn(g.round===total-1?'Завершить упражнение':'Следующее задание','next-round','full topspace')}`;
 const session=state.session,fullCount=g.daily&&session?session.plan.length:total,fullDone=g.daily&&session?session.position:g.round;
 setMain(`<button class="back" data-action="leavegame">← ${g.daily?'Прервать на время':'Все упражнения'}</button>
 <span class="eyebrow">${e.label}</span><h1>${e.name}</h1>
 <div class="card soft"><div class="row between"><span class="small muted">${g.daily?`Упражнение ${fullDone+1} из ${fullCount}`:`Раунд ${cur} из ${total}`}</span><span class="chip">Без спешки</span></div><div class="progress-bar" role="progressbar" aria-label="Ход занятия" aria-valuenow="${g.daily?Math.floor((fullDone/fullCount)*100):Math.floor((g.round/total)*100)}" aria-valuemin="0" aria-valuemax="100"><div style="width:${g.daily?(fullDone/fullCount)*100:(g.round/total)*100}%"></div></div></div>
 <section class="game-card"><div class="game-title">${g.type==='calm'?'Устройтесь удобно':g.type==='neuro'?`Движение ${cur} из ${total}`:`Раунд ${cur}`}</div>${content}</section>
 <p class="muted small">Можно пропустить задание, сделать перерыв или попробовать ещё раз. Здесь не нужно соревноваться.</p>
 ${g.phase!=='feedback'&&g.type!=='calm'?btn('Пропустить упражнение','skip','secondary small-btn'):''}`);
 saveGameDraft();
 if(g.type==='picturefind' && g.phase==='show' && view==='exercise')startPhotoStudyTimer(g);
}
function shuffleStable(arr){return [...arr].sort((a,b)=>a.localeCompare(b,'ru'))}
function renderCalm(){if(game.phase==='ready')return `<p>Сядьте удобно. Дышите спокойно, без задержек и без усилий. Упражнение занимает около полутора минут.</p><div class="tip">Вдох — примерно 4 секунды, плавный выдох — примерно 6 секунд. Если появляются неприятные ощущения или головокружение, остановитесь.</div><div class="breath-wrap"><div class="breath-circle" aria-hidden="true">◌</div></div>${btn('Начать спокойное дыхание','start-breath','full')}`;
 if(game.phase==='breathing')return `<p>Следуйте подсказке, но подстраивайте ритм под самочувствие. Не задерживайте дыхание.</p><div class="breath-wrap"><div class="breath-circle inhale" id="breath-circle" aria-hidden="true">Вдох</div></div><div class="timer" id="breath-timer" aria-live="off">1:30</div><p id="breath-guide" class="muted" style="text-align:center">Медленный вдох</p>${btn('Завершить раньше','finish-breath','secondary full topspace')}`;
 return `<div class="feedback" role="status"><strong>Спокойная практика завершена.</strong><p>Можно отдохнуть и вернуться к обычным делам. Если упражнение было некомфортным, не нужно его повторять.</p></div>${btn('Продолжить','complete-breath','full topspace')}`;
}
function clickPictureCard(index){
 const g=game;if(!g||g.type!=='picturepairs'||g.phase!=='answer')return;
 const r=g.record,card=r.tiles[index];if(!card||r.matched.includes(card.key))return;
 if(r.opened.length===2){r.opened=[];}
 if(r.opened.includes(index))return;
 r.opened.push(index);
 if(r.opened.length===2){r.attempts++;const [a,b]=r.opened.map(i=>r.tiles[i]);if(a.key===b.key){r.matched.push(a.key);r.opened=[];
  if(r.matched.length===r.tiles.length/2){g.correct++;g.phase='feedback';g.feedback='Все пары найдены!';g.why=`Вы открыли ${r.matched.length} пар за ${r.attempts} попыток.`;}
 }}
 renderGame();
}
function clickPictureChoice(index){
 const g=game;if(!g||g.type!=='picturefind'||g.phase!=='answer')return;clearPhotoStudyTimer();
 const ok=index===g.record.target;if(ok)g.correct++;
 g.phase='feedback';g.feedback=ok?'Правильно! Вы нашли такую же картинку.':'Хорошая попытка. Посмотрите ещё раз на образец.';
 g.why=`Нужная фотография: ${PICTURE_MEMORY_SETS[g.record.setIndex].images[g.record.target].name}.`;renderGame();
}
function checkAnswer(answer){const g=game;if(!g||g.phase!=='answer')return;let ok=false,why='';
 if(g.type==='focus'){ok=Number(answer)===g.record.count;why=`Слово «${g.record.target}» встречается ${g.record.count} раз.`}
 if(g.type==='logic'||g.type==='everyday'||g.type==='association'){ok=String(answer)===g.record.answer;why=`Правильный ответ: ${g.record.answer}. ${g.record.why}`}
 if(g.type==='symbols'){ok=Number(answer)===g.record.count;why=`Символ ${g.record.target} встречается ${g.record.count} раз.`}
 if(g.type==='changes'){ok=String(answer)===g.record.missing;why=`Исчезнувший предмет: «${g.record.missing}».`}
 if(ok)g.correct++;g.feedback=ok?'Верно! Хорошая работа.':'В этот раз ответ другой. Посмотрите подсказку.';g.why=why;g.phase='feedback';renderGame();}
function checkWords(){const g=game;if(!g||g.type!=='words'||g.phase!=='answer')return;const hits=g.selected.filter(w=>g.record.words.includes(w)).length;const misses=g.selected.length-hits;const all=hits===g.record.words.length&&misses===0;g.correct+=all?1:0;g.feedback=all?'Все слова вспомнили!':'Хорошая попытка. Продолжаем.';g.why=`Верно отмечено слов: ${hits} из ${g.record.words.length}${misses?`. Лишних отметок: ${misses}`:''}. Были слова: ${g.record.words.join(', ')}.`;g.phase='feedback';renderGame()}
function checkSequence(){const g=game;if(!g||!['sequence','planning'].includes(g.type)||g.phase!=='answer'||g.selected.length!==g.record.words.length)return;const n=g.record.words.filter((w,i)=>g.selected[i]===w).length,ok=n===g.record.words.length;g.correct+=ok?1:0;g.feedback=ok?'Вы запомнили порядок!':'Спасибо за попытку. Тренируемся дальше.';g.why=`${g.type==='planning'?g.record.why:`На своих местах: ${n} из ${g.record.words.length}.`} Правильный порядок: ${g.record.words.join(' → ')}.`;g.phase='feedback';renderGame()}
function nextRound(){if(!game)return;if(game.round+1<MAX_ROUNDS[game.type]){game.round++;generateRound();renderGame();window.scrollTo({top:0,behavior:'instant'})}else finishGame(false)}
function finishGame(skipped){if(!game)return;stopBreathing();clearPhotoStudyTimer();lastResult={name:EXERCISES[game.type].name,correct:game.correct,total:MAX_ROUNDS[game.type],skipped};const daily=game.daily;if(!skipped){state.activityLog.push({date:dateKey(),type:game.type,daily,correct:game.correct,total:MAX_ROUNDS[game.type]});state.activityLog=state.activityLog.slice(-600)}if(daily)state.dailyDraft=null;else state.soloDraft=null;game=null;
 if(daily&&state.session){state.session.results=state.session.results||[];state.session.results.push(lastResult);state.session.position++;save();if(state.session.position>=state.session.plan.length){completeSession()}else{view='between';renderBetween()}}
 else {save();view='between';renderBetween()}
 window.scrollTo({top:0,behavior:'instant'});focusMain();}
function renderBetween(){const daily=!!state.session,r=lastResult||{name:'Упражнение',skipped:false,correct:0,total:1};setMain(`<span class="eyebrow">${r.skipped?'Можно двигаться дальше':'Готово!'}</span><h1>${r.skipped?'Задание пропущено':'Упражнение завершено'}</h1><section class="card section"><div class="feature-icon" aria-hidden="true">✓</div><h2>${r.name}</h2><p>${r.skipped?'Вы сами выбираете подходящий темп.':'Вы потренировали один из навыков. Любая попытка — это практика.'}</p>${daily?`<p class="muted">Выполнено ${state.session.position} из ${state.session.plan.length} упражнений в сегодняшнем плане.</p>${btn('Перейти к следующему','resume','full')}`:`${btn('Выбрать другое упражнение','library','full')}`}</section>`)}
function completeSession(){const s=state.session;if(!s){setView('home');return}const key=dateKey(), didTasks=(s.results||[]).some(r=>!r.skipped);if(didTasks){let row=state.history.find(h=>h.date===key);if(row)row.total++;else state.history.push({date:key,total:1});}state.session=null;state.dailyDraft=null;lastResult={results:s.results||[],mode:s.mode};view='finished';save();renderFinished();window.scrollTo({top:0,behavior:'instant'});focusMain()}
function renderFinished(){const r=lastResult||{mode:20,results:[]},count=r.results?r.results.filter(x=>!x.skipped).length:0;setMain(`<span class="eyebrow">Вы уделили время себе</span><h1>Занятие завершено!</h1><div class="hero"><div class="count-big">✓</div><h2>Отличная работа</h2><p>Вы выполнили ${count} ${count===1?'упражнение':count<5?'упражнения':'упражнений'} из плана. Сегодня вы потренировали разные навыки.</p><p class="muted small">Каждое занятие — ещё один небольшой шаг к полезной привычке.</p></div><div class="section row">${btn('Посмотреть свои занятия','progress')}${btn('Вернуться на главную','tohome','secondary')}</div>`)}
function startBreathing(){if(!game||game.type!=='calm'||game.phase!=='ready')return;game.phase='breathing';renderGame();stopBreathing();const began=Date.now(),duration=90000;let previous=-1;
 breathingTimer=setInterval(()=>{if(!game||game.type!=='calm'||game.phase!=='breathing'){stopBreathing();return}const elapsed=Math.min(duration,Date.now()-began),left=Math.ceil((duration-elapsed)/1000),phase=Math.floor((elapsed%10000)/1000)<4?0:1;if(left<=0){stopBreathing();game.phase='done';renderGame();return}
 const t=document.getElementById('breath-timer'),c=document.getElementById('breath-circle'),p=document.getElementById('breath-guide');if(t)t.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;
 if(phase!==previous){previous=phase;if(c){c.textContent=phase===0?'Вдох':'Выдох';c.className=`breath-circle ${phase===0?'inhale':'exhale'}`}if(p)p.textContent=phase===0?'Медленный вдох':'Плавный выдох';}
 },250)}
function stopBreathing(){if(breathingTimer!==null){clearInterval(breathingTimer);breathingTimer=null}}
function finishBreath(){stopBreathing();if(game&&game.type==='calm'){game.phase='done';renderGame()}}
function askRestart(){if(window.confirm('Начать новое занятие? Текущий незавершённый план будет заменён.'))startSession(true)}
function clearData(){if(window.confirm('Удалить всю историю и незавершённое занятие на этом устройстве?')){state.history=[];state.activityLog=[];state.rotationLog=[];state.session=null;state.dailyDraft=null;state.soloDraft=null;save();setView('settings')}}
function handleClick(e){const el=e.target.closest('[data-action]');if(!el||el.disabled)return;const action=el.dataset.action;
 switch(action){
 case'profiles':setView('profiles');break;
 case'profile-select':chooseProfile(el.dataset.id);break;
 case'profile-rename':renameProfile(el.dataset.id);break;
 case'profile-delete':removeProfile(el.dataset.id);break;
 case'backup':backupProfiles();break;
 case'restore-click':document.getElementById('restore-input')?.click();break;
 case'resume-solo':resumeSolo();break;
 case'clear-solo':state.soloDraft=null;save();renderHome();break;
 case'nav':setView(el.dataset.target||'home');break;
 case'tohome':setView('home');break;
 case'library':setView('library');break;
 case'neuro':activeNeuroVideo=null;setView('neuro');break;
 case'openvideo':{const found=NEURO_VIDEOS.find(v=>v.id===el.dataset.id);if(found){activeNeuroVideo=found.id;renderNeuro();const frame=main.querySelector('.video-frame');if(frame)frame.scrollIntoView({behavior:'smooth',block:'center'});}break}
 case'closevideo':activeNeuroVideo=null;renderNeuro();break;
 case'next-neuro':if(game&&game.type==='neuro'){game.correct++;nextRound()}break;
 case'articles':setView('articles');break;
 case'progress':setView('progress');break;
 case'mode':state.mode=Number(el.dataset.value);save();renderHome();break;
 case'begin':startSession();break;
 case'restart':askRestart();break;
 case'resume':resumeSession();break;
 case'activity':startGame(el.dataset.type,false);break;
 case'article':activeArticle=el.dataset.id;setView('article');break;
 case'font':state.font=(state.font+1)%3;save();render();break;
 case'fontreset':state.font=0;save();render();break;
 case'clear':clearData();break;
 case'leavegame':setView(game&&game.daily?'home':'library');break;
 case'hidewords':if(game&&game.type==='words'&&game.phase==='show'){game.phase='answer';renderGame()}break;
 case'hidesequence':if(game&&game.type==='sequence'&&game.phase==='show'){game.phase='answer';renderGame()}break;
 case'hidechanges':if(game&&game.type==='changes'&&game.phase==='show'){game.phase='answer';renderGame()}break;
 case'toggleword':if(game&&game.type==='words'&&game.phase==='answer'){const w=el.dataset.value;game.selected=game.selected.includes(w)?game.selected.filter(x=>x!==w):[...game.selected,w];renderGame()}break;
 case'checkwords':checkWords();break;
 case'pickseq':if(game&&['sequence','planning'].includes(game.type)&&game.phase==='answer'&&!game.selected.includes(el.dataset.value)){game.selected.push(el.dataset.value);renderGame()}break;
 case'clearseq':if(game&&['sequence','planning'].includes(game.type)&&game.phase==='answer'){game.selected=[];renderGame()}break;
 case'checksequence':checkSequence();break;
 case'savefluency':if(game&&game.type==='wordfluency'&&game.phase==='answer'){
   const entry=(document.getElementById('word-response')?.value||'').trim();
   const words=entry?entry.split(/[,;\n]+/).map(w=>w.trim()).filter(Boolean):[];
   game.feedback='Практика речи завершена. Хорошая работа.';
   game.why=words.length?`Вы записали ${words.length} вариантов. Здорово, что потренировали подбор слов.`:'Спасибо за участие. Можно выполнять задание вслух и не записывать ответы.';
   game.phase='feedback';renderGame();
 }break;
 case'picture-open':clickPictureCard(Number(el.dataset.index));break;
 case'picture-memorized':if(game&&game.type==='picturefind'&&game.phase==='show'){clearPhotoStudyTimer();game.phase='answer';renderGame()}break;
 case'picture-answer':clickPictureChoice(Number(el.dataset.index));break;
 case'answer':checkAnswer(el.dataset.value);break;
 case'next-round':nextRound();break;
 case'skip':finishGame(true);break;
 case'start-breath':startBreathing();break;
 case'finish-breath':finishBreath();break;
 case'complete-breath':finishGame(false);break;
 }
}
document.addEventListener('click',handleClick);
document.addEventListener('submit',event=>{if(event.target.id==='profile-form'){event.preventDefault();createProfile(new FormData(event.target).get('profileName'));}});
document.addEventListener('input',event=>{if(event.target.id==='word-response'&&game&&game.type==='wordfluency'){game.typedText=event.target.value;saveGameDraft();}});
document.addEventListener('change',event=>{if(event.target.id==='restore-input'){restoreProfiles(event.target.files?.[0]);event.target.value='';}});

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
if('serviceWorker'in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}
// Редактор открывает нужный тип игры сразу, не затрагивая реальные профили.
const requestedPreviewExercise=IS_PREVIEW?new URLSearchParams(location.search).get('exercise'):null;
if(['picturepairs','picturefind'].includes(requestedPreviewExercise)){
 if(!currentProfile()){
  const id='preview-editor';
  profileStore.profiles.push({id,name:'Проверка игры',data:defaultState()});
  profileStore.activeId=id;state=profileStore.profiles[profileStore.profiles.length-1].data;save();
 }
 startGame(requestedPreviewExercise,false);
}else render();
