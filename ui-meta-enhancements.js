const studySolveOriginalSetPageMeta=typeof setPageMeta==='function'?setPageMeta:null;
setPageMeta=function studySolveSetPageMeta(){
  const meta={dashboard:['STUDYSOLVE','Dashboard'],solve:['AI TEACHER','Solve & Understand'],materials:['STUDY MATERIALS','Your Learning Library'],practice:['PRACTICE','Build Confidence'],programming:['PROGRAMMING LAB','Code & Learn'],progress:['PROGRESS','Mastery & Growth'],planner:['PLANNER','Study Plan'],profile:['ACCOUNT','Profile'],settings:['ACCOUNT','Settings'],history:['YOUR LEARNING','History & Saved'],achievements:['ACHIEVEMENTS','Learning Rewards'],staff:[state.profile?.role==='admin'?'ADMIN':'TEACHER','Workspace']};
  const [eyebrow,title]=meta[state.page]||meta.dashboard;
  const e=document.getElementById('pageEyebrow'),t=document.getElementById('pageTitle');if(e)e.textContent=eyebrow;if(t)t.textContent=title;
  document.querySelectorAll('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===state.page));
};
function addOptionalNav(page,label,icon){
  if(document.querySelector('.nav-item[data-page="'+page+'"]'))return;
  const nav=document.querySelector('.sidebar .nav');if(!nav)return;
  const b=document.createElement('button');b.className='nav-item';b.dataset.page=page;b.innerHTML=icon+' <span>'+label+'</span>';b.addEventListener('click',()=>{state.page=page;document.getElementById('sidebar')?.classList.remove('open');render();});nav.appendChild(b);
}
function studySolveBuildNav(){
  if(state.user){addOptionalNav('history','History & Saved','↺');addOptionalNav('achievements','Achievements','★');}
  if(state.profile?.role==='admin')addOptionalNav('staff','Admin Panel','▦');
  if(state.profile?.role==='teacher')addOptionalNav('staff','Teacher Panel','▦');
}
studySolveBuildNav();
