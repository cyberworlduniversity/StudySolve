function staffNavButton(){
  if(!state.profile || !['admin','teacher'].includes(state.profile.role)) return;
  if(document.querySelector('.nav-item[data-page="staff"]')) return;
  const nav=document.querySelector('.sidebar .nav'); if(!nav)return;
  const b=document.createElement('button');b.className='nav-item';b.dataset.page='staff';b.innerHTML='▦ <span>'+ (state.profile.role==='admin'?'Admin Panel':'Teacher Panel') +'</span>';
  b.addEventListener('click',()=>{state.page='staff';document.getElementById('sidebar')?.classList.remove('open');render();});nav.appendChild(b);
}
staffNavButton();

function staffPage(){
 const admin=state.profile?.role==='admin';
 return `<div class="page-head"><h2>${admin?'Admin Control Center':'Teacher Workspace'}</h2><p>StudySolve is AI-first. Questions, answers, explanations, practice content and problem solving are generated dynamically by the AI engine. Staff do not maintain a manual question bank.</p></div>
 <div class="grid grid-4"><div class="card stat"><span>Role</span><strong>${esc(state.profile?.role||'')}</strong><span>Server-authorized</span></div><div class="card stat"><span>Students</span><strong id="staffStudents">—</strong><span>Registered learners</span></div><div class="card stat"><span>AI interactions</span><strong id="staffAI">—</strong><span>Teacher conversations</span></div><div class="card stat"><span>Materials</span><strong id="staffMaterials">—</strong><span>Student resources</span></div></div>
 <div class="grid grid-2"><div class="card"><span class="eyebrow">AI CONTENT ENGINE</span><h3>Automatic academic content</h3><div class="list"><div class="list-row"><span>Student questions</span><span class="badge success">AI</span></div><div class="list-row"><span>Problem solving</span><span class="badge success">AI</span></div><div class="list-row"><span>Answer checking</span><span class="badge success">AI</span></div><div class="list-row"><span>Practice questions</span><span class="badge success">AI</span></div><div class="list-row"><span>Exam revision</span><span class="badge success">AI</span></div></div></div>
 <div class="card"><h3>Learning subjects</h3><div id="staffSubjectList" class="list"><div class="empty">Loading subjects…</div></div></div></div>
 <div class="card"><h3>Security boundary</h3><p class="muted">Staff permissions remain server-enforced with Supabase RLS. The staff panel is for monitoring and administration; it does not create the academic answer bank.</p></div>`;
}

async function loadStaff(){
 if(!state.user||!['admin','teacher'].includes(state.profile?.role))return;
 const [users,ai,materials,subjects]=await Promise.all([
   supabase.from('profiles').select('id').limit(1000),
   supabase.from('ai_teacher_messages').select('id').limit(1000),
   supabase.from('study_materials').select('id').limit(1000),
   supabase.from('subjects').select('id,name,description').order('name')
 ]);
 document.getElementById('staffStudents').textContent=users.data?.length??0;
 document.getElementById('staffAI').textContent=ai.data?.length??0;
 document.getElementById('staffMaterials').textContent=materials.data?.length??0;
 document.getElementById('staffSubjectList').innerHTML=subjects.data?.length?subjects.data.map(s=>`<div class="list-row"><div><strong>${esc(s.name)}</strong><div class="muted">${esc(s.description||'')}</div></div></div>`).join(''):'<div class="empty">No subjects.</div>';
}

const staffOriginalRender=render;
render=async function staffRender(){
 staffNavButton();
 if(state.page==='staff'){
   if(!state.user||!['admin','teacher'].includes(state.profile?.role)){toast('Staff access required.');state.page='dashboard';return staffOriginalRender.apply(this,arguments);}
   pageEl.innerHTML=staffPage();setPageMeta();
   await loadStaff();return;
 }
 return staffOriginalRender.apply(this,arguments);
};
