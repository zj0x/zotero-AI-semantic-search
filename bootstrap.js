var SemanticSearchPlugin;

function getPreferencePaneLabel() {
  const locale = String(Zotero?.locale || "en-US").toLowerCase();
  return locale.startsWith("zh") ? "语义搜索" : "Semantic Search";
}

function install() { }

async function startup({ id, version, rootURI }) {
  // Wait for Zotero to fully initialize before using any Zotero APIs
  // (PreferencePanes, MenuManager, etc. are unavailable until this resolves)
  await Zotero.initializationPromise;

  Services.scriptloader.loadSubScript(rootURI + "semantic-search-settings.js");
  Services.scriptloader.loadSubScript(rootURI + "semantic-search-core.js");
  Services.scriptloader.loadSubScript(rootURI + "semantic-search-plugin.js");

  SemanticSearchSettings.ensureDefaults();

  Zotero.PreferencePanes.register({
    pluginID: id,
    id: "semantic-library-search-preferences",
    src: rootURI + "semantic-search-preferences.xhtml",
    image: rootURI + "icons/semantic-search.svg",
    label: getPreferencePaneLabel(),
  });

  SemanticSearchPlugin.init({ id, version, rootURI });
  await SemanticSearchPlugin.startup();
}

function shutdown() {
  SemanticSearchPlugin?.shutdown();
  SemanticSearchPlugin = undefined;
}

function uninstall() { }
