/* StudySolve boot loader
 * Loads Supabase first, with a second CDN fallback and a safe offline client.
 * This prevents a blocked CDN from stopping app.js before render() exists.
 */
(function () {
  'use strict';

  const SUPABASE_SOURCES = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2'
  ];

  const APP_SCRIPTS = [
    'app.js',
    'materials-enhancements.js',
    'quiz-enhancements.js',
    'adaptive-enhancements.js',
    'programming-enhancements.js',
    'planner-enhancements.js',
    'gamification-enhancements.js',
    'history-enhancements.js',
    'staff-enhancements.js',
    'ui-meta-enhancements.js',
    'ai-study-enhancements.js',
    'runtime-guard.js'
  ];

  function loadScript(src, timeoutMs) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        script.remove();
        reject(new Error(`Timed out loading ${src}`));
      }, timeoutMs || 9000);

      script.src = src;
      script.async = false;
      script.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.remove();
        reject(new Error(`Could not load ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  function createOfflineQuery() {
    const response = { data: [], error: new Error('StudySolve is offline. Connect to the internet to use saved data.') };
    const query = {
      select() { return query; },
      eq() { return query; },
      neq() { return query; },
      in() { return query; },
      order() { return query; },
      limit() { return query; },
      range() { return query; },
      single: async () => ({ data: null, error: response.error }),
      maybeSingle: async () => ({ data: null, error: response.error }),
      insert: async () => ({ data: null, error: response.error }),
      update: async () => ({ data: null, error: response.error }),
      upsert: async () => ({ data: null, error: response.error }),
      delete: async () => ({ data: null, error: response.error }),
      then(resolve) { return Promise.resolve(response).then(resolve); }
    };
    return query;
  }

  function installOfflineSupabase() {
    if (window.supabase && typeof window.supabase.createClient === 'function') return;

    const offlineError = () => new Error('StudySolve online services are unavailable. Please reconnect and reload the website.');
    const auth = {
      async getSession() { return { data: { session: null }, error: null }; },
      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
      async signInWithPassword() { return { data: { session: null, user: null }, error: offlineError() }; },
      async signUp() { return { data: { session: null, user: null }, error: offlineError() }; },
      async resetPasswordForEmail() { return { data: null, error: offlineError() }; },
      async signOut() { return { error: null }; }
    };

    window.__STUDYSOLVE_OFFLINE__ = true;
    window.supabase = {
      createClient() {
        return {
          auth,
          from() { return createOfflineQuery(); },
          storage: { from() { return { upload: async () => ({ data: null, error: offlineError() }), remove: async () => ({ data: null, error: offlineError() }) }; } },
          functions: { invoke: async () => ({ data: null, error: offlineError() }) }
        };
      }
    };
  }

  async function ensureSupabase() {
    if (window.supabase && typeof window.supabase.createClient === 'function') return true;
    for (const source of SUPABASE_SOURCES) {
      try {
        await loadScript(source, 8000);
        if (window.supabase && typeof window.supabase.createClient === 'function') return true;
      } catch (error) {
        console.warn('StudySolve Supabase loader:', error.message);
      }
    }
    installOfflineSupabase();
    return false;
  }

  async function start() {
    await ensureSupabase();
    for (const script of APP_SCRIPTS) {
      try {
        await loadScript(script, 12000);
      } catch (error) {
        console.error(`StudySolve failed to load ${script}:`, error);
        const page = document.getElementById('page');
        if (page && !window.render) {
          page.innerHTML = `<div class="card"><div class="page-head"><span class="muted">STUDYSOLVE</span><h2>App component failed to load</h2><p>${String(error.message || error).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}</p><button class="primary" type="button" onclick="window.location.reload()">Reload website</button></div></div>`;
        }
        return;
      }
    }
  }

  start().catch(error => {
    console.error('StudySolve boot failed:', error);
    const page = document.getElementById('page');
    if (page) page.innerHTML = '<div class="card"><div class="page-head"><span class="muted">STUDYSOLVE</span><h2>Startup failed</h2><p>Please reload the website. Your saved account data is not deleted.</p><button class="primary" type="button" onclick="window.location.reload()">Reload website</button></div></div>';
  });
})();
