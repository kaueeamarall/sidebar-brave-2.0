// Cada submenu usa a cor do seu ícone no menu principal.
(function () {
  const title = document.getElementById('header-title');
  if (!title) return;
  const tint = () => {
    const name = title.textContent.trim();
    let color = '';
    document.querySelectorAll('.menu-item').forEach((it) => {
      const l = it.querySelector('.menu-item-label');
      if (l && l.textContent.trim() === name) color = getComputedStyle(it).getPropertyValue('--ic').trim();
    });
    document.documentElement.style.setProperty('--screen-accent', color || '#b899ff');
  };
  new MutationObserver(tint).observe(title, { childList: true, characterData: true, subtree: true });
  tint();
})();
