const studySolveQuiz={active:null,flashcards:[],mode:'practice'};

const originalPracticePage=practicePage;
practicePage=function enhancedPracticePage(){
  const base=originalPracticePage();
  setTimeout(()=>loadStudySolveLearning(),0);
  return `${base}<div class="card" id="generatedLearning"><div class="section-title"><h3>Generated Learning</h3><span class="badge">From your materials</span></div><div id="generatedLearningList" class="empty">Loading generated quizzes and flashcards…</div></div><div class="card hidden" id="quizRunner"></div><div class="card hidden" id="flashcardRunner"></div>`;
};

async function loadStudySolveLearning(){
  const el=document.getElementById('generatedLearningList');
  if(!el||!state.user)return;
  const {data,error}=await supabase.from('study_material_transformations').select('id,material_id,transform_type,output_text,output_json,created_at').eq('user_id',state.user.id).eq('status','completed').in('transform_type',['quiz','flashcards']).order('created_at',{ascending:false}).limit(12);
  if(error){el.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return;}
  const rows=data||[];
  if(!rows.length){el.innerHTML='<div class="empty">Create a Quiz or Flashcards from Study Materials to see them here.</div>';return;}
  el.innerHTML=`<div class="list">${rows.map(row=>{const title=row.output_json?.title||`${row.transform_type==='quiz'?'Quiz':'Flashcards'} • ${new Date(row.created_at).toLocaleDateString()}`;return `<div class="list-row"><div><strong>${esc(title)}</strong><div class="muted">${row.transform_type==='quiz'?'Practice and save mistakes':'Review with spaced practice'}</div></div><button class="secondary" data-learning-open="${row.id}">${row.transform_type==='quiz'?'Start quiz':'Review cards'}</button></div>`;}).join('')}</div>`;
  el.querySelectorAll('[data-learning-open]').forEach(btn=>btn.addEventListener('click',()=>openGeneratedLearning(btn.dataset.learningOpen,rows)));
}

async function openGeneratedLearning(id,rows){
  const row=rows.find(x=>x.id===id);if(!row)return;
  if(row.transform_type==='quiz')startGeneratedQuiz(row);else startGeneratedFlashcards(row);
}

function normalizeQuiz(row){
  let data=row.output_json;
  if(!data&&row.output_text){try{data=JSON.parse(row.output_text);}catch{const match=row.output_text.match(/\{[\s\S]*\}/);if(match)try{data=JSON.parse(match[0]);}catch{}}}
  const questions=Array.isArray(data?.questions)?data.questions.filter(q=>q&&q.question&&Array.isArray(q.options)&&q.options.length>=2&&q.answer):[];
  return {title:data?.title||'StudySolve Quiz',questions:questions.slice(0,20)};
}

function startGeneratedQuiz(row){
  const quiz=normalizeQuiz(row);if(!quiz.questions.length){toast('This quiz needs to be regenerated as structured quiz data.');return;}
  studySolveQuiz.active={row,quiz,index:0,answers:[],startedAt:Date.now()};
  document.getElementById('generatedLearning')?.classList.add('hidden');
  const runner=document.getElementById('quizRunner');runner.classList.remove('hidden');renderQuizQuestion();runner.scrollIntoView({behavior:'smooth',block:'start'});
}

function renderQuizQuestion(){
  const r=document.getElementById('quizRunner'),a=studySolveQuiz.active;if(!r||!a)return;
  const q=a.quiz.questions[a.index],pct=Math.round((a.index/a.quiz.questions.length)*100);
  r.innerHTML=`<div class="section-title"><div><span class="muted">${esc(a.quiz.title)}</span><h3>Question ${a.index+1} of ${a.quiz.questions.length}</h3></div><span class="badge">${pct}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><div style="margin-top:18px"><p style="font-size:1.08rem;font-weight:700">${esc(q.question)}</p><div class="category-grid">${q.options.map((o,i)=>`<button type="button" class="category" data-quiz-option="${i}">${esc(o)}</button>`).join('')}</div></div>`;
  r.querySelectorAll('[data-quiz-option]').forEach(btn=>btn.addEventListener('click',()=>answerQuiz(q,Number(btn.dataset.quizOption),btn.textContent)));
}

function answerQuiz(q,index,selected){
  const a=studySolveQuiz.active;if(!a)return;const options=q.options||[];const chosen=options[index]||selected;const correct=String(chosen).trim()===String(q.answer).trim();a.answers.push({question:q.question,selected_answer:chosen,correct_answer:q.answer,is_correct:correct,explanation:q.explanation||''});
  const buttons=document.querySelectorAll('#quizRunner [data-quiz-option]');buttons.forEach(b=>b.disabled=true);
  const r=document.getElementById('quizRunner');const feedback=document.createElement('div');feedback.className='notice';feedback.style.marginTop='14px';feedback.innerHTML=`<strong>${correct?'Correct ✓':'Not quite'}</strong><div>${esc(q.explanation||`Correct answer: ${q.answer}`)}</div>`;r.appendChild(feedback);
  setTimeout(()=>{a.index++;if(a.index<a.quiz.questions.length)renderQuizQuestion();else finishGeneratedQuiz();},850);
}

