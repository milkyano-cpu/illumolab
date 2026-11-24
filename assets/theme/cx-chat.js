/* Podium chat button in the brand colours (Theme settings > Chat button), and kept clear of the My build bar on phones.
   Podium draws its button in a same-site frame; a small style tag is added inside it whenever it appears. */
(() => {
  const c = window.stChat; if (!c) return;
  const css = `#podium-website-widget-button,.ContactBubble__Bubble{background:${c.bg}!important;color:${c.fg}!important;box-shadow:0 10px 30px -12px rgba(0,0,0,.45)!important}
    .ContactBubble__Bubble:hover{filter:brightness(.94)}
    .ContactBubble__Bubble *{color:${c.fg}!important}
    .ContactBubble__Bubble svg [fill]:not([fill="none"]),.ContactBubble__Bubble svg path:not([fill]){fill:${c.fg}!important}
    .ContactBubble__Bubble svg [stroke]:not([stroke="none"]){stroke:${c.fg}!important}
    .ContactBubble__TextUs,.ContactBubble__TextUs span{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Helvetica Neue",Arial,sans-serif!important;font-weight:500!important}`;
  const paint = f => { try { const d = f.contentDocument; if (d && d.head && !d.getElementById('st-chat')) { const s = d.createElement('style'); s.id = 'st-chat'; s.textContent = css; d.head.appendChild(s); } } catch (e) {} };
  const scan = () => document.querySelectorAll('iframe#podium-bubble').forEach(f => { paint(f); if (!f._st) { f._st = true; f.addEventListener('load', () => paint(f)); } });
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  scan();
  // lift the chat button above the My build bar while the bar is showing
  const s = document.createElement('style');
  s.textContent = '@media (max-width:640px){html.cx-has-build #podium-bubble,html.cx-has-build #podium-prompt{bottom:84px!important}}html.locked #podium-bubble,html.locked #podium-prompt,html.cx-build-open #podium-bubble,html.cx-build-open #podium-prompt{opacity:0!important;pointer-events:none!important}';
  document.head.appendChild(s);
  // and step aside while the build list is open, so it never covers Checkout / Book this build
  const build = document.getElementById('build');
  if (build) { const upd = () => { document.documentElement.classList.toggle('cx-has-build', !build.hidden); document.documentElement.classList.toggle('cx-build-open', build.classList.contains('is-open')); }; new MutationObserver(upd).observe(build, { attributes: true, attributeFilter: ['hidden', 'class'] }); upd(); }
})();
