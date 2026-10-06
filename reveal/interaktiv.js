/* Slaydlardagi interaktiv bloklar (dars.css bilan birga). Qobiq (slayd-qobiq.html) ulaydi, qo'lda ulash shart emas.
 *
 * Bloklar (HTML namunasi: shablon/slaydlar.html):
 *   .flip      bosilganda aylanadigan karta (.face.front / .face.back)
 *   .quiz      savol: .opt tugmalari, to'g'risiga data-ok; .explain — izoh
 *   .stepper   qadamma-qadam: .stp panellar, tugmalar o'zi qo'shiladi
 *   .swap      "oldin / keyin" almashtirgich: .swap-tabs button va .swap-p panellar
 *   [data-tip] ustiga olib borilganda/bosilganda izoh ko'rsatadi (SVG ichida ham)
 *   .count     raqam 0 dan data-to gacha sanaladi (slayd ochilganda)
 */
(function () {
  function qa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function initFlip() {
    qa(document, '.flip').forEach(function (el) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.addEventListener('click', function () { el.classList.toggle('flipped'); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); el.classList.toggle('flipped'); }
      });
    });
  }

  function initQuiz() {
    qa(document, '.quiz').forEach(function (q) {
      var opts = qa(q, '.opt');
      opts.forEach(function (o) {
        o.addEventListener('click', function () {
          if (q.classList.contains('done')) return;
          q.classList.add('done');
          o.classList.add(o.hasAttribute('data-ok') ? 'good' : 'bad');
          opts.forEach(function (x) { if (x.hasAttribute('data-ok')) x.classList.add('good'); });
          var ex = q.querySelector('.explain');
          if (ex) ex.classList.add('show');
        });
      });
    });
  }

  function initStepper() {
    qa(document, '.stepper').forEach(function (s) {
      var panels = qa(s, '.stp');
      if (!panels.length) return;
      var i = 0;
      var nav = document.createElement('div');
      nav.className = 'stp-nav';
      nav.innerHTML = '<button type="button" class="btn-s sp-prev">← Orqaga</button><span class="sp-dots"></span><button type="button" class="btn-s sp-next">Keyingi →</button>';
      s.appendChild(nav);
      var dots = nav.querySelector('.sp-dots');
      panels.forEach(function () { dots.appendChild(document.createElement('i')); });
      var prev = nav.querySelector('.sp-prev'), next = nav.querySelector('.sp-next');
      function show(n) {
        i = Math.max(0, Math.min(panels.length - 1, n));
        panels.forEach(function (p, k) { p.classList.toggle('on', k === i); });
        qa(dots, 'i').forEach(function (d, k) { d.classList.toggle('on', k === i); });
        prev.disabled = i === 0;
        next.disabled = i === panels.length - 1;
      }
      prev.addEventListener('click', function () { show(i - 1); });
      next.addEventListener('click', function () { show(i + 1); });
      show(0);
    });
  }

  function initSwap() {
    qa(document, '.swap').forEach(function (s) {
      var tabs = qa(s, '.swap-tabs button'), panels = qa(s, '.swap-p');
      function show(n) {
        tabs.forEach(function (t, k) { t.classList.toggle('on', k === n); });
        panels.forEach(function (p, k) { p.classList.toggle('on', k === n); });
      }
      tabs.forEach(function (t, k) { t.addEventListener('click', function () { show(k); }); });
      show(0);
    });
  }

  function initTips() {
    qa(document, '.slides section').forEach(function (sec) {
      var targets = qa(sec, '[data-tip]');
      if (!targets.length) return;
      var box = document.createElement('div');
      box.className = 'tipbox';
      sec.appendChild(box);
      function place(el) {
        var scale = (window.Reveal && Reveal.getScale && Reveal.getScale()) || 1;
        var r = el.getBoundingClientRect(), sr = sec.getBoundingClientRect();
        box.textContent = el.getAttribute('data-tip');
        var x = (r.left - sr.left) / scale, y = (r.bottom - sr.top) / scale + 8;
        var w = box.offsetWidth || 260;
        box.style.left = Math.max(8, Math.min(x, sec.offsetWidth - w - 8)) + 'px';
        box.style.top = y + 'px';
        box.classList.add('show');
      }
      function hide() { box.classList.remove('show'); }
      targets.forEach(function (el) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        el.classList.add('hot');
        el.addEventListener('mouseenter', function () { place(el); });
        el.addEventListener('focus', function () { place(el); });
        el.addEventListener('mouseleave', hide);
        el.addEventListener('blur', hide);
        el.addEventListener('click', function () { place(el); });
      });
    });
  }

  function animateCounts(root) {
    qa(root, '.count').forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-to') || '0');
      var suf = el.getAttribute('data-suf') || '';
      var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      var t0 = null;
      if (el._raf) cancelAnimationFrame(el._raf);
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / 1200);
        var v = to * (1 - Math.pow(1 - p, 3));
        el.textContent = v.toFixed(dec) + suf;
        if (p < 1) el._raf = requestAnimationFrame(step);
      }
      el._raf = requestAnimationFrame(step);
    });
  }

  function init() {
    initFlip(); initQuiz(); initStepper(); initSwap(); initTips();
    qa(document, '.count').forEach(function (el) { el.textContent = '0' + (el.getAttribute('data-suf') || ''); });
    if (window.Reveal && Reveal.on) {
      var go = function (e) { var cur = e && e.currentSlide ? e.currentSlide : document.querySelector('.slides section.present'); if (cur) animateCounts(cur); };
      Reveal.on('slidechanged', go);
      Reveal.on('ready', go);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
