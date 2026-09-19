/* 24 Meals for 24 — interactions.
   Plain ES2019, no build step. Everything degrades: without JS the page is
   still a readable menu and a printable stamp card. */
(function () {
  'use strict';

  var STORE_KEY = 'meals24.jeeviga.v1';
  var THEME_KEY = 'meals24.theme';
  var TOTAL = 24;

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ------------------------------------------------------------ storage -- */

  function blank() {
    var a = new Array(TOTAL);
    for (var i = 0; i < TOTAL; i++) a[i] = null;
    return a;
  }

  function load() {
    var out = blank();
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return out;
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return out;
      for (var i = 0; i < TOTAL; i++) {
        var e = parsed[i];
        if (e && typeof e === 'object' && e.name) {
          out[i] = { dish: Number(e.dish) || 0, name: String(e.name), at: String(e.at || '') };
        }
      }
      return out;
    } catch (err) {
      return out;
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(stamps));
    } catch (err) { /* private mode or blocked storage — the page still works */ }
  }

  var stamps = load();

  /* -------------------------------------------------------------- theme -- */

  var root = document.documentElement;

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    var btn = $('[data-theme-toggle]');
    if (btn) {
      btn.setAttribute('aria-label',
        mode === 'dark' ? 'Switch to daylight mode' : 'Switch to candlelight mode');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#181310' : '#f6efe4');
  }

  (function initTheme() {
    var saved = null;
    try { saved = window.localStorage.getItem(THEME_KEY); } catch (err) {}
    if (saved !== 'dark' && saved !== 'light') {
      saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
    }
    applyTheme(saved);
  }());

  var themeBtn = $('[data-theme-toggle]');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { window.localStorage.setItem(THEME_KEY, next); } catch (err) {}
    });
  }

  /* -------------------------------------------------------------- toast -- */

  var toast      = $('[data-toast]');
  var toastText  = $('[data-toast-text]');
  var toastUndo  = $('[data-toast-undo]');
  var toastTimer = null;
  var undoAction = null;

  function showToast(message, onUndo) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toastText.textContent = message;
    undoAction = onUndo || null;
    toastUndo.hidden = !undoAction;
    toast.hidden = false;
    void toast.offsetWidth;            /* force a frame so the transition runs */
    toast.classList.add('is-on');
    toastTimer = window.setTimeout(hideToast, onUndo ? 7000 : 4500);
  }

  function hideToast() {
    if (!toast) return;
    toast.classList.remove('is-on');
    undoAction = null;
  }

  if (toastUndo) {
    toastUndo.addEventListener('click', function () {
      var fn = undoAction;
      hideToast();
      if (fn) fn();
    });
  }

  /* ------------------------------------------------------------- dialog -- */

  var sheet = $('[data-confirm]');

  function confirmAsk(title, body, okLabel) {
    return new Promise(function (resolve) {
      if (!sheet || typeof sheet.showModal !== 'function') {
        resolve(window.confirm(title + '\n\n' + body));
        return;
      }
      $('[data-confirm-title]', sheet).textContent = title;
      $('[data-confirm-body]', sheet).textContent = body;
      $('[data-confirm-ok]', sheet).textContent = okLabel;
      function done() {
        sheet.removeEventListener('close', done);
        resolve(sheet.returnValue === 'ok');
      }
      sheet.addEventListener('close', done);
      sheet.returnValue = 'cancel';
      sheet.showModal();
    });
  }

  /* ------------------------------------------------------------ helpers -- */

  /* restart a one-shot animation class and always clean it up afterwards
     (animationend can be missed in a background tab, so a timer backs it up) */
  function flash(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    window.setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  function dishEl(no) { return $('.dish[data-dish="' + no + '"]'); }

  function dishName(no) {
    var el = dishEl(no);
    return el ? el.getAttribute('data-name') : 'a meal';
  }

  function firstFree() {
    for (var i = 0; i < TOTAL; i++) if (!stamps[i]) return i;
    return -1;
  }

  function usedCount() {
    var n = 0;
    for (var i = 0; i < TOTAL; i++) if (stamps[i]) n++;
    return n;
  }

  function today() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  function prettyDate(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d.getTime())) return iso;
    try {
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (err) {
      return iso;
    }
  }

  /* ---------------------------------------------------------- rendering -- */

  var tallyLine   = $('[data-tally]');
  var tallyFill   = $('[data-tally-fill]');
  var countBadge  = $('[data-count-badge]');
  var journal     = $('[data-journal]');
  var journalList = $('[data-journal-list]');

  function renderStamps(justUsedIndex) {
    $$('.stamp').forEach(function (li, i) {
      var entry = stamps[i];
      var btn = $('.stamp__btn', li);
      if (entry) {
        li.classList.add('is-used');
        btn.setAttribute('aria-label',
          'Stamp ' + (i + 1) + ', used for ' + entry.name +
          (entry.at ? ' on ' + prettyDate(entry.at) : '') + '. Activate to free it again.');
        btn.title = entry.name + (entry.at ? ' — ' + prettyDate(entry.at) : '');
        btn.removeAttribute('tabindex');
      } else {
        li.classList.remove('is-used');
        btn.setAttribute('aria-label', 'Stamp ' + (i + 1) + ', still unused');
        btn.removeAttribute('title');
        btn.setAttribute('tabindex', '-1');
      }
      li.classList.remove('just-used');
    });

    if (typeof justUsedIndex === 'number' && justUsedIndex >= 0) {
      flash($('.stamp[data-stamp="' + (justUsedIndex + 1) + '"]'), 'just-used', 800);
    }
  }

  function renderTally() {
    var used = usedCount();
    var left = TOTAL - used;

    if (countBadge) countBadge.textContent = used + '/' + TOTAL;
    if (tallyFill) tallyFill.style.width = (used / TOTAL * 100) + '%';

    if (tallyLine) {
      if (used === 0) {
        tallyLine.innerHTML = 'No stamps used yet &mdash; 24 dinners waiting.';
      } else if (left === 0) {
        tallyLine.innerHTML = 'All <strong>24</strong> stamps used. What a year. Time to negotiate year two.';
      } else {
        tallyLine.innerHTML = '<strong>' + used + '</strong> of 24 used &middot; ' +
          left + (left === 1 ? ' dinner' : ' dinners') + ' left.';
      }
    }

    $$('.dish__book').forEach(function (btn) {
      var out = left === 0;
      btn.disabled = out;
      $('span', btn).textContent = out ? 'All stamps used' : 'Use a stamp';
    });
  }

  function renderJournal() {
    if (!journal || !journalList) return;

    var rows = [];
    for (var i = 0; i < TOTAL; i++) {
      if (stamps[i]) rows.push({ index: i, entry: stamps[i] });
    }
    rows.reverse();

    journal.hidden = rows.length === 0;
    journalList.textContent = '';

    rows.forEach(function (row) {
      var li = document.createElement('li');
      li.className = 'journal__row';

      var no = document.createElement('span');
      no.className = 'journal__no';
      no.textContent = String(row.index + 1);

      var name = document.createElement('span');
      name.className = 'journal__name';
      name.textContent = row.entry.name;

      var date = document.createElement('span');
      date.className = 'journal__date';
      date.textContent = prettyDate(row.entry.at);

      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'journal__x';
      x.setAttribute('aria-label', 'Free stamp ' + (row.index + 1) + ' (' + row.entry.name + ')');
      x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M6 6l12 12M18 6 6 18"/></svg>';
      x.addEventListener('click', function () { askRelease(row.index); });

      li.appendChild(no);
      li.appendChild(name);
      li.appendChild(date);
      li.appendChild(x);
      journalList.appendChild(li);
    });
  }

  function renderAll(justUsedIndex) {
    renderStamps(justUsedIndex);
    renderTally();
    renderJournal();
  }

  /* ------------------------------------------------------------ actions -- */

  function book(no) {
    var slot = firstFree();
    if (slot < 0) {
      showToast('Every one of the 24 stamps is used. Ask nicely for a refill.');
      return;
    }

    stamps[slot] = { dish: no, name: dishName(no), at: today() };
    save();
    renderAll(slot);
    flash(dishEl(no), 'is-picked', 1200);

    showToast('Stamp ' + (slot + 1) + ' goes to ' + dishName(no) + '. Now call me with a day.',
      function () {
        stamps[slot] = null;
        save();
        renderAll();
      });
  }

  function askRelease(index) {
    var entry = stamps[index];
    if (!entry) return;

    confirmAsk(
      'Free stamp ' + (index + 1) + '?',
      'It is marked as used for ' + entry.name + '. Freeing it puts the dinner back on the card.',
      'Free it'
    ).then(function (ok) {
      if (!ok) return;
      stamps[index] = null;
      save();
      renderAll();
      showToast('Stamp ' + (index + 1) + ' is back on the card.', function () {
        stamps[index] = entry;
        save();
        renderAll(index);
      });
    });
  }

  $$('[data-book]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      book(Number(btn.getAttribute('data-book')));
    });
  });

  $$('[data-release]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      askRelease(Number(btn.getAttribute('data-release')) - 1);
    });
  });

  var resetBtn = $('[data-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var backup = stamps.slice();
      confirmAsk(
        'Clear the whole card?',
        'All 24 stamps go back to unused and the list of meals is wiped from this device.',
        'Clear it'
      ).then(function (ok) {
        if (!ok) return;
        stamps = blank();
        save();
        renderAll();
        showToast('Fresh card. 24 dinners again.', function () {
          stamps = backup.slice();
          save();
          renderAll();
        });
      });
    });
  }

  /* ------------------------------------------------------------- filter -- */

  function setFilter(want) {
    $$('[data-filter]').forEach(function (c) {
      var on = c.getAttribute('data-filter') === want;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $$('.dish').forEach(function (d) {
      d.hidden = want !== 'all' && d.getAttribute('data-course') !== want;
    });
  }

  $$('[data-filter]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      setFilter(chip.getAttribute('data-filter'));
    });
  });

  /* ----------------------------------------------------------- surprise -- */

  var surprise = $('[data-surprise]');
  if (surprise) {
    surprise.addEventListener('click', function () {
      /* the birthday cake (12) is the grand finale — it is not raffled off */
      var pool = $$('.dish').filter(function (d) {
        return d.getAttribute('data-dish') !== '12';
      });
      if (!pool.length) return;

      var pickEl = pool[Math.floor(Math.random() * pool.length)];
      var no = Number(pickEl.getAttribute('data-dish'));

      setFilter('all');
      flash(pickEl, 'is-picked', 1200);
      pickEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Tonight: ' + dishName(no) + ' (No. ' + (no < 10 ? '0' + no : no) + ').');
    });
  }

  /* -------------------------------------------------------------- print -- */

  var printBtn = $('[data-print]');
  if (printBtn) {
    printBtn.addEventListener('click', function () { window.print(); });
  }

  /* ------------------------------------------------------------- polish -- */

  var topbar = $('.topbar');
  if (topbar) {
    var onScroll = function () { topbar.classList.toggle('is-stuck', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* gentle reveal as sections come into view, rAF-throttled. Written so that
     content can never stay stuck at opacity 0 if a frame is missed. */
  (function revealOnScroll() {
    var targets = $$('.hero__body, .steps__list, .sectionhead, .filters, .dish, .tally, .stampgrid, .outro');
    if (!targets.length) return;
    targets.forEach(function (el) { el.setAttribute('data-reveal', ''); });

    var ticking = false;

    function check() {
      ticking = false;
      var limit = (window.innerHeight || 0) * 0.94;
      targets = targets.filter(function (el) {
        if (el.getBoundingClientRect().top > limit) return true;
        el.classList.add('is-in');
        return false;
      });
      if (!targets.length) {
        window.removeEventListener('scroll', request);
        window.removeEventListener('resize', request);
      }
    }

    function request() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(check);
    }

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    check();
    window.setTimeout(check, 1200);   /* late sweep, in case webfonts reflow */
    window.addEventListener('beforeprint', function () {
      $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    });
  }());

  renderAll();
}());
