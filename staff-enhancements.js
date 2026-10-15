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
 return `<div class="page-head"><h2>${admin?'Admin Control Center':'Teacher Workspace'}</h2><p>${admin?'Manage learning content and monitor the platform.':'Create and maintain learning questions for your students.'}</p></div>
 <div class="grid grid-4"><div class="card stat"><span>Role</span><strong>${esc(state.profile?.role||'')}</strong><span>Server-authorized</span></div><div class="card stat"><span>Students</span><strong id="staffStudents">—</strong><span>Registered learners</span></div><div class="card stat"><span>Questions</span><strong id="staffQuestions">—</strong><span>Learning bank</span></div><div class="card stat"><span>Materials</span><strong id="staffMaterials">—</strong><span>Uploaded resources</span></div></div>
 <div class="grid grid-2"><div class="card"><div class="section-title"><h3>Question bank</h3><button class="primary" id="newStaffQuestion">Add question</button></div><div id="staffQuestionList" class="list"><div class="empty">Loading questions…</div></div></div>
 <div class="card"><h3>Learning subjects</h3><div id="staffSubjectList" class="list"><div class="empty">Loading subjects…</div></div></div></div>
 <div class="card"><h3>Security boundary</h3><p class="muted">This panel is only a user interface. Database RLS enforces the ${admin?'admin':'teacher'} permissions server-side, so changing the browser UI cannot grant extra privileges.</p></div>`;
}

async function loadStaff(){
 if(!state.user||!['admin','teacher'].includes(state.profile?.role))return;
 const [users,questions,materials,subjects]=await Promise.all([
   supabase.from('profiles').select('id').limit(1000),
   supabase.from('questions').select('id,question,question_type,difficulty,marks,created_at,created_by').order('created_at',{ascending:false}).limit(30),
   supabase.from('study_materials').select('id').limit(1000),
   supabase.from('subjects').select('id,name,description').order('name')
 ]);
 document.getElementById('staffStudents').textContent=users.data?.length??0;
 document.getElementById('staffQuestions').textContent=questions.data?.length??0;
 document.getElementById('staffMaterials').textContent=materials.data?.length??0;
 const qEl=document.getElementById('staffQuestionList');
 qEl.innerHTML=questions.data?.length?questions.data.map(q=>`<div class="list-row"><div><strong>${esc(q.question).slice(0,100)}</strong><div class="muted">${esc(q.question_type)} • ${esc(q.difficulty)} • ${q.marks} mark${q.marks==1?'':'s'}</div></div><span class="badge">${q.created_by===state.user.id?'Mine':'Shared'}</span></div>`).join(''):'<div class="empty">No questions yet.</div>';
 document.getElementById('staffSubjectList').innerHTML=subjects.data?.length?subjects.data.map(s=>`<div class="list-row"><div><strong>${esc(s.name)}</strong><div class="muted">${esc(s.description||'')}</div></div></div>`).join(''):'<div class="empty">No subjects.</div>';
}

async function addStaffQuestion(){
 const question=prompt('Question text?')?.trim(); if(!question)return;
 const type=prompt('Type: mcq, true_false, short_answer', 'mcq')?.trim()||'mcq';
 const answer=prompt('Correct answer?')?.trim()||'';
 const explanation=prompt('Short explanation?')?.trim()||'';
 const {error}=await supabase.from('questions').insert({question,question_type:type,correct_answer:answer,explanation,difficulty:'beginner',marks:1,created_by:state.user.id});
 if(error)toast(error.message);else{toast('Question added.');loadStaff();}
}

const staffOriginalRender=render;
render=async function staffRender(){
 staffNavButton();
 if(state.page==='staff'){
   if(!state.user||!['admin','teacher'].includes(state.profile?.role)){toast('Staff access required.');state.page='dashboard';return staffOriginalRender.apply(this,arguments);}
   pageEl.innerHTML=staffPage();setPageMeta();
   document.getElementById('newStaffQuestion')?.addEventListener('click',addStaffQuestion);
   await loadStaff();return;
 }
 return staffOriginalRender.apply(this,arguments);
};
