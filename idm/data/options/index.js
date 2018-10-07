/* globals dom, webext, build, toast, config */
'use strict';

build({
  description: 'Display errors from the external download manager',
  storage: 'error',
  value: true,
  type: 'async'
});

build({
  description: 'Only send downloadable jobs that support multi-threading',
  storage: 'range',
  value: false,
  type: 'async'
});

build({
  description: 'Redirect to download information page when a download is sent to the external download manager',
  storage: 'redirect',
  value: true,
  type: 'async'
});

build({
  description: 'Open FAQs page on updates',
  storage: 'faqs',
  value: true,
  type: 'async'
});

{
  const executable = dom.$('executable');
  const args = dom.$('args');
  const size = dom.$('size');
  const whitelist = dom.$('whitelist');
  const include = dom.$('include');
  const passphrase = dom.$('passphrase');

  const load = async() => {
    const prefs = await webext.storage.get(Object.assign(config.command.guess, {
      size: 0,
      whitelist: [],
      include: [
        '.3GP', '.7Z', '.AAC', '.ACE', '.AIF', '.ARJ', '.ASF', '.AVI', '.BIN', '.BZ2', '.EXE', '.GZ', '.GZIP',
        '.IMG', '.ISO', '.LZH', '.M4A', '.M4V', '.MKV', '.MOV', '.MP3', '.MP4', '.MPA', '.MPE', '.MPEG', '.MPG', '.MSI',
        '.MSU', '.OGG', '.OGV', '.PDF', '.PLJ', '.PPS', '.PPT', '.RAR', '.RMVB', '.SEA', '.SIT', '.SITX', '.TAR', '.TIF',
        '.TIFF', '.WAV', '.WMA', '.WMV', '.ZIP', '.DEB', '.RPM', '.APPIMAGE'
      ],
      passphrase: ''
    }));
    executable.value = prefs.executable;
    args.value = prefs.args;
    size.value = prefs.size;
    whitelist.value = prefs.whitelist.join(', ');
    include.value = prefs.include.join(', ');
    passphrase.value = prefs.passphrase;
  };

  dom.saved = async() => {
    await webext.storage.set({
      executable: executable.value,
      args: args.value,
      size: Number(size.value),
      whitelist: whitelist.value.split(/\s*,\s*/).filter((s, i, l) => s && l.indexOf(s) === i),
      include: include.value.split(/\s*,\s*/).filter((s, i, l) => s && l.indexOf(s) === i),
      passphrase: passphrase.value
    });
    load();
    toast.show('Options saved');
  };

  dom.on('load', load);
}
