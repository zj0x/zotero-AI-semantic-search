var SemanticSearchPlugin;

function install() {}

async function startup({ id, version, rootURI }) {
  Services.scriptloader.loadSubScript(rootURI + "semantic-search-core.js");
  Services.scriptloader.loadSubScript(rootURI + "semantic-search-settings.js");
  Services.scriptloader.loadSubScript(rootURI + "semantic-search-plugin.js");
  SemanticSearchPlugin.init({ id, version, rootURI });
  await SemanticSearchPlugin.startup();
}

function shutdown() {
  SemanticSearchPlugin?.shutdown();
  SemanticSearchPlugin = undefined;
}

function uninstall() {}
