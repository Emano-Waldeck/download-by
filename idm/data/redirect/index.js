'use strict';

document.getElementById('back').addEventListener('click', () => history.back());


document.getElementById('name').textContent = chrome.runtime.getManifest().name;
var args = location.search.substr(1).split('&').reduce((p, s) => {
  const [key, value] = s.split('=');
  p[key] = decodeURIComponent(value);

  return p;
}, {});

document.getElementById('range').textContent = args.range || '-';
document.getElementById('size').textContent = args.size || '-';
document.getElementById('type').textContent = args.type || '-';
document.getElementById('url').textContent = args.url || '-';

if (!args.type) {
  document.getElementById('exception').disabled = true;
}

document.getElementById('exception').addEventListener('click', () => chrome.storage.local.get({
  whitelist: []
}, prefs => {
  prefs.whitelist.push(args.type);
  const whitelist = prefs.whitelist.filter((s, i, l) => s && l.indexOf(s) === i);
  chrome.storage.local.set({whitelist}, () => history.back());
}));

document.getElementById('options').addEventListener('click', () => chrome.runtime.openOptionsPage());
