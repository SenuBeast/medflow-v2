/**
 * Anti-flicker inline script.
 * Inject this as a synchronous <script> in index.html <head> BEFORE any CSS.
 * It reads localStorage and applies the correct class to <html> on frame 1.
 */
export const THEME_SCRIPT = `(function(){
  try {
    var stored = localStorage.getItem('mf-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (stored === 'system' || !stored) && prefersDark;
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e) {}
})();`;
