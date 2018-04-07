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

{
  const executable = dom.$('executable');
  const args = dom.$('args');
  const size = dom.$('size');
  const whitelist = dom.$('whitelist');

  const load = async() => {
    const prefs = await webext.storage.get(Object.assign(config.command.guess, {
      size: 0,
      whitelist: []
    }));
    executable.value = prefs.executable;
    args.value = prefs.args;
    size.value = prefs.size;
    whitelist.value = prefs.whitelist.join(', ');
  };

  dom.saved = async() => {
    await webext.storage.set({
      executable: executable.value,
      args: args.value,
      size: Number(size.value),
      whitelist: whitelist.value.split(/\s*,\s*/).filter((s, i, l) => s && l.indexOf(s) === i)
    });
    load();
    toast.show('Options saved');
  };

  dom.on('load', load);
}
