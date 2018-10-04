/* globals webext, Parser */
'use strict';

var config = {};

config.tag = 'fdm';

config.command = {
  executable: {
    Mac: 'open',
    Win: '%ProgramFiles%\\FreeDownloadManager.ORG\\Free Download Manager\\fdm.exe',
    Lin: 'fdm'
  },
  args: {
    Mac: '-a "Free Download Manager" "[URL]"',
    Win: '"[URL]"',
    Lin: '"[URL]"'
  },
  get guess() {
    const key = navigator.platform.substr(0, 3);
    return {
      executable: config.command.executable[key],
      args: config.command.args[key]
    };
  }
};

var download = async d => {
  const native = new webext.runtime.Native('emano.waldeck');
  const p = new Parser();

  const prefs = await webext.storage.get(config.command.guess);

  const termref = {
    lineBuffer: prefs.args
      .replace(/\[URL\]/g, d.url)
      .replace(/\[USERAGENT\]/g, navigator.userAgent)
      .replace(/\\/g, '\\\\')
  };
  p.parseLine(termref);

  const res = await native.send({
    permissions: ['child_process'],
    args: [prefs.executable, ...termref.argv],
    script: `
     const path = args[0]
      .replace('%LOCALAPPDATA%', env.LOCALAPPDATA)
      .replace('%ProgramFiles%', env.ProgramFiles)
      .replace('%ProgramFiles(x86)%', env['ProgramFiles(x86)']);

      const exe = require('child_process').spawn(path, args.slice(1), {
        detached: false
      });
      let stdout = '';
      let stderr = '';
      exe.stdout.on('data', data => stdout += data);
      exe.stderr.on('data', data => stderr += data);

      exe.on('close', code => {
        push({code, stdout, stderr});
        done();
      });
    `
  });
  const error = await webext.storage.get({
    error: true
  });
  if (!res) {
    if (error) {
      // open installation guide
      webext.tabs.create({
        url: '/data/guide/index.html'
      });
    }
  }
  if (res && res.code !== 0) {
    const message = res.stderr || res.error || res.err || res.stdout;
    if (message) {
      console.error(res);
      if (message.indexOf('ENOENT') !== -1) {
        return webext.notifications.create({
          message: 'The external download manager cannot be found. Please check the path in the options page'
        });
      }
      if (error) {
        webext.notifications.create({
          message
        });
      }
    }
  }
};
