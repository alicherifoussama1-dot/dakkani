// ============================================================
// Scripts injected into the page, and the messages they send back.
//
// Everything here runs INSIDE the website's origin, which is the point:
// the session cookies are there, so authenticated work (registering the
// push token, fetching a protected export) succeeds without the shell
// ever handling a credential. Nothing here alters what the page renders.
// ============================================================

/** Messages the page can post to the shell. */
export type BridgeMessage =
  | { type: 'download'; name: string; mime: string; base64: string }
  | { type: 'download-failed'; name: string }

/** Registers this device against the live session.
 *
 *  Runs as a page script so it inherits the cookie jar — RN's fetch has its
 *  own, and would hit the endpoint logged out. `previous` unregisters the
 *  row a rotated token replaced, otherwise one device notifies twice. */
export function registerDeviceScript(opts: {
  token: string; platform: 'ios' | 'android'; appVersion: string; previous?: string | null
}) {
  const { token, platform, appVersion, previous } = opts
  return `(function(){
    try {
      var prev = ${JSON.stringify(previous ?? null)};
      var done = function(){
        fetch('/api/mobile/v1/devices', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: ${JSON.stringify(token)},
            platform: ${JSON.stringify(platform)},
            app_version: ${JSON.stringify(appVersion)},
            locale: 'ar'
          })
        }).catch(function(){});
      };
      if (prev && prev !== ${JSON.stringify(token)}) {
        fetch('/api/mobile/v1/devices?token=' + encodeURIComponent(prev), {
          method: 'DELETE', credentials: 'include'
        }).catch(function(){}).then(done, done);
      } else { done(); }
    } catch (e) {}
  })(); true;`
}

/** Navigates the site. Uses the SPA router when Next exposes it so the
 *  transition looks the way it does in a browser; falls back to a real
 *  navigation otherwise. */
export function navigateScript(path: string) {
  return `(function(){
    try {
      var p = ${JSON.stringify(path)};
      if (window.next && window.next.router && window.next.router.push) {
        window.next.router.push(p);
      } else {
        window.location.assign(p);
      }
    } catch (e) { window.location.assign(${JSON.stringify(path)}); }
  })(); true;`
}

/** Fetches a URL with the page's session and hands the bytes to the shell,
 *  which writes and opens them. Used for authenticated exports (CSV, PDF,
 *  invoices) — the system download manager has no session and would just
 *  save the login page. */
export function fetchFileScript(url: string, name: string) {
  return `(function(){
    try {
      fetch(${JSON.stringify(url)}, { credentials: 'include' })
        .then(function(r){ if(!r.ok) throw new Error('http'); return r.blob(); })
        .then(function(b){
          var fr = new FileReader();
          fr.onloadend = function(){
            var s = String(fr.result || '');
            var i = s.indexOf(',');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'download',
              name: ${JSON.stringify(name)},
              mime: b.type || 'application/octet-stream',
              base64: i >= 0 ? s.slice(i + 1) : ''
            }));
          };
          fr.onerror = function(){
            window.ReactNativeWebView.postMessage(JSON.stringify({ type:'download-failed', name: ${JSON.stringify(name)} }));
          };
          fr.readAsDataURL(b);
        })
        .catch(function(){
          window.ReactNativeWebView.postMessage(JSON.stringify({ type:'download-failed', name: ${JSON.stringify(name)} }));
        });
    } catch (e) {}
  })(); true;`
}

/** Installed on every page load. Catches the downloads a WebView would
 *  otherwise drop on the floor: `<a download>` and blob:/data: URLs, which
 *  never reach onShouldStartLoadWithRequest as navigations. */
export const DOWNLOAD_INTERCEPTOR = `(function(){
  if (window.__commercoDL) return; window.__commercoDL = true;

  function send(blob, name){
    var fr = new FileReader();
    fr.onloadend = function(){
      var s = String(fr.result || ''); var i = s.indexOf(',');
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'download', name: name,
        mime: blob.type || 'application/octet-stream',
        base64: i >= 0 ? s.slice(i + 1) : ''
      }));
    };
    fr.readAsDataURL(blob);
  }

  function nameFrom(a, url){
    var n = a && a.getAttribute('download');
    if (n) return n;
    try { var p = new URL(url, location.href).pathname.split('/').pop(); if (p) return decodeURIComponent(p); } catch(e){}
    return 'download';
  }

  document.addEventListener('click', function(ev){
    var a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var isBlob = href.indexOf('blob:') === 0 || href.indexOf('data:') === 0;
    if (!a.hasAttribute('download') && !isBlob) return;
    ev.preventDefault();
    var name = nameFrom(a, href);
    fetch(href, { credentials: 'include' })
      .then(function(r){ return r.blob(); })
      .then(function(b){ send(b, name); })
      .catch(function(){
        window.ReactNativeWebView.postMessage(JSON.stringify({ type:'download-failed', name: name }));
      });
  }, true);
})(); true;`
