// Simple accessible hamburger toggle for small screens
(function () {
  const btn = document.querySelector('.hamburger');
  const nav = document.getElementById('primary-navigation');
  if (!btn || !nav) return;

  const close = () => {
    btn.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  };

  const open = () => {
    btn.setAttribute('aria-expanded', 'true');
    nav.classList.add('is-open');
  };

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    expanded ? close() : open();
  });

  // Close on link click
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));

  // Close on Escape
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') close();
  });

  // Reset on resize
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) close();
  });
})();

// Email obfuscation: fill any placeholders with the address
(function () {
  const els = document.querySelectorAll('.email-container, #email-container');
  if (!els.length) return;
  const user = 'impressum';
  const domain = 'juliasutter.de';
  const email = `${user}@${domain}`;
  els.forEach((slot) => {
    if (!slot) return;
    // Avoid duplicating content if already filled
    if (slot.dataset.filled === 'true' || slot.childElementCount > 0 || slot.textContent.trim()) return;
    const a = document.createElement('a');
    a.href = `mailto:${email}`;
    a.textContent = email;
    slot.appendChild(a);
    slot.dataset.filled = 'true';
  });
})();

// Language toggle (DE/EN)
(function () {
  const toggle = document.getElementById('langToggle');
  const container = document.querySelector('main .content-box') || document;
  const de = container.querySelector('section[lang="de"]');
  const en = container.querySelector('section[lang="en"]');
  if (!toggle || !de || !en) return;

  const labels = document.querySelectorAll('.lang-switcher .lang-label');
  const labelDE = labels[0];
  const labelEN = labels[1];

  // i18n strings for shared nav/footer labels
  const i18n = {
    de: {
      nav: { imprint: 'Impressum', privacy: 'Datenschutz', terms: 'AGB' },
      rights: 'Alle Rechte vorbehalten.',
    },
    en: {
      nav: { imprint: 'Imprint', privacy: 'Privacy', terms: 'Terms' },
      rights: 'All rights reserved.',
    },
  };

  // Update header/footer link labels and footer rights line
  const updateGlobalStrings = (lang) => {
    const dict = i18n[lang] || i18n.de;
    // Update nav/footer anchors (only these three)
    document.querySelectorAll('nav a, footer a').forEach((a) => {
      try {
        const abs = new URL(a.href, window.location.href);
        const path = abs.pathname.replace(/\/+$/, '');
        if (path.endsWith('/imprint')) a.textContent = dict.nav.imprint;
        else if (path.endsWith('/privacy')) a.textContent = dict.nav.privacy;
        else if (path.endsWith('/terms')) a.textContent = dict.nav.terms;
      } catch (_) {
        const href = a.getAttribute('href') || '';
        if (href.endsWith('imprint') || href.endsWith('/imprint')) a.textContent = dict.nav.imprint;
        else if (href.endsWith('privacy') || href.endsWith('/privacy')) a.textContent = dict.nav.privacy;
        else if (href.endsWith('terms') || href.endsWith('/terms')) a.textContent = dict.nav.terms;
      }
    });
    // Update footer copyright/rights line
    const rightsEl = document.querySelector('footer p');
    if (rightsEl) {
      const existing = rightsEl.textContent || '';
      const yearMatch = existing.match(/\b(20\d{2})\b/);
      const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
      rightsEl.textContent = `© ${year} Julia Sutter. ${dict.rights}`;
    }
  };

  const setActive = (lang) => {
    const isEN = lang === 'en';
    toggle.checked = isEN;
    de.hidden = isEN;
    en.hidden = !isEN;
    document.documentElement.setAttribute('lang', isEN ? 'en' : 'de');
    if (labelDE) labelDE.dataset.active = (!isEN).toString();
    if (labelEN) labelEN.dataset.active = isEN.toString();
    toggle.setAttribute('aria-label', isEN ? 'Toggle language to German' : 'Toggle language to English');
    updateGlobalStrings(lang);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', isEN ? 'en' : 'de');
      history.replaceState({}, '', url);
    } catch (_) {}
  };

  const getInitial = () => {
    try {
      const url = new URL(window.location.href);
      const q = (url.searchParams.get('lang') || '').toLowerCase();
      if (q === 'en' || q === 'de') return q;
      const h = (url.hash || '').replace('#', '').toLowerCase();
      if (h === 'en' || h === 'de') return h;
    } catch (_) {}
    try {
      const saved = localStorage.getItem('prefLang');
      if (saved === 'en' || saved === 'de') return saved;
    } catch (_) {}
    return 'de';
  };

  setActive(getInitial());

  toggle.addEventListener('change', () => {
    const lang = toggle.checked ? 'en' : 'de';
    setActive(lang);
    try { localStorage.setItem('prefLang', lang); } catch (_) {}
  });

  if (labelDE) labelDE.addEventListener('click', () => {
    setActive('de');
    try { localStorage.setItem('prefLang', 'de'); } catch (_) {}
  });
  if (labelEN) labelEN.addEventListener('click', () => {
    setActive('en');
    try { localStorage.setItem('prefLang', 'en'); } catch (_) {}
  });
})();
