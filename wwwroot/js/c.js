(function () {
  function src() {
    var q = new URLSearchParams(location.search);
    return (q.get('utm_source') || q.get('ref') || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 24);
  }
  function ref() {
    try { return new URL(document.referrer).hostname.slice(0, 48); } catch (x) { return ''; }
  }
  function kind(el) {
    var c = el.getAttribute('data-c');
    if (c) return c;
    if (/klacks-onprem[^\/]*\.zip|github\.com\/[^?#]*\/releases\//i.test(el.href)) return 'DownloadClick';
    if (/(^|\.)github\.com$/i.test(el.hostname)) return 'OutboundClick';
    if (el.host === location.host && /^\/docs(\/|$)/.test(el.pathname)) return 'OutboundClick';
    return '';
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-c],a[href]'), k = t ? kind(t) : '';
    if (k && navigator.sendBeacon) {
      navigator.sendBeacon('/_c', JSON.stringify({ e: k, p: location.pathname.slice(0, 64), s: src(), r: ref() }));
    }
  }, true);
})();
