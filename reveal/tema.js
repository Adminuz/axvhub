/* Qorong'i (VS Code Dark+) / yorug' (Light+) mavzu almashtirgich, matn o'lchamini kattalashtirish va slaydlarni telefonga moslash.
   <head> ichida ulanadi (miltillashsiz). Tugmalar sahifa yuklangach qo'yiladi:
   sahifada `.theme-slot` bo'lsa shu yerga, bo'lmasa o'ng yuqori burchakka (slaydlar). Klaviatura: T (mavzu), + / - (shrift), 0 (asliga qaytarish). */
(function () {
  var KEY = 'vitepress-theme-appearance'; // VitePress bilan bir xil kalit: sayt va slaydlar mavzusi umumiy
  var FONT_KEY = 'axv-slide-font-scale';
  var SCALES = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5];

  function get() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark') return v;
      if (v === 'auto' || !v) {
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
      }
      return 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function set(v) {
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {}
  }

  function cur() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function updateButton() {
    var b = document.querySelector('.theme-toggle');
    if (!b) return;
    var isLight = cur() === 'light';
    b.title = isLight ? "Qorong'i mavzuga o'tish (T)" : "Yorug' mavzuga o'tish (T)";
    b.setAttribute('aria-label', isLight ? "Qorong'i mavzuga o'tish" : "Yorug' mavzuga o'tish");
  }

  function apply(v) {
    var theme = (v === 'light') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.setAttribute('data-theme', theme);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateButton();
  }

  function toggle() {
    var n = (cur() === 'light') ? 'dark' : 'light';
    set(n);
    apply(n);
  }

  /* --- Shrift o'lchamini (Font Scale) boshqarish --- */
  function getFontScale() {
    try {
      var v = parseFloat(localStorage.getItem(FONT_KEY));
      if (!isNaN(v) && v >= 0.8 && v <= 1.6) return v;
    } catch (e) {}
    return 1.0;
  }

  function setFontScale(v) {
    try {
      localStorage.setItem(FONT_KEY, v.toString());
    } catch (e) {}
  }

  function updateFontButtons(scale) {
    var lbl = document.querySelector('.font-reset');
    if (lbl) {
      lbl.textContent = Math.round(scale * 100) + '%';
      lbl.title = "Standart o'lchamga qaytarish (100% · 0)";
    }
    var dec = document.querySelector('.font-dec');
    if (dec) dec.disabled = scale <= 0.85;
    var inc = document.querySelector('.font-inc');
    if (inc) inc.disabled = scale >= 1.45;
  }

  function applyFontScale(scale) {
    document.documentElement.style.setProperty('--slide-font-scale', scale);
    if (document.body) {
      document.body.style.setProperty('--slide-font-scale', scale);
    }
    updateFontButtons(scale);
    if (window.Reveal && Reveal.layout) {
      try { Reveal.layout(); } catch (e) {}
    }
  }

  function stepFontScale(delta) {
    var current = getFontScale();
    var closest = 1.0;
    var minDiff = 999;
    for (var i = 0; i < SCALES.length; i++) {
      var diff = Math.abs(SCALES[i] - current);
      if (diff < minDiff) { minDiff = diff; closest = SCALES[i]; }
    }
    var idx = SCALES.indexOf(closest);
    var nextIdx = Math.max(0, Math.min(SCALES.length - 1, idx + delta));
    var newScale = SCALES[nextIdx];
    setFontScale(newScale);
    applyFontScale(newScale);
  }

  function resetFontScale() {
    setFontScale(1.0);
    applyFontScale(1.0);
  }

  // Dastlabki tezkor yuklash
  apply(get());
  applyFontScale(getFontScale());

  var MOON = '<svg class="moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var SUN = '<svg class="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body) {
      document.body.setAttribute('data-theme', cur());
      document.body.style.setProperty('--slide-font-scale', getFontScale());
    }

    var b = document.createElement('button');
    b.className = 'theme-toggle';
    b.type = 'button';
    b.innerHTML = SUN + MOON;

    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });

    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) {
      b.addEventListener(ev, function (e) {
        e.stopPropagation();
      }, { passive: true });
    });

    var slot = document.querySelector('.theme-slot');
    if (slot) {
      b.classList.add('in-page');
      slot.appendChild(b);
      updateButton();
      return;
    }

    // Slaydlar uchun yuqori panel (.slide-top-tools)
    var tools = document.createElement('div');
    tools.className = 'slide-top-tools';
    tools.appendChild(b);

    var fCtrl = document.createElement('div');
    fCtrl.className = 'font-ctrl';
    fCtrl.setAttribute('role', 'group');
    fCtrl.setAttribute('aria-label', "Matn o'lchami");

    var bDec = document.createElement('button');
    bDec.className = 'font-btn font-dec';
    bDec.type = 'button';
    bDec.title = "Matnni kichraytirish (−)";
    bDec.setAttribute('aria-label', "Matnni kichraytirish");
    bDec.textContent = 'A−';
    bDec.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation(); stepFontScale(-1);
    });

    var bReset = document.createElement('button');
    bReset.className = 'font-btn font-reset';
    bReset.type = 'button';
    bReset.title = "Standart o'lcham (100% · 0)";
    bReset.setAttribute('aria-label', "Standart o'lchamga qaytarish");
    bReset.textContent = Math.round(getFontScale() * 100) + '%';
    bReset.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation(); resetFontScale();
    });

    var bInc = document.createElement('button');
    bInc.className = 'font-btn font-inc';
    bInc.type = 'button';
    bInc.title = "Matnni kattalashtirish (+)";
    bInc.setAttribute('aria-label', "Matnni kattalashtirish");
    bInc.textContent = 'A+';
    bInc.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation(); stepFontScale(1);
    });

    [bDec, bReset, bInc].forEach(function (btn) {
      ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) {
        btn.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
      });
    });

    fCtrl.appendChild(bDec);
    fCtrl.appendChild(bReset);
    fCtrl.appendChild(bInc);
    tools.appendChild(fCtrl);

    document.body.appendChild(tools);

    updateButton();
    updateFontButtons(getFontScale());
  });

  document.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 't' || e.key === 'T') {
      toggle();
    } else if (e.key === '+' || e.key === '=') {
      stepFontScale(1);
    } else if (e.key === '-' || e.key === '_') {
      stepFontScale(-1);
    } else if (e.key === '0') {
      resetFontScale();
    }
  });

  window.addEventListener('storage', function (e) {
    if (e.key === KEY) {
      apply(get());
    } else if (e.key === FONT_KEY) {
      applyFontScale(getFontScale());
    }
  });

  /* ---- Slaydlarni ekranga moslash (faqat Reveal bor sahifalarda) ----
     Keng ekran: 1280x720. Telefon (vertikal): mantiqiy kenglik 760, balandlik ekran nisbatiga qarab. */
  function adapt() {
    if (!window.Reveal || !Reveal.isReady || !Reveal.isReady()) return;
    var w = window.innerWidth, h = window.innerHeight;
    var portrait = h > w * 1.05 && w < 900;
    var cw = portrait ? 760 : 1280;
    var ch = portrait ? Math.max(900, Math.round(760 * h / w)) : 720;
    var c = Reveal.getConfig();
    if (c.width !== cw || c.height !== ch) {
      Reveal.configure({ width: cw, height: ch, margin: portrait ? 0.05 : 0.06 });
    }
    // gorizontal aylanadigan illyustratsiyada surish slayd almashtirmasin
    document.querySelectorAll('.illus').forEach(function (el) {
      el.setAttribute('data-prevent-swipe', '');
      var hint = el.nextElementSibling && el.nextElementSibling.classList.contains('illus-hint') ? el.nextElementSibling : null;
      if (portrait && !hint) {
        hint = document.createElement('div');
        hint.className = 'illus-hint';
        hint.textContent = "\u2194 Sxemani suring yoki telefonni yoting";
        el.parentNode.insertBefore(hint, el.nextSibling);
      }
      if (hint) hint.style.display = portrait ? '' : 'none';
    });
  }
  window.addEventListener('load', function () {
    if (!window.Reveal) return;
    if (Reveal.isReady()) adapt(); else Reveal.on('ready', adapt);
    window.addEventListener('resize', function () { setTimeout(adapt, 50); });
    window.addEventListener('orientationchange', function () { setTimeout(adapt, 250); });
  });
})();
