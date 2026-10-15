const studySolveAdaptive={mistakes:[],dueCards:[],progress:[]};

const originalDashboardPage=dashboard;
dashboard=async function adaptiveDashboard(){
  const base=await originalDashboardPage();
  if(!state.user)return base;
  setTimeout(loadAdaptiveDashboard,0);
  return `${base}<div class="card" id="adaptiveNextAction"><div class="section-title"><h3>Next Best Study Action</h3><span class="badge">Adaptive</span></div><div class="empty">Calculating your next best action…</div></div>`;
};

async function loadAdaptiveDashboard(){
  if(!state.user)return;
  const box=document.getElementById('adaptiveNextAction');if(!box)return;
  try{
    const [m,p,c]=await Promise.all([
      supabase.from('mistakes').select('id,question,correct_answer,topic,review_count,resolved,created_at').eq('user_id',state.user.id).eq('resolved',false).order('created_at',{ascending:false}).limit(8),
      supabase.from('learning_progress').select('topic,subject,mastery,practice_count,last_studied_at').eq('user_id',state.user.id).order('mastery',{ascending:true}).limit(8),
      supabase.from('revision_items').select('id,topic,due_at,interval_days,review_count,flashcard_id').eq('user_id',state.user.id).lte('due_at',new Date().toISOString()).order('due_at',{ascending:true}).limit(8)
    ]);
    const mistakes=m.data||[],progress=p.data||[],due=c.data||[];
    const weak=progress.find(x=>Number(x.mastery)<70);
    let title='Keep learning';let detail='Ask the AI Teacher about a difficult topic for your next learning session.';let action='solve';
    if(due.length){title=`Review ${due.length} due card${due.length===1?'':'s'}`;detail='Spaced revision is due now. Review these cards before learning something new.';action='practice';}
    else if(mistakes.length){title=`Fix ${mistakes.length} saved mistake${mistakes.length===1?'':'s'}`;detail=`Start with: ${mistakes[0].topic||'your recent mistake'}. Re-learning mistakes is usually higher priority than adding new content.`;action='practice';}
    else if(weak){title=`Practice ${weak.topic}`;detail=`Current mastery is ${Math.round(Number(weak.mastery))}%. Do a short practice session to strengthen this topic.`;action='practice';}
    box.innerHTML=`<div class="list-row"><div><strong>${esc(title)}</strong><div class="muted">${esc(detail)}</div></div><button class="primary" id="adaptiveActionButton">Start</button></div>`;
    document.getElementById('adaptiveActionButton')?.addEventListener('click',()=>{state.page=action;render();});
  }catch(error){box.innerHTML=`<div class="notice">Adaptive recommendations are temporarily unavailable. ${esc(error.message||'Please try again.')}</div>`;}
}

const originalPracticePageAdaptive=practicePage;
practicePage=function adaptivePractice(){
  const base=originalPracticePageAdaptive();
  setTimeout(loadAdaptivePractice,0);
  return `${base}<div class="grid grid-2"><div class="card" id="mistakeNotebook"><div class="section-title"><h3>Mistake Notebook</h3><span class="badge">Review</span></div><div class="empty">Loading saved mistakes…</div></div><div class="card" id="revisionQueue"><div class="section-title"><h3>Spaced Revision</h3><span class="badge">Due now</span></div><div class="empty">Loading revision queue…</div></div></div>`;
};

