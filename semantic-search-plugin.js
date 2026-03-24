var SemanticSearchPlugin = (() => {
  const WINDOW_NAME = "semantic-search-window";
  const WINDOW_TYPE = "semantic-search:window";
  const WINDOW_FEATURES =
    "chrome,dialog=no,resizable,centerscreen,width=1180,height=780";

  const state = {
    id: null,
    version: null,
    rootURI: null,
    registeredMenuIDs: [],
  };

  function log(message) {
    Zotero.debug(`Semantic Search: ${message}`);
  }

  function getMainWindow() {
    return Zotero.getMainWindows()?.[0] || Services.wm.getMostRecentWindow("navigator:browser");
  }

  function buildLaunchState(overrides = {}) {
    const mainWindow = getMainWindow();
    const pane = mainWindow?.ZoteroPane;
    const selectedItems = pane?.getSelectedItems?.() || [];
    const selectedRegularItem = selectedItems.find((item) => item?.isRegularItem?.()) || null;
    const selectedCollection = pane?.getSelectedCollection?.() || null;

    let libraryID = selectedCollection?.libraryID || selectedRegularItem?.libraryID || null;
    if (!libraryID && typeof pane?.getSelectedLibraryID === "function") {
      libraryID = pane.getSelectedLibraryID();
    }
    if (!libraryID) {
      libraryID = Zotero.Libraries.userLibraryID;
    }

    const library = Zotero.Libraries.get(libraryID);

    return {
      libraryID,
      libraryName: SemanticSearchCore.describeLibrary(library),
      selectedCollection: selectedCollection
        ? {
            id: selectedCollection.id,
            key: selectedCollection.key,
            name: selectedCollection.name,
          }
        : null,
      selectedItem: selectedRegularItem ? SemanticSearchCore.serializeSeedItem(selectedRegularItem) : null,
      ...overrides,
    };
  }

  function openSearchWindow(overrides = {}) {
    const existingWindow = Services.wm.getMostRecentWindow(WINDOW_TYPE);
    const launchState = buildLaunchState(overrides);

    if (existingWindow && !existingWindow.closed) {
      existingWindow.focus();
      existingWindow.SemanticSearchWindow?.receiveLaunchRequest(launchState);
      return existingWindow;
    }

    const mainWindow = getMainWindow();
    return mainWindow.openDialog(
      state.rootURI + "semantic-search.xhtml",
      WINDOW_NAME,
      WINDOW_FEATURES,
      {
        rootURI: state.rootURI,
        state: launchState,
      }
    );
  }

  function registerMenus() {
    if (!Zotero.MenuManager?.registerMenu) {
      throw new Error("Zotero.MenuManager.registerMenu() is not available. This plugin requires Zotero 8.");
    }

    state.registeredMenuIDs.push(
      Zotero.MenuManager.registerMenu({
        menuID: "semantic-search-tools-menu",
        pluginID: state.id,
        target: "main/menubar/tools",
        menus: [
          {
            menuType: "menuitem",
            l10nID: "semantic-search-menu-open",
            onCommand: () => openSearchWindow(),
          },
          {
            menuType: "menuitem",
            l10nID: "semantic-search-menu-settings",
            onCommand: () => SemanticSearchSettings.openSettingsWindow(getMainWindow(), state.rootURI),
          },
        ],
      })
    );

    state.registeredMenuIDs.push(
      Zotero.MenuManager.registerMenu({
        menuID: "semantic-search-item-context-menu",
        pluginID: state.id,
        target: "main/library/item",
        menus: [
          {
            menuType: "menuitem",
            l10nID: "semantic-search-menu-similar",
            onShowing: (_event, context) => {
              context.setVisible(context.items?.length === 1 && context.items[0]?.isRegularItem?.());
            },
            onCommand: (_event, context) => {
              const item = context.items?.[0];
              if (!item) {
                return;
              }

              openSearchWindow({
                libraryID: item.libraryID,
                libraryName: SemanticSearchCore.describeLibrary(Zotero.Libraries.get(item.libraryID)),
                selectedItem: SemanticSearchCore.serializeSeedItem(item),
                initialQuery: SemanticSearchCore.buildQueryFromItem(item),
                autoSearch: true,
              });
            },
          },
        ],
      })
    );
  }

  function unregisterMenus() {
    for (const registeredID of state.registeredMenuIDs) {
      try {
        Zotero.MenuManager.unregisterMenu(registeredID);
      } catch (error) {
        log(`Failed to unregister menu ${registeredID}: ${error}`);
      }
    }
    state.registeredMenuIDs = [];
  }

  function closeSearchWindows() {
    const enumerator = Services.wm.getEnumerator(WINDOW_TYPE);
    while (enumerator.hasMoreElements()) {
      const win = enumerator.getNext();
      if (!win.closed) {
        win.close();
      }
    }
  }

  return {
    init({ id, version, rootURI }) {
      state.id = id;
      state.version = version;
      state.rootURI = rootURI;
    },

    async startup() {
      registerMenus();
      log(`started ${state.version}`);
    },

    shutdown() {
      unregisterMenus();
      closeSearchWindows();
      log("shutdown");
    },
  };
})();
