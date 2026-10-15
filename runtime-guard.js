/* StudySolve production runtime guard.
 * Prevents a client-side render exception from leaving the main page blank.
 * The guard is intentionally dependency-free and loaded after all feature layers.
 */
(function () {
  const page = document.getElementById('page');
  if (!page) return;

  const showRuntimeError = (error) => {
    const message = error?.message || String(error || 'Unknown runtime error');
    console.error('StudySolve runtime error:', error);
    page.innerHTML = `
      <div class="card" style="margin-top:20px">
        <div class="page-head">
          <span class="eyebrow">STUDYSOLVE</span>
          <h2>We are fixing the dashboard</h2>
          <p>The website loaded, but one part of the page failed to start.</p>
        </div>
        <div class="notice" style="margin-bottom:16px">${typeof esc === 'function' ? esc(message) : 'A client-side error prevented the page from rendering.'}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="primary" id="studySolveRetry">Try again</button>
          <button class="secondary" id="studySolveReload">Reload website</button>
        </div>
      </div>`;
    document.getElementById('studySolveRetry')?.addEventListener('click', boot);
    document.getElementById('studySolveReload')?.addEventListener('click', () => window.location.reload());
  };

  const originalRender = window.render;
  async function safeRender() {
    if (typeof originalRender !== 'function') {
      showRuntimeError(new Error('StudySolve render function is unavailable.'));
      return;
    }
    try {
      await originalRender();
    } catch (error) {
      showRuntimeError(error);
    }
  }

  async function boot() {
    await safeRender();
  }

  window.addEventListener('error', (event) => {
    if (!page.innerHTML.trim()) showRuntimeError(event.error || new Error(event.message || 'JavaScript error'));
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (!page.innerHTML.trim()) showRuntimeError(event.reason || new Error('Unhandled promise rejection'));
  });

  // Run after every feature script has finished loading. This also recovers
  // from an earlier render attempt that failed during initial page startup.
  setTimeout(boot, 0);
})();
