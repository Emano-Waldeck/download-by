/* globals webext, download */
'use strict';

var isFirefox = /Firefox/.test(navigator.userAgent);

var prefs = {
  enabled: false,
  whitelist: [],
  include: [
    '.3GP', '.7Z', '.AAC', '.ACE', '.AIF', '.ARJ', '.ASF', '.AVI', '.BIN', '.BZ2', '.EXE', '.GZ', '.GZIP',
    '.IMG', '.ISO', '.LZH', '.M4A', '.M4V', '.MKV', '.MOV', '.MP3', '.MP4', '.MPA', '.MPE', '.MPEG', '.MPG', '.MSI',
    '.MSU', '.OGG', '.OGV', '.PDF', '.PLJ', '.PPS', '.PPT', '.RAR', '.RMVB', '.SEA', '.SIT', '.SITX', '.TAR', '.TIF',
    '.TIFF', '.WAV', '.WMA', '.WMV', '.ZIP', '.DEB', '.RPM', '.APPIMAGE'
  ],
  range: false,
  size: 0,
  redirect: true,
  passphrase: '' // the user can set a passphrase for external requests being rendered by this extension
};
webext.storage.on('changed', ps => Object.keys(ps).forEach(key => prefs[key] = ps[key].newValue));

var observe = {};

observe.callback = d => {
  const {responseHeaders, url} = d;

/*  if (!initiator) {
    return;
  }*/
  const type = responseHeaders.filter(o => o.name === 'Content-Type' || o.name === 'content-type').shift();

  if (!type || type.value.startsWith('text/') || prefs.whitelist.indexOf(type.value) !== -1) {
    // console.log('skipped file type');
    return;
  }
  const size = responseHeaders.filter(o => o.name === 'Content-Length' || o.name === 'content-length').shift();
  if (prefs.size) {
    if (size && Number(size.value) <= prefs.size * 1024 * 1024) {
      // console.log('skipped file-size');
      return;
    }
  }
  const range = responseHeaders.filter(o => o.name === 'Accept-Ranges' || o.name === 'accept-ranges').shift();
  if (prefs.range) {
    if (range.value !== 'bytes') {
      // console.log('skipped does not support range');
      return;
    }
  }
  if (prefs.include.length) {
    if (!prefs.include.some(w => url.toLowerCase().indexOf(w.toLowerCase()) !== -1)) {
      // console.log('skipped not in the "include" list');
      return;
    }
  }
  download(d);
  if (prefs.redirect) {
    const redirectUrl = webext.runtime.getURL(
      `/data/redirect/index.html?type=${type.value}&size=${size.value}&range=${range.value}&url=${url}`
    );
    if (isFirefox) {
      window.setTimeout(() => chrome.tabs.update(d.tabId, {
        url: redirectUrl
      }), 0);
    }
    return {
      redirectUrl
    };
  }
  return {
    redirectUrl: 'javascript:'
  };
};
observe.install = () => {
  chrome.webRequest.onHeadersReceived.addListener(observe.callback, {
    urls: ['*://*/*'],
    types: ['main_frame', 'sub_frame']
  }, ['responseHeaders', 'blocking']);
  webext.browserAction.setIcon({
    path: {
      '16': 'data/icons/16.png',
      '18': 'data/icons/18.png',
      '19': 'data/icons/19.png',
      '32': 'data/icons/32.png',
      '36': 'data/icons/36.png',
      '38': 'data/icons/38.png',
      '48': 'data/icons/48.png',
      '64': 'data/icons/64.png'
    }
  });
  webext.browserAction.setTitle({
    title: 'integration is enabled'
  });
};

observe.remove = () => {
  chrome.webRequest.onHeadersReceived.removeListener(observe.callback);
  webext.browserAction.setIcon({
    path: {
      '16': 'data/icons/disabled/16.png',
      '18': 'data/icons/disabled/18.png',
      '19': 'data/icons/disabled/19.png',
      '32': 'data/icons/disabled/32.png',
      '36': 'data/icons/disabled/36.png',
      '38': 'data/icons/disabled/38.png',
      '48': 'data/icons/disabled/48.png',
      '64': 'data/icons/disabled/64.png'
    }
  });
  webext.browserAction.setTitle({
    title: 'integration is disabled'
  });
};

webext.storage.get(prefs).then(ps => {
  Object.assign(prefs, ps);
  if (prefs.enabled) {
    observe.install();
  }
  else {
    observe.remove();
  }
});

webext.storage.on('changed', () => {
  observe.remove();
  observe.install();
}).if(ps => ps.enabled && ps.enabled.newValue === true);

webext.storage.on('changed', () => {
  observe.remove();
}).if(ps => ps.enabled && ps.enabled.newValue === false);

webext.browserAction.on('clicked', () => webext.storage.set({
  enabled: !prefs.enabled
}));

// play links
{
  const {name} = webext.runtime.getManifest();

  webext.contextMenus.create({
    title: name + ' (media)',
    contexts: ['video', 'audio', 'image'],
    id: 'download-media',
    documentUrlPatterns: ['*://*/*'],
    targetUrlPatterns: [localStorage.getItem('targetUrlPattern-media') || '*://*/*']
  });
  webext.contextMenus.create({
    title: name + ' (link)',
    contexts: ['link'],
    id: 'download-link',
    documentUrlPatterns: ['*://*/*'],
    targetUrlPatterns: [localStorage.getItem('targetUrlPattern-link') || '*://*/*']
  });
}

webext.contextMenus.on('clicked', ({linkUrl, pageUrl}) => download({
  url: linkUrl,
  referrer: pageUrl
})).if(({menuItemId}) => menuItemId === 'download-link');

webext.contextMenus.on('clicked', ({srcUrl, pageUrl}) => download({
  url: srcUrl,
  referrer: pageUrl
})).if(({menuItemId}) => menuItemId === 'download-media');

// External application support
chrome.runtime.onMessageExternal.addListener(request => {
  if (request.method === 'download') {
    if (prefs.passphrase && prefs.passphrase === request.passphrase) {
      download({
        url: request.url,
        referrer: request.referrer
      });
    }
    else {
      webext.notifications.create({
        message: 'To send download links to the external application, a passphrase needs to be set in the options page and all external requests must provide the exact same passphrase'
      });
    }
  }
});