async function loadAdaptivePractice(){
  if(!state.user)return;
  const mistakeEl=document.getElementById('mistakeNotebook'),revisionEl=document.getElementById('revisionQueue');
  try{
    const now=new Date().toISOString();
    const [m,c,f]=await Promise.all([
      supabase.from('mistakes').select('id,question,user_answer,correct_answer,explanation,topic,review_count,resolved,created_at').eq('user_id',state.user.id).eq('resolved',false).order('created_at',{ascending:false}).limit(10),
      supabase.from('revision_items').select('id,topic,due_at,interval_days,review_count,flashcard_id').eq('user_id',state.user.id).lte('due_at',now).order('due_at',{ascending:true}).limit(10),
      supabase.from('flashcards').select('id,front,back,status,next_review_at,review_count').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(30)
    ]);
    studySolveAdaptive.mistakes=m.data||[];studySolveAdaptive.dueCards=c.data||[];
    mistakeEl.innerHTML=studySolveAdaptive.mistakes.length?`<div class="list">${studySolveAdaptive.mistakes.map(x=>`<div class="list-row" style="align-items:flex-start"><div><strong>${esc(x.topic||'Review mistake')}</strong><div class="muted">${esc(x.question).slice(0,130)}</div><div class="notice" style="margin-top:7px">Correct: ${esc(x.correct_answer)}</div></div><button class="secondary" data-resolve-mistake="${x.id}">Resolved</button></div>`).join('')}</div>`:'<div class="empty">No unresolved mistakes. Great work.</div>';
    revisionEl.innerHTML=studySolveAdaptive.dueCards.length?`<div class="list">${studySolveAdaptive.dueCards.map(x=>`<div class="list-row"><div><strong>${esc(x.topic||'Flashcard review')}</strong><div class="muted">Review ${x.review_count||0} time${Number(x.review_count||0)===1?'':'s'}</div></div><span class="badge">Due</span></div>`).join('')}</div><button class="primary full" style="margin-top:12px" id="openDueFlashcards">Review due cards</button>`:'<div class="empty">No cards are due right now. Your next review will appear here automatically.</div>';
    mistakeEl.querySelectorAll('[data-resolve-mistake]').forEach(b=>b.addEventListener('click',async()=>{await supabase.from('mistakes').update({resolved:true,review_count:Number(studySolveAdaptive.mistakes.find(x=>x.id===b.dataset.resolveMistake)?.review_count||0)+1}).eq('id',b.dataset.resolveMistake);toast('Mistake marked for review history.');loadAdaptivePractice();}));
    document.getElementById('openDueFlashcards')?.addEventListener('click',()=>openDueFlashcards());
    await ensureRevisionItems(f||[]);
  }catch(error){mistakeEl.innerHTML=`<div class="notice">Could not load mistakes. ${esc(error.message||'Please try again.')}</div>`;revisionEl.innerHTML=`<div class="notice">Could not load revision queue. ${esc(error.message||'Please try again.')}</div>`;}
}

async function ensureRevisionItems(cards){
  if(!state.user||!cards.length)return;
  const {data:existing}=await supabase.from('revision_items').select('flashcard_id').eq('user_id',state.user.id);
  const known=new Set((existing||[]).map(x=>x.flashcard_id));
  const missing=cards.filter(c=>!known.has(c.id));
  if(missing.length)await supabase.from('revision_items').insert(missing.map(c=>({user_id:state.user.id,flashcard_id:c.id,topic:'Study Materials',due_at:c.next_review_at||new Date().toISOString(),interval_days:1,ease:2.5,review_count:0})));
}

async function openDueFlashcards(){
  const {data:items}=await supabase.from('revision_items').select('id,flashcard_id,topic,interval_days,review_count').eq('user_id',state.user.id).lte('due_at',new Date().toISOString()).order('due_at',{ascending:true}).limit(10);
  if(!items?.length){toast('No revision cards are due.');return;}
  const ids=items.map(x=>x.flashcard_id).filter(Boolean);const {data:cards}=await supabase.from('flashcards').select('id,front,back').in('id',ids);if(!cards?.length){toast('No flashcard content found for the due items.');return;}
  const runner=document.getElementById('flashcardRunner')||document.querySelector('#page .card:last-child');if(!runner)return;
  runner.classList.remove('hidden');let i=0;
  const render=()=>{const c=cards[i];runner.innerHTML=`<div class="section-title"><h3>Spaced Revision</h3><span class="badge">${i+1}/${cards.length}</span></div><button class="flashcard" id="dueFlip"><strong>${esc(c.front)}</strong><span id="dueBack" class="hidden">${esc(c.back)}</span></button><div style="display:flex;gap:8px;justify-content:center;margin-top:14px"><button class="secondary" id="dueAgain">Again</button><button class="primary" id="dueKnown">Known ✓</button></div>`;document.getElementById('dueFlip').onclick=()=>document.getElementById('dueBack').classList.toggle('hidden');document.getElementById('dueAgain').onclick=()=>finish(true);document.getElementById('dueKnown').onclick=()=>finish(false);};
  const finish=async again=>{const item=items.find(x=>x.flashcard_id===cards[i].id);const old=Number(item?.interval_days||1);const nextInterval=again?1:Math.min(60,Math.max(1,Math.round(old*1.8)));if(item)await supabase.from('revision_items').update({due_at:new Date(Date.now()+nextInterval*86400000).toISOString(),interval_days:nextInterval,review_count:Number(item.review_count||0)+1,last_reviewed_at:new Date().toISOString()}).eq('id',item.id);i++;if(i<cards.length)render();else{runner.innerHTML='<div class="empty"><strong>Revision complete.</strong><br>Your next review has been scheduled.</div>';loadAdaptivePractice();}};
  render();runner.scrollIntoView({behavior:'smooth',block:'start'});
}

const studySolveOriginalRender=render;
render=function studySolveRenderWithProgress(){
  const result=studySolveOriginalRender.apply(this,arguments);
  if(state.page==='progress')setTimeout(loadStudySolveProgress,0);
  return result;
};

