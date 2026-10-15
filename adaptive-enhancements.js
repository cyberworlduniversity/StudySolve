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
