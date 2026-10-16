(function () {
  var EARLY_TOGGLE_MS = 10000, TOGGLE = 'ExpertToggle', TOGGLE_EARLY = 'ExpertToggleEarly', PLAY_ATTR = 'data-c-play';
  var shownAt = Date.now(), played = new Set(), pageKey = location.pathname + location.search;
  function src() {
    var q = new URLSearchParams(location.search);
    return (q.get('utm_source') || q.get('ref') || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 24);
  }
  function ref() {
    try { return new URL(document.referrer).hostname.slice(0, 48); } catch (x) { return ''; }
  }
  function send(k) {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/_c', JSON.stringify({ e: k, p: location.pathname.slice(0, 64), s: src(), r: ref() }));
    }
  }
  function kind(el) {
    var c = el.getAttribute('data-c');
    if (c === TOGGLE && Date.now() - shownAt <= EARLY_TOGGLE_MS) return TOGGLE_EARLY;
    if (c) return c;
    if (/klacks-onprem[^\/]*\.zip|github\.com\/[^?#]*\/releases\//i.test(el.href)) return 'DownloadClick';
    if (/(^|\.)github\.com$/i.test(el.hostname)) return 'OutboundClick';
    if (el.host === location.host && /^\/docs(\/|$)/.test(el.pathname)) return 'OutboundClick';
    return '';
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-c],a[href]'), k = t ? kind(t) : '';
    if (k) send(k);
  }, true);
  document.addEventListener('play', function (ev) {
    var v = ev.target, k = v && v.getAttribute ? v.getAttribute(PLAY_ATTR) : null, id;
    if (!k) return;
    id = v.currentSrc || v.getAttribute('poster') || '';
    if (played.has(id)) return;
    played.add(id);
    send(k);
  }, true);
  window.klacksC = { pageShown: function () {
    var key = location.pathname + location.search;
    if (key === pageKey) return;
    pageKey = key; shownAt = Date.now(); played = new Set();
  } };
})();
