const studySolveProgramming={language:'javascript',topic:'variables',challengeId:'',challenge:null,code:'',output:'',status:'idle',history:[]};

function programmingPage(){
  return `<div class="page-head"><h2>Programming Lab</h2><p>Learn → Example → Challenge → Write → Run → Check → Hint → Retry.</p></div>
  <div class="grid grid-2 programming-layout">
    <div class="card">
      <div class="section-title"><h3>1. Choose your lab</h3><span class="badge">Secure learning</span></div>
      <div class="form-grid">
        <div class="field"><label for="progLanguage">Language</label><select id="progLanguage"><option value="javascript">JavaScript</option><option value="python">Python</option><option value="c">C</option><option value="cpp">C++</option><option value="java">Java</option></select></div>
        <div class="field"><label for="progTopic">Topic</label><select id="progTopic"><option value="variables">Variables & Data Types</option></select></div>
        <div class="field full-row"><label for="progChallenge">Challenge</label><select id="progChallenge"><option>Loading challenges…</option></select></div>
      </div>
      <div id="progChallengeInfo" class="notice" style="margin-top:14px">Choose a challenge to begin.</div>
    </div>
    <div class="card">
      <div class="section-title"><h3>2. Learning cycle</h3><span class="badge success">Practice</span></div>
      <div class="list"><div class="list-row"><span>Learn</span><span class="badge">Concept</span></div><div class="list-row"><span>Example</span><span class="badge">Understand</span></div><div class="list-row"><span>Challenge</span><span class="badge">Apply</span></div><div class="list-row"><span>Check</span><span class="badge">Feedback</span></div></div>
      <div class="notice" style="margin-top:14px">The website currently runs JavaScript challenges locally with a short time limit. Python/C/C++/Java submissions are saved for the future secure server sandbox; they are not executed directly in the browser.</div>
    </div>
  </div>
  <div class="card programming-editor-card">
    <div class="section-title"><h3>3. Write your solution</h3><span id="progStatus" class="badge">Ready</span></div>
    <textarea id="progCode" class="code-editor" spellcheck="false" aria-label="Programming code"></textarea>
    <div class="programming-actions"><button class="primary" id="runCodeButton">▶ Run & Check</button><button class="secondary" id="hintCodeButton">💡 Give me a hint</button><button class="secondary" id="explainCodeButton">✦ Explain my code</button><button class="secondary" id="resetCodeButton">↺ Reset</button></div>
    <div class="grid grid-2" style="margin-top:16px"><div><h4>Output</h4><pre id="progOutput" class="code-output">Your output will appear here.</pre></div><div><h4>Teacher feedback</h4><div id="progFeedback" class="feedback-box">Try the challenge, then StudySolve will help you improve.</div></div></div>
  </div>
  <div class="card"><div class="section-title"><h3>Submission history</h3><span class="badge">Your account</span></div><div id="progHistory" class="list"><div class="empty">Loading submissions…</div></div></div>`;
}

function ensureProgrammingNav(){
  const nav=document.querySelector('.nav');
  if(!nav||nav.querySelector('[data-page="programming"]'))return;
  const b=document.createElement('button');b.className='nav-item';b.dataset.page='programming';b.innerHTML='⌘ <span>Programming Lab</span>';b.addEventListener('click',()=>{state.page='programming';document.getElementById('sidebar')?.classList.remove('open');render();});
  const practice=nav.querySelector('[data-page="practice"]');practice?.after(b);
}

