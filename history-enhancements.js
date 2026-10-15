const studySolveHistory = { loaded:false };

function historyNavButton(){
  if(document.querySelector('.nav-item[data-page="history"]')) return;
  const nav=document.querySelector('.sidebar .nav');
  if(!nav) return;
  const b=document.createElement('button');
  b.className='nav-item';
  b.dataset.page='history';
  b.innerHTML='↺ <span>History & Saved</span>';
  b.addEventListener('click',()=>{state.page='history';document.getElementById('sidebar')?.classList.remove('open');render();});
  nav.appendChild(b);
}
historyNavButton();

function historyPage(){
  if(!state.user) return `<div class="hero"><div><h2>Your learning history</h2><p>Sign in to see your conversations, practice, materials, saved topics and bookmarks.</p></div><button class="primary" data-action="open-auth">Sign in</button></div>`;
  return `<div class="page-head"><h2>History & Saved</h2><p>Your learning journey in one place — continue, revise, save and return anytime.</p></div>
  <div class="grid grid-3 history-summary"><div class="card stat"><span>Recent activity</span><strong id="historyCount">—</strong><span>Learning events</span></div><div class="card stat"><span>Saved topics</span><strong id="savedTopicCount">—</strong><span>Topics to revisit</span></div><div class="card stat"><span>Bookmarks</span><strong id="bookmarkCount">—</strong><span>Quick references</span></div></div>
  <div class="grid grid-2"><div class="card"><div class="section-title"><h3>Next best actions</h3><button class="text-button" id="refreshRecommendations">Refresh</button></div><div id="recommendations" class="list"><div class="empty">Building recommendations…</div></div></div>
  <div class="card"><div class="section-title"><h3>Saved topics</h3><button class="secondary" id="addSavedTopic">Save topic</button></div><div id="savedTopics" class="list"><div class="empty">Loading saved topics…</div></div></div></div>
  <div class="grid grid-2"><div class="card"><div class="section-title"><h3>Bookmarks</h3><span class="badge">Private</span></div><div id="bookmarks" class="list"><div class="empty">Loading bookmarks…</div></div></div>
  <div class="card"><div class="section-title"><h3>Recent learning</h3><button class="text-button" id="refreshHistory">Refresh</button></div><div id="historyList" class="list"><div class="empty">Loading history…</div></div></div></div>`;
}

function recommendationForData(data){
  const out=[];
  const due=(data.revision||[]).filter(x=>new Date(x.due_at)<=new Date());
  if(due.length) out.push({title:`Review ${due.length} due revision item${due.length>1?'s':''}`,detail:'Spaced revision is due now. Reviewing it helps prevent forgetting.',page:'practice',action:'Review now'});
  const weak=(data.progress||[]).filter(x=>Number(x.mastery)<70).sort((a,b)=>Number(a.mastery)-Number(b.mastery))[0];
  if(weak) out.push({title:`Practice ${weak.topic}`,detail:`Mastery is ${Math.round(Number(weak.mastery))}%. A short practice session is the fastest next step.`,page:'practice',action:'Practice'});
  const incomplete=(data.plans||[]).find(x=>x.status==='planned' || x.status==='in_progress');
  if(incomplete) out.push({title:`Continue ${incomplete.title}`,detail:`${incomplete.estimated_minutes} minute study task planned for ${incomplete.plan_date}.`,page:'planner',action:'Continue'});
  const recent=data.sessions?.[0];
  if(recent) out.push({title:`Continue ${recent.topic||'your last lesson'}`,detail:'Your latest learning session is ready to continue with the AI Teacher.',page:'solve',action:'Continue'});
  if(!out.length) out.push({title:'Start a focused learning session',detail:'Choose one topic you want to understand, practice or master today.',page:'solve',action:'Start'});
  return out.slice(0,4);
}

