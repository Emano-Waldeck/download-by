/* globals webext, Parser */
'use strict';

var config = {};

config.tag = 'idm';

config.command = {
  executable: {
    Mac: 'open',
    Win: '%ProgramFiles(x86)%\\Internet Download Manager\\IDMan.exe',
    Lin: 'idm'
  },
  args: {
    Mac: '-a "Internet Download Manager" "[URL]"',
    Win: '/d "[URL]"',
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
  console.log(d);
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
      const exe = require('child_process').spawn(args[0], args.slice(1), {
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
      if (error) {
        webext.notifications.create({
          message
        });
      }
    }
  }
};