function programmingSetMeta(){
  document.getElementById('pageEyebrow').textContent='PROGRAMMING LAB';
  document.getElementById('pageTitle').textContent='Programming Lab';
  document.querySelectorAll('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='programming'));
}

async function loadProgrammingTopics(){
  const topicEl=document.getElementById('progTopic');if(!topicEl)return;
  const {data,error}=await supabase.from('programming_topics').select('id,name,slug,difficulty,sort_order,programming_languages!inner(slug)').eq('programming_languages.slug',studySolveProgramming.language).order('sort_order');
  if(error){topicEl.innerHTML='<option value="variables">Variables & Data Types</option>';return;}
  topicEl.innerHTML=(data||[]).map(t=>`<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join('')||'<option value="variables">Variables & Data Types</option>';
  studySolveProgramming.topic=topicEl.value;
  await loadProgrammingChallenges();
}

async function loadProgrammingChallenges(){
  const challengeEl=document.getElementById('progChallenge');if(!challengeEl)return;
  const {data,error}=await supabase.from('programming_challenges').select('id,title,prompt,starter_code,expected_output,difficulty,programming_topics!inner(slug,programming_languages!inner(slug))').eq('programming_topics.slug',studySolveProgramming.topic).eq('programming_topics.programming_languages.slug',studySolveProgramming.language).order('created_at');
  if(error){challengeEl.innerHTML='<option value="">No challenge data</option>';document.getElementById('progChallengeInfo').textContent='Challenge data could not be loaded. '+(error.message||'');return;}
  challengeEl.innerHTML=(data||[]).map(c=>`<option value="${c.id}">${esc(c.title)} • ${esc(c.difficulty)}</option>`).join('')||'<option value="">No challenges yet</option>';
  studySolveProgramming.challengeId=challengeEl.value;
  studySolveProgramming.challenge=(data||[]).find(x=>x.id===challengeEl.value)||null;
  applyProgrammingChallenge();
}

function applyProgrammingChallenge(){
  const c=studySolveProgramming.challenge;if(!c)return;
  const code=document.getElementById('progCode');const info=document.getElementById('progChallengeInfo');
  info.innerHTML=`<strong>${esc(c.title)}</strong><br>${esc(c.prompt)}${c.expected_output?`<br><br><span class="muted">Expected example output: ${esc(c.expected_output)}</span>`:''}`;
  if(code&&!studySolveProgramming.code)code.value=c.starter_code||'';
  document.getElementById('progStatus').textContent='Ready';
}

async function runJavascript(code){
  return new Promise(resolve=>{
    const started=performance.now();let finished=false;
    const workerCode=`self.onmessage=async e=>{try{const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;const fn=new AsyncFunction('console',e.data);let out=[];const c={log:(...a)=>out.push(a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')),error:(...a)=>out.push('ERROR: '+a.join(' ')),warn:(...a)=>out.push('WARN: '+a.join(' '))};await fn(c);self.postMessage({ok:true,output:out.join('\\n')||'(no console output)'})}catch(err){self.postMessage({ok:false,error:err?.message||String(err)})}};`;
    const blob=new Blob([workerCode],{type:'text/javascript'});const worker=new Worker(URL.createObjectURL(blob));
    const timer=setTimeout(()=>{if(finished)return;finished=true;worker.terminate();resolve({ok:false,error:'Execution timed out after 2 seconds.',ms:Math.round(performance.now()-started)});},2000);
    worker.onmessage=e=>{if(finished)return;finished=true;clearTimeout(timer);worker.terminate();resolve({...e.data,ms:Math.round(performance.now()-started)});};worker.onerror=e=>{if(finished)return;finished=true;clearTimeout(timer);worker.terminate();resolve({ok:false,error:e.message||'Worker execution failed.',ms:Math.round(performance.now()-started)});};worker.postMessage(code);
  });
}

async function saveSubmission(result){
  if(!state.user)return;
  const c=studySolveProgramming.challenge;
  const {error}=await supabase.from('code_submissions').insert({user_id:state.user.id,challenge_id:c?.id||null,language:studySolveProgramming.language,code:document.getElementById('progCode')?.value||'',status:result.ok?'passed':'failed',output:result.output||null,error_message:result.error||null,execution_ms:result.ms||null});
  if(error)console.error(error);
  loadProgrammingHistory();
}

async function runProgrammingCode(){
  const output=document.getElementById('progOutput'),feedback=document.getElementById('progFeedback'),status=document.getElementById('progStatus');
  const code=document.getElementById('progCode').value; if(!code.trim()){toast('Write some code first.');return;}
  status.textContent='Running…';output.textContent='Running…';feedback.textContent='Checking your attempt…';
  if(studySolveProgramming.language!=='javascript'){
    const result={ok:false,error:`${studySolveProgramming.language} execution requires the secure server sandbox, which is not enabled yet.`};output.textContent=result.error;feedback.textContent='Your code was not executed. It can still be saved for later server-side execution.';status.textContent='Saved only';await saveSubmission(result);return;
  }
  const result=await runJavascript(code);output.textContent=result.ok?result.output:result.error;status.textContent=result.ok?'Passed':'Needs work';feedback.textContent=result.ok?'Good execution. Compare your output with the challenge and improve the solution if needed.':`Check this issue: ${result.error}`;await saveSubmission(result);
}

async function askProgrammingTeacher(kind){
  const code=document.getElementById('progCode')?.value||'';const c=studySolveProgramming.challenge;if(!state.user){showAuth(true);return;}if(!code.trim()){toast('Write your code first.');return;}
  const feedback=document.getElementById('progFeedback');feedback.textContent='AI Teacher is analyzing your code…';
  try{const prompt=kind==='hint'?`Give one progressive hint, not the full solution, for this programming challenge. Challenge: ${c?.prompt||''}\nStudent code:\n${code}`:`Explain this student code simply, identify the main issue if any, and suggest one next improvement. Challenge: ${c?.prompt||''}\nStudent code:\n${code}`;const {data,error}=await supabase.functions.invoke('ai-teacher',{body:{message:prompt,topic:`Programming Lab: ${c?.title||studySolveProgramming.topic}`,language:'English',phase:kind==='hint'?'hint':'check',mastery:0,history:[]}});if(error)throw error;feedback.textContent=data?.reply||data?.message||data?.answer||'AI Teacher returned no feedback.';}catch(e){feedback.textContent=`AI Teacher could not respond. ${e.message||'Please try again.'}`;}}

async function loadProgrammingHistory(){
  const el=document.getElementById('progHistory');if(!el||!state.user)return;
  const {data,error}=await supabase.from('code_submissions').select('id,language,status,execution_ms,created_at,programming_challenges(title)').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(8);
  if(error){el.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return;}
  el.innerHTML=data?.length?data.map(x=>`<div class="list-row"><div><strong>${esc(x.programming_challenges?.title||'Code submission')}</strong><div class="muted">${esc(x.language)} • ${x.execution_ms??'—'} ms • ${new Date(x.created_at).toLocaleString()}</div></div><span class="badge ${x.status==='passed'?'success':''}">${esc(x.status)}</span></div>`).join(''):'<div class="empty">No submissions yet.</div>';
}

function bindProgrammingLab(){
  ensureProgrammingNav();programmingSetMeta();
  const lang=document.getElementById('progLanguage'),topic=document.getElementById('progTopic'),challenge=document.getElementById('progChallenge'),code=document.getElementById('progCode');
  if(!lang)return;
  lang.value=studySolveProgramming.language;
  lang.onchange=async()=>{studySolveProgramming.language=lang.value;studySolveProgramming.code='';await loadProgrammingTopics();};
  topic.onchange=async()=>{studySolveProgramming.topic=topic.value;studySolveProgramming.code='';await loadProgrammingChallenges();};
  challenge.onchange=()=>{studySolveProgramming.challengeId=challenge.value;studySolveProgramming.challenge=null;loadProgrammingChallenges();};
  document.getElementById('runCodeButton').onclick=runProgrammingCode;
  document.getElementById('hintCodeButton').onclick=()=>askProgrammingTeacher('hint');
  document.getElementById('explainCodeButton').onclick=()=>askProgrammingTeacher('explain');
  document.getElementById('resetCodeButton').onclick=()=>{code.value=studySolveProgramming.challenge?.starter_code||'';document.getElementById('progOutput').textContent='Your output will appear here.';document.getElementById('progFeedback').textContent='Try the challenge again.';};
  loadProgrammingTopics();loadProgrammingHistory();
}

ensureProgrammingNav();
const studySolveProgrammingOriginalRender=render;
render=function studySolveProgrammingRender(){
  if(state.page==='programming'){
    if(!state.user){showAuth(true);state.page='dashboard';return studySolveProgrammingOriginalRender.apply(this,arguments);}
    pageEl.innerHTML=programmingPage();bindProgrammingLab();return;
  }
  return studySolveProgrammingOriginalRender.apply(this,arguments);
};
if(state.page==='programming')render();