async function loadHistoryData(){
  if(!state.user) return {};
  const uid=state.user.id;
  const queries=await Promise.all([
    supabase.from('problems').select('id,question,subject,topic,status,category,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(12),
    supabase.from('study_sessions').select('id,mode,topic,started_at,ended_at,teacher_phase,teacher_mastery').eq('user_id',uid).order('started_at',{ascending:false}).limit(12),
    supabase.from('ai_teacher_messages').select('id,session_id,role,content,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(12),
    supabase.from('study_materials').select('id,title,file_name,status,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(12),
    supabase.from('quiz_attempts').select('id,title,score,total,completed_at,created_at').eq('user_id',uid).order('completed_at',{ascending:false}).limit(12),
    supabase.from('focus_sessions').select('id,mode,planned_minutes,started_at,ended_at,completed,topic').eq('user_id',uid).order('started_at',{ascending:false}).limit(12),
    supabase.from('study_plans').select('id,title,plan_date,subject,topic,estimated_minutes,priority,status,source,created_at,completed_at').eq('user_id',uid).order('plan_date',{ascending:true}).limit(12),
    supabase.from('learning_progress').select('id,subject,topic,mastery,practice_count,last_studied_at').eq('user_id',uid).order('mastery',{ascending:true}).limit(12),
    supabase.from('revision_items').select('id,topic,due_at,interval_days,review_count').eq('user_id',uid).order('due_at',{ascending:true}).limit(30),
    supabase.from('saved_topics').select('id,subject,topic,notes,source,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(30),
    supabase.from('bookmarks').select('id,kind,ref_id,title,subtitle,payload,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(30)
  ]);
  const names=['problems','sessions','messages','materials','quizzes','focus','plans','progress','revision','saved','bookmarks'];
  const data={};
  queries.forEach((q,i)=>{if(q.error) console.warn(`StudySolve ${names[i]} query failed`,q.error);data[names[i]]=q.data||[];});
  return data;
}

function historyTime(v){try{return new Date(v).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});}catch{return String(v||'');}}

async function renderHistory(){
  if(!state.user) return;
  const data=await loadHistoryData();
  const set=(id,html)=>{const el=document.getElementById(id);if(el)el.innerHTML=html;};
  document.getElementById('historyCount').textContent=String((data.problems.length+data.sessions.length+data.quizzes.length+data.focus.length+data.materials.length));
  document.getElementById('savedTopicCount').textContent=String(data.saved.length);
  document.getElementById('bookmarkCount').textContent=String(data.bookmarks.length);
  const recs=recommendationForData(data);
  set('recommendations',recs.map(r=>`<div class="list-row recommendation-row"><div><strong>${esc(r.title)}</strong><div class="muted">${esc(r.detail)}</div></div><button class="secondary" data-rec-page="${esc(r.page)}">${esc(r.action)}</button></div>`).join(''));
  document.querySelectorAll('[data-rec-page]').forEach(b=>b.addEventListener('click',()=>{state.page=b.dataset.recPage;render();}));
  set('savedTopics',data.saved.length?data.saved.map(x=>`<div class="list-row"><div><strong>${esc(x.topic)}</strong><div class="muted">${esc(x.subject||'General')} • ${esc(x.source||'saved')}</div></div><button class="danger" data-remove-topic="${x.id}">Remove</button></div>`).join(''):'<div class="empty">No saved topics yet.</div>');
  document.querySelectorAll('[data-remove-topic]').forEach(b=>b.addEventListener('click',async()=>{const {error}=await supabase.from('saved_topics').delete().eq('id',b.dataset.removeTopic).eq('user_id',state.user.id);if(error)toast(error.message);else{toast('Topic removed.');renderHistory();}}));
  set('bookmarks',data.bookmarks.length?data.bookmarks.map(x=>`<div class="list-row"><div><strong>${esc(x.title)}</strong><div class="muted">${esc(x.subtitle||x.kind)}</div></div><button class="danger" data-remove-bookmark="${x.id}">Remove</button></div>`).join(''):'<div class="empty">No bookmarks yet.</div>');
  document.querySelectorAll('[data-remove-bookmark]').forEach(b=>b.addEventListener('click',async()=>{const {error}=await supabase.from('bookmarks').delete().eq('id',b.dataset.removeBookmark).eq('user_id',state.user.id);if(error)toast(error.message);else{toast('Bookmark removed.');renderHistory();}}));
  const events=[
    ...data.problems.map(x=>({date:x.created_at,title:`Problem: ${x.question}`,meta:`${x.topic||x.subject||x.category||'General'} • ${x.status}`,page:'solve'})),
    ...data.sessions.map(x=>({date:x.started_at,title:`AI Teacher: ${x.topic||'Learning session'}`,meta:`${x.teacher_phase||x.mode} • ${x.teacher_mastery||0}% mastery`,page:'solve'})),
    ...data.materials.map(x=>({date:x.created_at,title:`Material: ${x.title}`,meta:`${x.file_name} • ${x.status}`,page:'materials'})),
    ...data.quizzes.map(x=>({date:x.completed_at,title:`Quiz: ${x.title}`,meta:`${x.score}/${x.total}`,page:'practice'})),
    ...data.focus.map(x=>({date:x.started_at,title:`Focus: ${x.topic||x.mode}`,meta:`${x.planned_minutes} min • ${x.completed?'Completed':'Not completed'}`,page:'planner'})),
    ...data.plans.map(x=>({date:x.created_at,title:`Plan: ${x.title}`,meta:`${x.plan_date} • ${x.status}`,page:'planner'}))
  ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,18);
  set('historyList',events.length?events.map(x=>`<div class="list-row history-row"><div><strong>${esc(x.title).slice(0,100)}</strong><div class="muted">${esc(x.meta)} • ${esc(historyTime(x.date))}</div></div><button class="text-button" data-history-page="${esc(x.page)}">Open</button></div>`).join(''):'<div class="empty">Your learning activity will appear here.</div>');
  document.querySelectorAll('[data-history-page]').forEach(b=>b.addEventListener('click',()=>{state.page=b.dataset.historyPage;render();}));
}

async function saveCurrentTopic(){
  if(!state.user)return showAuth(true);
  const topic=prompt('Topic to save?',state.solve?.topic||'')?.trim();
  if(!topic)return;
  const subject=prompt('Subject?',state.solve?.subject||'')?.trim()||null;
  const {error}=await supabase.from('saved_topics').upsert({user_id:state.user.id,subject,topic,source:'manual'},{onConflict:'user_id,subject,topic'});
  if(error)toast(error.message);else{toast('Topic saved.');renderHistory();}
}

const studySolveHistoryOriginalRender=render;
render=async function studySolveHistoryRender(){
  historyNavButton();
  if(state.page==='history'){
    if(!state.user){showAuth(true);state.page='dashboard';return studySolveHistoryOriginalRender.apply(this,arguments);}
    pageEl.innerHTML=historyPage();
    document.getElementById('pageEyebrow').textContent='YOUR LEARNING';
    document.getElementById('pageTitle').textContent='History & Saved';
    document.querySelectorAll('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='history'));
    document.getElementById('addSavedTopic')?.addEventListener('click',saveCurrentTopic);
    document.getElementById('refreshHistory')?.addEventListener('click',renderHistory);
    document.getElementById('refreshRecommendations')?.addEventListener('click',renderHistory);
    await renderHistory();
    return;
  }
  return studySolveHistoryOriginalRender.apply(this,arguments);
};

const studySolveHistoryOriginalDashboard=dashboard;
dashboard=async function studySolveHistoryDashboard(){
  const base=await studySolveHistoryOriginalDashboard.apply(this,arguments);
  if(!state.user)return base;
  return `${base}<div class="card recommendation-dashboard"><div class="section-title"><h3>Next Best Study Action</h3><button class="text-button" data-page="history">View history</button></div><div id="dashboardRecommendation" class="muted">Finding the most useful next step…</div></div>`;
};

async function loadDashboardRecommendation(){
  if(state.page!=='dashboard'||!state.user)return;
  const el=document.getElementById('dashboardRecommendation');if(!el)return;
  const data=await loadHistoryData();const r=recommendationForData(data)[0];
  el.innerHTML=`<strong>${esc(r.title)}</strong><br><span class="muted">${esc(r.detail)}</span><br><button class="primary" style="margin-top:10px" id="dashboardRecAction">${esc(r.action)}</button>`;
  document.getElementById('dashboardRecAction')?.addEventListener('click',()=>{state.page=r.page;render();});
}
const studySolveHistoryDashboardRender=render;
render=async function studySolveHistoryDashboardRender(){const result=await studySolveHistoryDashboardRender.apply(this,arguments);if(state.page==='dashboard'&&state.user)setTimeout(loadDashboardRecommendation,0);return result;};