function studySolveMetric(values){
  const valid=values.filter(v=>Number.isFinite(v));
  if(!valid.length)return null;
  return Math.round(valid.reduce((a,b)=>a+b,0)/valid.length);
}
function studySolveClamp(v){return Math.max(0,Math.min(100,Number(v)||0));}
function studySolveBar(label,value,description){
  const known=value!==null&&Number.isFinite(value);
  const shown=known?`${value}%`:'No data';
  const width=known?studySolveClamp(value):0;
  return `<div class="mastery-dimension"><div class="mastery-dimension-head"><div><strong>${esc(label)}</strong><div class="muted">${esc(description)}</div></div><strong>${shown}</strong></div><div class="progress-bar"><div class="progress-fill" style="width:${width}%"></div></div></div>`;
}
function studySolveDaysAgo(date){if(!date)return '—';const d=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/86400000));return d===0?'Today':d===1?'Yesterday':`${d} days ago`;}
function studySolveDateKey(date){const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

async function loadStudySolveProgress(){
  const page=document.getElementById('page');
  if(!page||state.page!=='progress'||!state.user)return;
  try{
    const since=new Date(Date.now()-14*86400000).toISOString();
    const [lp,qa,fl,probs,mist,rev,sessions]=await Promise.all([
      supabase.from('learning_progress').select('id,subject,topic,mastery,practice_count,last_studied_at,updated_at').eq('user_id',state.user.id).order('mastery',{ascending:false}).limit(100),
      supabase.from('quiz_answers').select('is_correct,created_at').in('attempt_id',(await supabase.from('quiz_attempts').select('id').eq('user_id',state.user.id).limit(1000)).data?.map(x=>x.id)||[]).limit(2000),
      supabase.from('flashcards').select('id,status,next_review_at,review_count,created_at,updated_at').eq('user_id',state.user.id).limit(500),
      supabase.from('problems').select('id,status,topic,subject,created_at,updated_at').eq('user_id',state.user.id).limit(500),
      supabase.from('mistakes').select('id,topic,resolved,created_at,updated_at').eq('user_id',state.user.id).limit(500),
      supabase.from('revision_items').select('id,topic,due_at,last_reviewed_at,review_count,interval_days,created_at').eq('user_id',state.user.id).limit(500),
      supabase.from('study_sessions').select('id,mode,topic,started_at,ended_at').eq('user_id',state.user.id).gte('started_at',since).order('started_at',{ascending:false}).limit(500)
    ]);
    const errors=[lp,qa,fl,probs,mist,rev,sessions].filter(x=>x.error).map(x=>x.error.message);
    if(errors.length)throw new Error(errors[0]);
    const progress=lp.data||[],answers=qa.data||[],flashcards=fl.data||[],problems=probs.data||[],mistakes=mist.data||[],revisions=rev.data||[],studySessions=sessions.data||[];
    const understanding=studySolveMetric(progress.map(x=>studySolveClamp(x.mastery)));
    const reviewedFlash=flashcards.filter(x=>Number(x.review_count||0)>0||x.status==='known'||x.status==='need_review');
    const recall=reviewedFlash.length?studySolveMetric(reviewedFlash.map(x=>x.status==='known'?100:Number(x.review_count||0)>0?60:0)):null;
    const application=answers.length?Math.round((answers.filter(x=>x.is_correct).length/answers.length)*100):null;
    const problemSolving=problems.length?Math.round((problems.filter(x=>String(x.status).toLowerCase()==='solved').length/problems.length)*100):null;
    const dimensionValues=[understanding,recall,application,problemSolving].filter(v=>v!==null);
    const overall=dimensionValues.length?Math.round(dimensionValues.reduce((a,b)=>a+b,0)/dimensionValues.length):null;
    const weak=progress.filter(x=>Number(x.mastery)<70).sort((a,b)=>Number(a.mastery)-Number(b.mastery));
    const strong=progress.filter(x=>Number(x.mastery)>=80).sort((a,b)=>Number(b.mastery)-Number(a.mastery));
    const unresolved=mistakes.filter(x=>!x.resolved);
    const due=revisions.filter(x=>new Date(x.due_at).getTime()<=Date.now());
    const recentReviews=revisions.filter(x=>x.last_reviewed_at).sort((a,b)=>new Date(b.last_reviewed_at)-new Date(a.last_reviewed_at)).slice(0,8);
    const activity={};studySessions.forEach(s=>{const k=studySolveDateKey(s.started_at);activity[k]=(activity[k]||0)+1;});
    const activityRows=Object.entries(activity).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);
    let nextTitle='Keep building evidence';let nextDetail='Use AI Teacher, practice, or a quiz so StudySolve can measure your learning.';let nextPage='solve';
    if(due.length){nextTitle=`Review ${due.length} due revision item${due.length===1?'':'s'}`;nextDetail='Spaced revision is due now.';nextPage='practice';}
    else if(unresolved.length){nextTitle=`Review ${unresolved.length} unresolved mistake${unresolved.length===1?'':'s'}`;nextDetail=`Start with ${unresolved[0].topic||'your latest mistake'}.`;nextPage='practice';}
    else if(weak.length){nextTitle=`Practice ${weak[0].topic}`;nextDetail=`Current recorded mastery is ${Math.round(Number(weak[0].mastery))}%.`;nextPage='practice';}
    page.innerHTML=`<div class="page-head"><h2>Progress & Mastery</h2><p>Track learning evidence across understanding, recall, application and problem solving.</p></div>
      <div class="hero progress-hero"><div><h2>${overall===null?'Start building your mastery profile':`Overall evidence: ${overall}%`}</h2><p>${overall===null?'Complete a lesson, quiz or practice task. Your dashboard will update from recorded activity.':'This score is derived only from learning evidence currently stored in your StudySolve account.'}</p></div><div class="hero-actions"><button class="primary" id="progressNextAction">Next best action</button></div></div>
      <div class="grid grid-4 progress-stat-grid"><div class="card stat"><span>Topics tracked</span><strong>${progress.length}</strong><span>Recorded topics</span></div><div class="card stat"><span>Weak topics</span><strong>${weak.length}</strong><span>Below 70%</span></div><div class="card stat"><span>Due revision</span><strong>${due.length}</strong><span>Ready now</span></div><div class="card stat"><span>Open mistakes</span><strong>${unresolved.length}</strong><span>Need review</span></div></div>
      <div class="grid grid-2"><div class="card"><div class="section-title"><h3>Learning dimensions</h3><span class="badge">Evidence-based</span></div><div class="mastery-dimensions">${studySolveBar('Understanding',understanding,'Recorded topic mastery from learning progress')}${studySolveBar('Recall',recall,'Flashcard review evidence')}${studySolveBar('Application',application,'Recorded quiz answer accuracy')}${studySolveBar('Problem solving',problemSolving,'Solved vs recorded problems')}</div></div>
      <div class="card"><div class="section-title"><h3>Next best study action</h3><span class="badge">Adaptive</span></div><div class="progress-next"><strong>${esc(nextTitle)}</strong><p class="muted">${esc(nextDetail)}</p><button class="secondary" id="progressNextAction2">Start</button></div></div></div>
      <div class="grid grid-2"><div class="card"><div class="section-title"><h3>Weak topics</h3><span class="badge">Improve</span></div>${weak.length?`<div class="list">${weak.slice(0,8).map(x=>`<div class="list-row"><div><strong>${esc(x.topic)}</strong><div class="muted">${esc(x.subject)} • ${x.practice_count||0} practice</div></div><strong>${Math.round(Number(x.mastery))}%</strong></div>`).join('')}</div>`:'<div class="empty">No weak topics recorded yet.</div>'}</div><div class="card"><div class="section-title"><h3>Strong topics</h3><span class="badge success">Strong</span></div>${strong.length?`<div class="list">${strong.slice(0,8).map(x=>`<div class="list-row"><div><strong>${esc(x.topic)}</strong><div class="muted">${esc(x.subject)}</div></div><strong>${Math.round(Number(x.mastery))}%</strong></div>`).join('')}</div>`:'<div class="empty">No strong topics recorded yet.</div>'}</div></div>
      <div class="grid grid-2"><div class="card"><div class="section-title"><h3>Study activity</h3><span class="badge">Last 14 days</span></div>${activityRows.length?`<div class="list">${activityRows.map(([day,count])=>`<div class="list-row"><span>${day}</span><strong>${count} session${count===1?'':'s'}</strong></div>`).join('')}</div>`:'<div class="empty">No study sessions recorded in the last 14 days.</div>'}</div><div class="card"><div class="section-title"><h3>Revision history</h3><span class="badge">Recent</span></div>${recentReviews.length?`<div class="list">${recentReviews.map(x=>`<div class="list-row"><div><strong>${esc(x.topic||'Study review')}</strong><div class="muted">${studySolveDaysAgo(x.last_reviewed_at)} • ${x.review_count||0} reviews</div></div><span class="badge">${x.interval_days||1}d interval</span></div>`).join('')}</div>`:'<div class="empty">No completed revision reviews recorded yet.</div>'}</div></div>`;
    const go=()=>{state.page=nextPage;render();};document.getElementById('progressNextAction')?.addEventListener('click',go);document.getElementById('progressNextAction2')?.addEventListener('click',go);
  }catch(error){page.innerHTML=`<div class="page-head"><h2>Progress & Mastery</h2><p>We could not load your learning evidence.</p></div><div class="notice">${esc(error.message||'Please try again.')}</div>`;}
}
