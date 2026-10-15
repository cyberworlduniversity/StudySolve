/* StudySolve Universal AI layer
 * Loaded after the core app so every student question can be routed to the AI Study Engine.
 * Admin question banks are not required for the Solve experience.
 */
(function () {
  sendSolve = async function universalStudySolve(message) {
    if (!state.user) {
      showAuth(true);
      return;
    }

    const s = state.solve;
    const subjectEl = document.getElementById('solveSubject');
    const topicEl = document.getElementById('solveTopic');
    const languageEl = document.getElementById('solveLanguage');
    s.subject = subjectEl?.value.trim() || s.subject || '';
    s.topic = topicEl?.value.trim() || s.topic || '';
    s.language = languageEl?.value || s.language || 'English';
    s.messages.push({ role: 'user', text: message });
    render();

    try {
      if (!s.sessionId) {
        const { data: session, error: sessionError } = await supabase
          .from('study_sessions')
          .insert({
            user_id: state.user.id,
            mode: 'solve',
            topic: s.topic || s.subject || s.category,
            teacher_language: s.language,
            teacher_phase: 'explain',
            teacher_mastery: 0,
          })
          .select('id')
          .single();
        if (sessionError) throw sessionError;
        s.sessionId = session.id;

        const { data: problem, error: problemError } = await supabase
          .from('problems')
          .insert({
            user_id: state.user.id,
            session_id: s.sessionId,
            question: message,
            subject: s.subject || null,
            topic: s.topic || null,
            category: s.category,
            status: 'open',
          })
          .select('id')
          .single();
        if (problemError) throw problemError;
        s.problemId = problem.id;
      } else if (s.problemId) {
        const { error } = await supabase
          .from('problems')
          .update({
            question: message,
            subject: s.subject || null,
            topic: s.topic || null,
            category: s.category,
          })
          .eq('id', s.problemId);
        if (error) throw error;
      }

      await supabase.from('ai_teacher_messages').insert({
        user_id: state.user.id,
        session_id: s.sessionId,
        role: 'user',
        content: message,
      });

      const history = s.messages.slice(-12).map((item) => ({
        role: item.role === 'teacher' ? 'assistant' : 'user',
        content: item.text,
      }));

      const { data, error } = await supabase.functions.invoke('ai-study', {
        body: {
          message,
          subject: s.subject,
          topic: s.topic,
          category: s.category,
          language: s.language,
          phase: 'explain',
          mastery: 0,
          history,
        },
      });

      if (error) throw error;
      if (data?.status === 'provider_not_configured') {
        throw new Error(data.message || 'AI provider is not configured yet.');
      }

      const reply = data?.reply || data?.answer || data?.message;
      if (!reply) throw new Error('StudySolve AI returned no answer.');

      s.messages.push({ role: 'teacher', text: reply });
      await supabase.from('ai_teacher_messages').insert({
        user_id: state.user.id,
        session_id: s.sessionId,
        role: 'assistant',
        content: reply,
      });

      render();
    } catch (error) {
      console.error('StudySolve AI error:', error);
      s.messages.push({
        role: 'teacher',
        text: `I could not complete that request. ${error?.message || 'Please try again.'}`,
      });
      render();
    }
  };

  // Add a prominent universal-AI entry point to the dashboard without replacing
  // the existing dashboard implementation.
  const originalDashboard = dashboard;
  if (typeof originalDashboard === 'function') {
    dashboard = async function universalAIDashboard() {
      const base = await originalDashboard.apply(this, arguments);
      if (!state.user) return base;
      return `${base}<div class="card ai-universal-card"><div><span class="eyebrow">AI STUDY ENGINE</span><h3>Ask StudySolve anything</h3><p class="muted">Questions, homework, exam doubts, programming, answer checking and problem solving are handled dynamically by AI.</p></div><button class="primary" data-page="solve">Ask AI Teacher</button></div>`;
    };
  }

  const originalMaterialsPage = materialsPage;
  if (typeof originalMaterialsPage === 'function') {
    materialsPage = function universalAIMaterialsPage() {
      const base = originalMaterialsPage.apply(this, arguments);
      return `${base}<div class="card ai-universal-card"><div><span class="eyebrow">AI AUTOMATION</span><h3>No manual question bank required</h3><p class="muted">StudySolve can generate explanations, questions, quizzes, flashcards and revision content from student-provided material.</p></div></div>`;
    };
  }
})();
