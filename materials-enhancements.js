const originalMaterialsPage = materialsPage;

const transformOptions = [
  ['easy_notes','Easy Notes'],['exam_answers','Exam Answers'],['important_questions','Important Questions'],['quiz','Quiz'],
  ['flashcards','Flashcards'],['quick_revision','Quick Revision'],['definitions','Definitions'],['exam_tomorrow','Exam-Tomorrow Revision']
];

materialsPage = function enhancedMaterialsPage(){
  return originalMaterialsPage().replace(
    '<div class="list"><div class="list-row"><span>Easy Notes</span><span class="badge">Ready UI</span></div><div class="list-row"><span>Exam answers</span><span class="badge">Ready UI</span></div><div class="list-row"><span>Quiz / Flashcards</span><span class="badge">Ready UI</span></div></div>',
    '<div class="list"><div class="list-row"><span>Easy Notes</span><span class="badge success">AI ready</span></div><div class="list-row"><span>Exam answers</span><span class="badge success">AI ready</span></div><div class="list-row"><span>Quiz / Flashcards</span><span class="badge success">AI ready</span></div></div>'
  );
};

loadMaterials = async function enhancedLoadMaterials(){
  const el=document.getElementById('materialsList');
  if(!el||!state.user)return;
  const {data,error}=await supabase.from('study_materials').select('id,title,file_name,file_type,status,created_at,storage_path,extracted_text').eq('user_id',state.user.id).order('created_at',{ascending:false});
  if(error){el.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return;}
  el.innerHTML=data?.length?`<div class="list">${data.map(m=>`<div class="list-row material-card"><div><strong>${esc(m.title)}</strong><div class="muted">${esc(m.file_name)} • ${esc(m.file_type)} • ${esc(m.status)}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="secondary" data-transform-menu="${m.id}">Transform</button><button class="danger" data-delete-material="${m.id}" data-storage-path="${esc(m.storage_path)}">Delete</button></div></div><div class="transform-panel hidden" id="transform-${m.id}"><div class="category-grid">${transformOptions.map(([id,label])=>`<button class="category" data-transform="${id}" data-material="${m.id}">${label}</button>`).join('')}</div><div id="transform-result-${m.id}" class="card hidden" style="margin-top:10px"></div></div>`).join('')}</div>`:'<div class="empty">No materials uploaded yet.</div>';
  el.querySelectorAll('[data-delete-material]').forEach(b=>b.addEventListener('click',()=>deleteMaterial(b.dataset.deleteMaterial,b.dataset.storagePath)));
  el.querySelectorAll('[data-transform-menu]').forEach(b=>b.addEventListener('click',()=>document.getElementById(`transform-${b.dataset.transformMenu}`).classList.toggle('hidden')));
  el.querySelectorAll('[data-transform]').forEach(b=>b.addEventListener('click',()=>transformMaterial(b.dataset.material,b.dataset.transform)));
};

uploadMaterial = async function enhancedUploadMaterial(file){
  if(!state.user)return showAuth(true);
  const status=document.getElementById('uploadStatus'); status.textContent='Uploading…';
  try{
    const max=20*1024*1024;
    if(file.size>max)throw new Error('File is larger than the 20 MB website upload limit.');
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`${state.user.id}/${Date.now()}-${safe}`;
    const {error:upError}=await supabase.storage.from('study-materials').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
    if(upError)throw upError;
    let extractedText=null;
    if(file.type==='text/plain'||/\.(txt|md|csv|js|ts|py|java|c|cpp|html|css|sql|json)$/i.test(file.name)){
      extractedText=await file.text();
      if(extractedText.length>30000)extractedText=extractedText.slice(0,30000);
    }
    const {error:dbError}=await supabase.from('study_materials').insert({user_id:state.user.id,title:file.name.replace(/\.[^.]+$/,''),file_name:file.name,file_type:file.type||'application/octet-stream',storage_path:path,status:extractedText?'ready':'uploaded',extracted_text:extractedText});
    if(dbError)throw dbError;
    status.style.color='var(--success)';status.textContent=extractedText?'Upload complete. Text extraction is ready for AI transformation.':'Upload complete. Document extraction for this file type is not enabled yet.';
    toast('Study material saved privately.');loadMaterials();
  }catch(e){status.textContent=e.message||'Upload failed.';}
};

async function transformMaterial(materialId,transformType){
  const result=document.getElementById(`transform-result-${materialId}`); if(!result)return;
  result.classList.remove('hidden'); result.innerHTML='<div class="muted">AI Teacher is transforming this material…</div>';
  try{
    const {data,error}=await supabase.functions.invoke('material-transform',{body:{materialId,transformType}});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    result.innerHTML=`<h3>${esc(data.title||'Transformation')}</h3><div class="code-box" style="white-space:pre-wrap;font-family:inherit">${esc(data.output||'No output')}</div>`;
    toast('Transformation completed.');
  }catch(e){result.innerHTML=`<div class="notice">${esc(e.message||'Transformation failed.')}</div>`;}
}
