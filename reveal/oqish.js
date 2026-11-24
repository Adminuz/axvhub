/* Mobile cards have their own DOM and styles. The authored Reveal deck is kept
 * intact and starts only when presentation mode is requested. */
(function () {
  'use strict';
  var payload = JSON.parse(document.getElementById('deck-data').textContent);
  var source = new DOMParser().parseFromString(payload.html, 'text/html');
  var slides = [], cache = new Map(), current = 0, cardsMode = false, unique = 0, lastFocus;
  var root = document.getElementById('mobile-deck'), scroll = document.getElementById('deck-scroll');
  var previous = document.getElementById('slide-prev'), next = document.getElementById('slide-next');
  var overlay = document.getElementById('deck-overlay'), readingButton = document.getElementById('reading-view');
  var presentationButton = document.getElementById('presentation-view'), fontMenu = document.getElementById('deck-font-menu');
  var R = window.Reveal;
  var topSections = Array.from(source.body.children).filter(function (el) { return el.tagName === 'SECTION'; });
  topSections.forEach(function (section, h) {
    var nested = Array.from(section.children).filter(function (el) { return el.tagName === 'SECTION'; });
    (nested.length ? nested : [section]).forEach(function (el, v) {
      var heading = el.querySelector('h1,h2,h3');
      slides.push({ el: el, h: h, v: nested.length ? v : 0, title: heading ? heading.textContent.trim() : 'Slayd' });
    });
  });
  if (!slides.length) return;
  var hashCard = location.hash.match(/^#card=(\d+)/), hashSlide = location.hash.match(/^#\/(\d+)(?:\/(\d+))?/);
  if (hashCard) current = Math.max(0, Math.min(slides.length - 1, Number(hashCard[1]) - 1));
  else if (hashSlide) current = Math.max(0, slides.findIndex(function (s) { return s.h === Number(hashSlide[1]) && s.v === Number(hashSlide[2] || 0); }));

  function node(tag, cls, text) {
    var el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el;
  }
  function button(cls, text, action) { var el = node('button', cls, text); el.type = 'button'; el.addEventListener('click', action); return el; }
  function icon(name) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('class', 'm-icon'); el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor'); el.setAttribute('stroke-width', '1.8'); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round'); el.setAttribute('aria-hidden', 'true');
    el.innerHTML = window.IKON?.[name] || '<circle cx="12" cy="12" r="8"/>'; return el;
  }
  function children(from, into) { Array.from(from.childNodes).forEach(function (child) { var result = convert(child); if (result) into.appendChild(result); }); return into; }
  function svgCopy(original) {
    var svg = original.cloneNode(true), prefix = 'deck-svg-' + (++unique) + '-';
    if (!svg.hasAttribute('viewBox') && parseFloat(svg.getAttribute('width')) && parseFloat(svg.getAttribute('height'))) svg.setAttribute('viewBox', '0 0 ' + parseFloat(svg.getAttribute('width')) + ' ' + parseFloat(svg.getAttribute('height')));
    var ids = new Map(); [svg].concat(Array.from(svg.querySelectorAll('[id]'))).filter(function (el) { return el.id; }).forEach(function (el) { ids.set(el.id, prefix + el.id); el.id = prefix + el.id; });
    [svg].concat(Array.from(svg.querySelectorAll('*'))).forEach(function (el) {
      el.removeAttribute('tabindex'); el.removeAttribute('data-anim');
      el.classList.remove('fragment', 'fade-up', 'fade-out', 'grow', 'pulse', 'flowing');
      Array.from(el.attributes).forEach(function (a) {
        if (/^on/i.test(a.name)) el.removeAttribute(a.name);
        else {
          var value = a.value.replace(/url\(#([^)]+)\)/g, function (all, id) { return 'url(#' + (ids.get(id) || id) + ')'; });
          if (['href', 'xlink:href'].includes(a.name) && value[0] === '#' && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
          el.setAttribute(a.name, value);
        }
      });
    });
    svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', slides[current].title); return svg;
  }
  function diagram(original) {
    var figure = node('figure', 'm-diagram');
    var open = button('m-diagram-preview', '', function () { openDiagram(original); });
    open.setAttribute('aria-label', 'Sxemani katta oynada ochish'); open.appendChild(svgCopy(original));
    var caption = node('span', 'm-diagram-caption', 'Sxemani ochish'); caption.prepend(icon('maximize-2')); open.appendChild(caption); figure.appendChild(open);
    var labels = Array.from(original.querySelectorAll('text')).map(function (t) { return t.textContent.trim(); }).filter(Boolean);
    var tips = Array.from(original.querySelectorAll('[data-tip]')).map(function (el) { return el.getAttribute('data-tip'); });
    if (labels.length || tips.length) {
      var details = node('details', 'm-diagram-labels'), summary = node('summary', '', 'Sxemadagi matn va izohlar'); details.appendChild(summary);
      var list = node('ul'); Array.from(new Set(labels.concat(tips))).forEach(function (text) { list.appendChild(node('li', '', text)); }); details.appendChild(list); figure.appendChild(details);
    }
    return figure;
  }
  function codeBlock(original) {
    var raw = original.querySelector('code') || original;
    var text = raw.textContent.replace(/^\n/, '').replace(/\s+$/, '');
    var language = (raw.className.match(/language-([\w+-]+)/) || [])[1] || (original.classList.contains('terminal') ? 'Terminal' : 'Kod');
    var box = node('section', 'm-code'), header = node('div', 'm-code-header'), pre = node('pre', 'm-code-wrap');
    header.appendChild(node('span', '', language));
    var wrap = button('m-code-action', "Qatorni o'rash", function () { var on = !pre.classList.contains('m-code-wrap'); pre.classList.toggle('m-code-wrap', on); wrap.setAttribute('aria-pressed', String(on)); });
    wrap.setAttribute('aria-pressed', 'true'); header.appendChild(wrap);
    header.appendChild(button('m-code-action', 'Nusxa', async function (event) {
      var target = event.currentTarget;
      try { await navigator.clipboard.writeText(text); target.textContent = 'Nusxalandi'; setTimeout(function () { target.textContent = 'Nusxa'; }, 1800); }
      catch (_) { target.textContent = 'Belgilab nusxalang'; }
    }));
    pre.appendChild(node('code', '', text)); box.append(header, pre); return box;
  }
  function tableCards(table) {
    var rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return null;
    function originalTable() {
      var region = node('div', 'm-table-scroll'); region.setAttribute('role', 'region'); region.setAttribute('aria-label', 'Jadval, yon tomonga surish mumkin'); region.tabIndex = 0;
      var clean = node('table'); if (table.caption) clean.appendChild(children(table.caption, node('caption')));
      rows.forEach(function (r) { var tr = node('tr'); Array.from(r.children).forEach(function (c) { var cell = children(c, node(c.tagName.toLowerCase())); ['rowspan','colspan'].forEach(function (key) { if (c.hasAttribute(key)) cell.setAttribute(key, c.getAttribute(key)); }); tr.appendChild(cell); }); clean.appendChild(tr); });
      region.appendChild(clean); return region;
    }
    if (table.querySelector('[rowspan],[colspan]')) {
      return originalTable();
    }
    var original = originalTable();
    var hasHeader = rows[0].querySelector('th'), labels = hasHeader ? Array.from(rows.shift().children).map(function (c) { return c.textContent.trim(); }) : [];
    var list = node('div', 'm-table-cards');
    if (table.caption) list.appendChild(children(table.caption, node('h3', 'm-table-caption')));
    rows.forEach(function (row) { var record = node('dl', 'm-record'); Array.from(row.children).forEach(function (cell, index) { record.append(node('dt', '', labels[index] || 'Ustun ' + (index + 1)), children(cell, node('dd'))); }); list.appendChild(record); });
    var preview = node('details', 'm-table-original'); preview.append(node('summary', '', 'Jadval ko‘rinishi'), original); list.appendChild(preview); return list;
  }
  function flip(original) {
    var details = node('details', 'm-definition'), front = original.querySelector('.front'), back = original.querySelector('.back');
    var summary = children(front || original, node('summary')); summary.appendChild(icon('chevron-down')); details.appendChild(summary);
    if (back) details.appendChild(children(back, node('div', 'm-definition-body'))); return details;
  }
  function quiz(original) {
    var wrap = node('section', 'm-quiz'), prompt = original.querySelector('.q');
    if (prompt) wrap.appendChild(children(prompt, node('h3')));
    var options = node('div', 'm-quiz-options'), buttons = [], answered = false, explanation = original.querySelector('.explain');
    Array.from(original.querySelectorAll('.opt')).forEach(function (option) {
      var choice = children(option, button('m-quiz-option', '', function () {
        if (answered) return; answered = true;
        buttons.forEach(function (b) { b.el.disabled = true; if (b.correct) { b.el.classList.add('correct'); b.el.setAttribute('aria-label', b.el.textContent + ' — to‘g‘ri javob'); } });
        if (!option.hasAttribute('data-ok')) choice.classList.add('incorrect');
        var feedback = node('div', 'm-feedback'); feedback.setAttribute('role', 'status');
        feedback.appendChild(node('strong', '', option.hasAttribute('data-ok') ? 'To‘g‘ri!' : 'To‘g‘ri javob belgilandi.'));
        if (explanation) children(explanation, feedback); wrap.appendChild(feedback);
      })); buttons.push({ el: choice, correct: option.hasAttribute('data-ok') }); options.appendChild(choice);
    }); wrap.appendChild(options); return wrap;
  }
  function switcher(original, stepper) {
    var parts = Array.from(original.querySelectorAll(stepper ? ':scope > .stp' : ':scope > .swap-p'));
    var labels = stepper ? parts.map(function (_, i) { return (i + 1) + '-qadam'; }) : Array.from(original.querySelectorAll('.swap-tabs button')).map(function (b) { return b.textContent; });
    var group = node('section', 'm-switcher'), tabs = node('div', 'm-switch-tabs'), pane = node('div', 'm-switch-content'), buttons = [];
    parts.forEach(function (part, index) {
      var control = button('m-switch-tab', labels[index] || (index + 1) + '-qadam', function () { show(index); });
      tabs.appendChild(control); buttons.push(control);
    });
    function show(index) { buttons.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === index)); }); pane.replaceChildren(); children(parts[index], pane); }
    group.append(tabs, pane); if (parts.length) show(0); return group;
  }
  function convert(from) {
    if (from.nodeType === Node.TEXT_NODE) return document.createTextNode(from.textContent);
    if (from.nodeType !== Node.ELEMENT_NODE) return null;
    var tag = from.tagName.toLowerCase(), cls = from.classList;
    if (['script','style','aside','noscript'].includes(tag) || cls.contains('notes') || cls.contains('flip-hint') || cls.contains('illus-hint') || cls.contains('stp-nav')) return null;
    if (cls.contains('arrow')) return null;
    if (tag === 'i' && from.hasAttribute('data-ic')) return icon(from.getAttribute('data-ic'));
    if (tag === 'svg') return cls.contains('ic') || cls.contains('ic-s') ? svgCopy(from) : diagram(from);
    if (tag === 'pre') return codeBlock(from);
    if (tag === 'input' || tag === 'textarea') {
      var field = node(tag, 'm-demo-input'); field.readOnly = true;
      if (tag === 'input') field.type = ['text','email','password','number','checkbox','radio'].includes(from.getAttribute('type')) ? from.getAttribute('type') : 'text';
      field.placeholder = from.getAttribute('placeholder') || ''; field.value = from.getAttribute('value') || from.textContent || '';
      field.setAttribute('aria-label', from.getAttribute('aria-label') || field.placeholder || 'Namuna maydoni');
      if (['checkbox','radio'].includes(field.type)) { field.checked = from.hasAttribute('checked'); field.disabled = true; }
      return field;
    }
    if (tag === 'table') return tableCards(from);
    if (cls.contains('flip')) return flip(from);
    if (cls.contains('quiz')) return quiz(from);
    if (cls.contains('stepper')) return switcher(from, true);
    if (cls.contains('swap')) return switcher(from, false);
    if (cls.contains('count')) return node('span', 'm-count', Number(from.dataset.to || 0).toFixed(Number(from.dataset.dec || 0)) + (from.dataset.suf || ''));
    if (tag === 'img') { var img = node('img', cls.contains('logo-big') ? 'm-logo' : 'm-image'); img.src = from.getAttribute('src'); img.alt = from.getAttribute('alt') || ''; img.loading = 'lazy'; return img; }
    var allowed = ['p','ul','ol','li','strong','em','b','small','code','kbd','br','hr','a','sub','sup','mark','q','blockquote','abbr','dl','dt','dd','h1','h2','h3','h4'];
    var result = node(allowed.includes(tag) ? tag : tag === 'span' ? 'span' : 'div');
    if (['h1','h2','h3','h4'].includes(tag)) result.className = 'm-heading';
    else if (cls.contains('card') || cls.contains('side') || cls.contains('step') || cls.contains('tl')) result.className = 'm-panel';
    else if (cls.contains('stat')) result.className = 'm-stat';
    else if (cls.contains('v')) result.className = 'm-stat-value';
    else if (cls.contains('l')) result.className = 'm-secondary';
    else if (cls.contains('badge') || cls.contains('chip') || cls.contains('level')) result.className = 'm-chip';
    else if (cls.contains('num')) result.className = 'm-section-number';
    else if (cls.contains('callout')) result.className = 'm-callout' + (cls.contains('warn') || cls.contains('bad') ? ' warning' : '');
    else if (cls.contains('task')) result.className = 'm-task';
    else if (cls.contains('cards') || cls.contains('stats') || cls.contains('cols') || cls.contains('flow') || cls.contains('vs') || cls.contains('timeline')) result.className = 'm-stack';
    else if (cls.contains('icon') || cls.contains('big-icon')) result.className = 'm-icon-wrap';
    else if (cls.contains('browser') || cls.contains('phone')) result.className = 'm-preview';
    else if (cls.contains('bar')) result.className = 'm-preview-bar';
    else if (cls.contains('small') || cls.contains('muted')) result.className = 'm-secondary';
    else if (cls.contains('swatches')) result.className = 'm-stack';
    else if (cls.contains('sw')) result.className = 'm-swatch';
    else if (tag === 'div') result.className = 'm-block';
    // Preserve authored colour examples, never authored desktop dimensions.
    ['color','background-color','border-color'].forEach(function (property) {
      var value = from.style.getPropertyValue(property);
      if (value && !/url\(/i.test(value)) result.style.setProperty(property, value);
    });
    if (tag === 'a') { var href = from.getAttribute('href') || ''; if (/^(https?:|mailto:|#|\/|\.)/i.test(href)) { result.href = href; if (/^https?:/.test(href)) { result.target = '_blank'; result.rel = 'noopener'; } } }
    if (tag === 'abbr' && from.title) result.title = from.title;
    return children(from, result);
  }
  function renderCard(index) {
    if (cache.has(index)) return cache.get(index);
    var sourceSlide = slides[index].el, card = node('article', 'm-card');
    card.setAttribute('data-card-index', index); card.setAttribute('data-card-count', slides.length);
    var meta = node('div', 'm-card-meta'); meta.append(node('span', '', (index + 1) + ' / ' + slides.length), node('span', '', sourceSlide.classList.contains('sec') ? 'BO‘LIM' : 'DARS KARTASI')); card.appendChild(meta);
    children(sourceSlide, card);
    if (index === slides.length - 1) { var back = node('a', 'm-back-to-lesson', 'Darsga qaytish'); back.href = document.querySelector('.viewer-back').href; card.appendChild(back); }
    cache.set(index, card); return card;
  }
  function update() {
    document.getElementById('deck-position').textContent = (current + 1) + ' / ' + slides.length;
    previous.disabled = current === 0 && (cardsMode || !R.getCurrentSlide()?.querySelector('.fragment.visible'));
    next.disabled = current === slides.length - 1 && (cardsMode || !R.getCurrentSlide()?.querySelector('.fragment:not(.visible)'));
    document.getElementById('deck-progress-fill').style.width = ((current + 1) / slides.length * 100) + '%';
  }
  function go(index, focus) {
    fontMenu.hidden = true; document.getElementById('deck-font-toggle').setAttribute('aria-expanded', 'false');
    current = Math.max(0, Math.min(slides.length - 1, index));
    if (cardsMode) {
      scroll.replaceChildren(renderCard(current)); scroll.scrollTop = 0;
      history.replaceState(null, '', location.pathname + location.search + '#card=' + (current + 1));
      var heading = scroll.querySelector('.m-heading'); if (heading && focus) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      document.getElementById('deck-status').textContent = (current + 1) + ' / ' + slides.length + '. ' + slides[current].title;
    } else if (R.isReady()) R.slide(slides[current].h, slides[current].v);
    update();
  }
  var phone = innerWidth < 760 || (innerWidth < 960 && innerHeight < 560);
  var preferenceKey = 'axv-deck-view-v3-' + (phone ? 'phone' : 'desktop');
  async function setMode(value, initial) {
    closeOverlay(); cardsMode = value; document.documentElement.classList.toggle('card-mode', value);
    document.documentElement.classList.remove('reading-mode'); root.hidden = !value; root.inert = !value;
    var deck = document.querySelector('.reveal'); deck.inert = value; deck.setAttribute('aria-hidden', String(value));
    readingButton.setAttribute('aria-pressed', String(value)); presentationButton.setAttribute('aria-pressed', String(!value));
    if (!initial) try { localStorage.setItem(preferenceKey, value ? 'cards' : 'presentation'); } catch (_) {}
    if (value) { if (R.isReady()) R.configure({ keyboard: false, touch: false }); go(current); }
    else {
      history.replaceState(null, '', location.pathname + location.search + '#/' + slides[current].h + '/' + slides[current].v);
      await window.AXVStartPresentation();
      if (cardsMode) { R.configure({ keyboard: false, touch: false }); return; }
      R.configure({ keyboard: true, touch: true }); R.slide(slides[current].h, slides[current].v); R.layout(); update();
    }
  }
  readingButton.addEventListener('click', function () { setMode(true); }); presentationButton.addEventListener('click', function () { setMode(false); });
  previous.addEventListener('click', function () { if (cardsMode) go(current - 1, true); else R.prev(); });
  next.addEventListener('click', function () { if (cardsMode) go(current + 1, true); else R.next(); });
  R.on('slidechanged', function (event) { if (!cardsMode) { var at = R.getIndices(event.currentSlide); current = Math.max(0, slides.findIndex(function (s) { return s.h === at.h && s.v === (at.v || 0); })); update(); } });
  R.on('fragmentshown', update); R.on('fragmenthidden', update);
  var touch;
  scroll.addEventListener('touchstart', function (e) { if (e.touches.length === 1 && !e.target.closest('button,a,pre,.m-diagram,.m-table-scroll,input,summary')) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; else touch = null; }, { passive: true });
  scroll.addEventListener('touchend', function (e) { if (!touch || e.changedTouches.length !== 1) return; var dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) go(current + (dx < 0 ? 1 : -1), true); touch = null; }, { passive: true });

  // Dialogs: contents and diagrams. Escape and focus stay predictable on phones.
  function closeOverlay() {
    if (overlay.hidden) return;
    overlay.hidden = true; overlay.replaceChildren();
    document.querySelector('.viewer-header').inert = false; document.querySelector('.viewer-footer').inert = false;
    root.inert = !cardsMode; document.querySelector('.reveal').inert = cardsMode;
    if (R.isReady()) R.configure({ keyboard: !cardsMode, touch: !cardsMode });
    lastFocus?.focus();
  }
  function openOverlay(title, cls) {
    lastFocus = document.activeElement; overlay.replaceChildren(); overlay.hidden = false;
    document.querySelector('.viewer-header').inert = true; document.querySelector('.viewer-footer').inert = true;
    root.inert = true; document.querySelector('.reveal').inert = true;
    if (R.isReady()) R.configure({ keyboard: false, touch: false });
    var dialog = node('section', 'deck-dialog ' + (cls || '')); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', title);
    var header = node('header', 'deck-dialog-header'); header.append(node('h2', '', title), button('deck-dialog-close', 'Yopish', closeOverlay)); dialog.appendChild(header); overlay.appendChild(dialog);
    requestAnimationFrame(function () { header.querySelector('button').focus(); }); return dialog;
  }
  document.getElementById('deck-contents').addEventListener('click', function () {
    var dialog = openOverlay('Dars mundarijasi'), list = node('ol', 'deck-toc');
    slides.forEach(function (slide, index) { var control = button('deck-toc-item', '', function () { closeOverlay(); go(index, true); }); control.dataset.index = index; control.append(node('span', '', String(index + 1).padStart(2, '0')), node('span', '', slide.title)); if (index === current) control.setAttribute('aria-current', 'step'); var li = node('li'); li.appendChild(control); list.appendChild(li); }); dialog.appendChild(list);
  });
  function openDiagram(original) {
    var dialog = openOverlay('Sxema', 'deck-diagram-dialog'), viewport = node('div', 'deck-image-viewport'), stage = node('div', 'deck-image-stage'), tools = node('div', 'deck-image-tools');
    var image = svgCopy(original), scale = 1, points = new Map(), gesture, baseWidth;
    stage.appendChild(image); viewport.appendChild(stage); dialog.appendChild(viewport);
    var label = node('span', '', '100%');
    function zoom(value, cx, cy) {
      var old = scale, box = image.viewBox.baseVal;
      baseWidth = Math.min(viewport.clientWidth, box.height ? Math.max(1, viewport.clientHeight - 40) * box.width / box.height : viewport.clientWidth);
      scale = Math.max(1, Math.min(6, value));
      var x = cx === undefined ? viewport.clientWidth / 2 : cx, y = cy === undefined ? viewport.clientHeight / 2 : cy;
      var oldOffset = Math.max(0, (viewport.clientWidth - baseWidth * old) / 2);
      var newOffset = Math.max(0, (viewport.clientWidth - baseWidth * scale) / 2);
      var contentX = (viewport.scrollLeft + x - oldOffset) / old, contentY = (viewport.scrollTop + y) / old;
      stage.style.width = baseWidth * scale + 'px'; label.textContent = Math.round(scale * 100) + '%';
      viewport.scrollLeft = contentX * scale + newOffset - x; viewport.scrollTop = contentY * scale - y;
    }
    tools.append(button('', '−', function () { zoom(scale / 1.4); }), button('', 'Sig‘dirish', function () { zoom(1); viewport.scrollLeft = 0; viewport.scrollTop = 0; }), label, button('', '+', function () { zoom(scale * 1.4); }));
    tools.firstChild.setAttribute('aria-label', 'Sxemani kichraytirish'); tools.lastChild.setAttribute('aria-label', 'Sxemani kattalashtirish'); dialog.appendChild(tools);
    dialog.appendChild(node('p', 'deck-image-hint', 'Ikki barmoq bilan kattalashtiring. Surib boshqa qismini ko‘ring.'));
    viewport.addEventListener('pointerdown', function (e) {
      points.set(e.pointerId, { x: e.clientX, y: e.clientY }); viewport.setPointerCapture(e.pointerId);
      var values = Array.from(points.values());
      gesture = values.length === 2 ? { distance: Math.hypot(values[0].x-values[1].x, values[0].y-values[1].y), scale: scale } : { x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!points.has(e.pointerId) || !gesture) return; points.set(e.pointerId, { x: e.clientX, y: e.clientY }); var values = Array.from(points.values());
      if (values.length === 2 && gesture.distance) { var rect = viewport.getBoundingClientRect(); zoom(gesture.scale * Math.hypot(values[0].x-values[1].x, values[0].y-values[1].y) / gesture.distance, (values[0].x+values[1].x)/2-rect.left, (values[0].y+values[1].y)/2-rect.top); }
      else if (values.length === 1 && gesture.left !== undefined) { viewport.scrollLeft = gesture.left - (e.clientX - gesture.x); viewport.scrollTop = gesture.top - (e.clientY - gesture.y); }
    });
    function release(e) { points.delete(e.pointerId); var first = Array.from(points.values())[0]; gesture = first ? { x:first.x, y:first.y,left:viewport.scrollLeft,top:viewport.scrollTop } : null; }
    viewport.addEventListener('pointerup', release); viewport.addEventListener('pointercancel', release);
    requestAnimationFrame(function () { zoom(1); });
  }
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOverlay(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeOverlay(); fontMenu.hidden = true; document.getElementById('deck-font-toggle').setAttribute('aria-expanded', 'false'); }
    if (!overlay.hidden && e.key === 'Tab') { var items = Array.from(overlay.querySelectorAll('button,a,input,select,[tabindex="0"]')); if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); } else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); } return; }
    if (cardsMode && overlay.hidden && !e.ctrlKey && !e.metaKey && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !e.target.closest('pre')) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1, true); }
    }
  });
  var fontToggle = document.getElementById('deck-font-toggle');
  fontToggle.addEventListener('click', function () { fontMenu.hidden = !fontMenu.hidden; fontToggle.setAttribute('aria-expanded', String(!fontMenu.hidden)); });
  document.addEventListener('click', function (event) { if (!fontMenu.hidden && !fontMenu.contains(event.target) && !fontToggle.contains(event.target)) { fontMenu.hidden = true; fontToggle.setAttribute('aria-expanded', 'false'); } });
  function setFont(delta, reset) {
    var scale = parseFloat(document.documentElement.style.getPropertyValue('--slide-font-scale')) || 1;
    scale = reset ? 1 : Math.max(.9, Math.min(1.5, Math.round((scale + delta)*10)/10));
    document.documentElement.style.setProperty('--slide-font-scale', scale); document.body.style.setProperty('--slide-font-scale', scale);
    try { localStorage.setItem('axv-slide-font-scale', String(scale)); } catch (_) {}
    document.getElementById('reader-reset').textContent = Math.round(scale*100)+'%'; if (R.isReady()) R.layout();
  }
  document.getElementById('reader-smaller').addEventListener('click', function () { setFont(-.1); });
  document.getElementById('reader-larger').addEventListener('click', function () { setFont(.1); });
  document.getElementById('reader-reset').addEventListener('click', function () { setFont(0, true); });
  var saved; try { saved = localStorage.getItem(preferenceKey); } catch (_) {}
  setFont(0);
  setMode(hashCard ? true : saved ? saved === 'cards' : phone, true);
})();
