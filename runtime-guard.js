/* StudySolve production runtime guard.
 * Loaded last so the complete feature stack is present before the recovery render.
 * Prevents a client-side exception from leaving the main content area blank.
 */
(function () {
  const page = document.getElementById('page');
  if (!page) return;
  let recovering = false;

  function escapeMessage(value) {
    const text = String(value || 'Unknown client-side error');
    return text.replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function showRuntimeError(error) {
    if (recovering) return;
    recovering = true;
    console.error('StudySolve runtime error:', error);
    page.innerHTML = `<div class="card" style="margin-top:20px"><div class="page-head"><span class="muted">STUDYSOLVE</span><h2>Dashboard could not start</h2><p>The website loaded, but a browser-side component failed. Your account data is not deleted.</p></div><div class="notice" style="margin-bottom:16px">${escapeMessage(error?.message || error)}</div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="primary" id="studySolveRetry" type="button">Try again</button><button class="secondary" id="studySolveReload" type="button">Reload website</button></div></div>`;
    document.getElementById('studySolveRetry')?.addEventListener('click', () => { recovering = false; boot(true); });
    document.getElementById('studySolveReload')?.addEventListener('click', () => window.location.reload());
  }

  async function boot(force) {
    if (recovering && !force) return;
    try {
      if (typeof window.render !== 'function') throw new Error('StudySolve render function is unavailable.');
      await Promise.resolve(window.render());
      if (!page.innerHTML.trim()) throw new Error('The dashboard renderer returned an empty page.');
    } catch (error) {
      showRuntimeError(error);
    }
  }

  window.addEventListener('error', (event) => showRuntimeError(event.error || new Error(event.message || 'JavaScript error')));
  window.addEventListener('unhandledrejection', (event) => showRuntimeError(event.reason || new Error('Unhandled promise rejection')));

  // app.js starts rendering before the enhancement scripts finish loading.
  // Re-render after load so all feature wrappers are installed first.
  window.addEventListener('load', () => setTimeout(() => boot(false), 0), { once: true });
  setTimeout(() => boot(false), 250);
})();