async function finishGeneratedQuiz(){
  const a=studySolveQuiz.active;if(!a)return;const total=a.quiz.questions.length,score=a.answers.filter(x=>x.is_correct).length,percent=Math.round(score/total*100);
  const {data:attempt,error}=await supabase.from('quiz_attempts').insert({user_id:state.user.id,material_id:a.row.material_id,transformation_id:a.row.id,title:a.quiz.title,score:percent,total}).select('id').single();
  if(error){console.error(error);toast('Quiz finished, but the attempt could not be saved.');}
  if(attempt){await supabase.from('quiz_answers').insert(a.answers.map((x,i)=>({...x,attempt_id:attempt.id,question_index:i})));const mistakes=a.answers.filter(x=>!x.is_correct);if(mistakes.length)await supabase.from('mistakes').insert(mistakes.map(x=>({user_id:state.user.id,quiz_attempt_id:attempt.id,question:x.question,user_answer:x.selected_answer,correct_answer:x.correct_answer,explanation:x.explanation,topic:a.quiz.title})));}
  const subject='Study Materials',topic=a.quiz.title;const {data:progress}=await supabase.from('learning_progress').select('id,mastery,practice_count').eq('user_id',state.user.id).eq('subject',subject).eq('topic',topic).maybeSingle();const old=Number(progress?.mastery||0),next=Math.max(0,Math.min(100,Math.round(old*0.7+percent*0.3)));if(progress)await supabase.from('learning_progress').update({mastery:next,practice_count:Number(progress.practice_count||0)+1,last_studied_at:new Date().toISOString()}).eq('id',progress.id);else await supabase.from('learning_progress').insert({user_id:state.user.id,subject,topic,mastery:percent,practice_count:1,last_studied_at:new Date().toISOString()});
  const r=document.getElementById('quizRunner');r.innerHTML=`<div class="section-title"><h3>Quiz complete</h3><span class="badge success">${percent}%</span></div><p>You answered <strong>${score}/${total}</strong> correctly.</p><div class="list"><div class="list-row"><span>Mastery signal</span><strong>${next}%</strong></div><div class="list-row"><span>Mistakes saved</span><strong>${a.answers.filter(x=>!x.is_correct).length}</strong></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="primary" id="quizRetry">Retry quiz</button><button class="secondary" id="quizBack">Back to generated learning</button></div>`;
  document.getElementById('quizRetry')?.addEventListener('click',()=>startGeneratedQuiz(a.row));document.getElementById('quizBack')?.addEventListener('click',()=>{r.classList.add('hidden');document.getElementById('generatedLearning')?.classList.remove('hidden');loadStudySolveLearning();});
}

function startGeneratedFlashcards(row){
  let data=row.output_json;if(!data&&row.output_text){try{data=JSON.parse(row.output_text);}catch{}}const cards=Array.isArray(data?.cards)?data.cards.filter(c=>c?.front&&c?.back).slice(0,30):[];if(!cards.length){toast('These flashcards need to be regenerated as structured flashcard data.');return;}
  studySolveQuiz.flashcards=cards.map((card)=>({...card,known:false}));studySolveQuiz.flashIndex=0;studySolveQuiz.flashRow=row;document.getElementById('generatedLearning')?.classList.add('hidden');const runner=document.getElementById('flashcardRunner');runner.classList.remove('hidden');renderFlashcard();runner.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderFlashcard(){const r=document.getElementById('flashcardRunner'),cards=studySolveQuiz.flashcards,i=studySolveQuiz.flashIndex;if(!r||!cards.length)return;const c=cards[i];r.innerHTML=`<div class="section-title"><div><span class="muted">Flashcard ${i+1} of ${cards.length}</span><h3>Tap to reveal</h3></div><span class="badge">${Math.round(i/cards.length*100)}%</span></div><button type="button" id="flashFlip" class="flashcard"><strong>${esc(c.front)}</strong><span id="flashBack" class="hidden">${esc(c.back)}</span></button><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px"><button class="secondary" id="flashAgain">Again</button><button class="primary" id="flashKnown">Known ✓</button></div>`;document.getElementById('flashFlip').addEventListener('click',()=>document.getElementById('flashBack').classList.toggle('hidden'));document.getElementById('flashAgain').addEventListener('click',()=>rateFlashcard(false));document.getElementById('flashKnown').addEventListener('click',()=>rateFlashcard(true));}
async function rateFlashcard(known){const cards=studySolveQuiz.flashcards,i=studySolveQuiz.flashIndex,c=cards[i];if(!c)return;c.known=known;if(state.user){await supabase.from('flashcards').insert({user_id:state.user.id,material_id:studySolveQuiz.flashRow.material_id,transformation_id:studySolveQuiz.flashRow.id,front:c.front,back:c.back,status:known?'known':'review',next_review_at:new Date(Date.now()+(known?3:1)*86400000).toISOString(),review_count:1});}studySolveQuiz.flashIndex++;if(studySolveQuiz.flashIndex<cards.length)renderFlashcard();else{const r=document.getElementById('flashcardRunner');r.innerHTML=`<div class="section-title"><h3>Flashcard review complete</h3><span class="badge success">Done</span></div><p>Known: <strong>${cards.filter(x=>x.known).length}</strong> • Need review: <strong>${cards.filter(x=>!x.known).length}</strong></p><button class="secondary" id="flashBackToList">Back to generated learning</button>`;document.getElementById('flashBackToList').addEventListener('click',()=>{r.classList.add('hidden');document.getElementById('generatedLearning')?.classList.remove('hidden');loadStudySolveLearning();});}}
