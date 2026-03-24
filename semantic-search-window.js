var SemanticSearchWindow = (() => {
  const STRINGS = {
    en: {
      emptyQuery: "Enter a topic, method, author, or paper title first.",
      noSelectedItem: "No regular Zotero item is currently selected.",
      searching: "Searching the current library...",
      reranking: (model) => `Local ranking finished. Reranking with ${model}...`,
      readyForQuery: "Ready. Enter a query or generate one from the selected paper.",
      noResults: "No related papers were found. Try a broader query.",
      searchDone: (shown, totalRanked, scanned, durationMs) =>
        `Found ${shown} related papers (${totalRanked} ranked / ${scanned} scanned) in ${(durationMs / 1000).toFixed(2)}s.`,
      searchFailed: "Search failed. Check Zotero debug output for details.",
      savingCollection: "Saving current results as a Zotero collection...",
      collectionSaved: (name) => `Saved as collection: ${name}`,
      collectionFailed: "Could not save the collection.",
      collectionLabel: (name) => `Collection: ${name}`,
      usingSelectedItem: (title) => `Generated query from: ${title}`,
      libraryLabel: (name) => `Library: ${name}`,
      summaryText: (count, query) => `${count} results for "${query}"`,
      llmReranked: (model, count) => `LLM reranked the top ${count} results with ${model}.`,
      llmFallback: (message) => `LLM reranking failed, using local ranking. ${message}`,
      llmIncomplete: "LLM reranking is enabled, but the API settings are incomplete.",
    },
    zh: {
      emptyQuery: "请先输入主题、方法、作者或论文标题。",
      noSelectedItem: "当前没有选中可搜索的 Zotero 文献条目。",
      searching: "正在搜索当前文库...",
      reranking: (model) => `本地排序完成，正在使用 ${model} 做二次重排...`,
      readyForQuery: "可以开始搜索，或根据当前选中文献自动生成查询。",
      noResults: "没有找到相关论文，可以换一个更宽松的查询。",
      searchDone: (shown, totalRanked, scanned, durationMs) =>
        `找到 ${shown} 篇相关论文（排序 ${totalRanked} 条，扫描 ${scanned} 条），耗时 ${(durationMs / 1000).toFixed(2)} 秒。`,
      searchFailed: "搜索失败，请查看 Zotero 调试日志。",
      savingCollection: "正在将当前结果保存为 Zotero 集合...",
      collectionSaved: (name) => `已保存为集合：${name}`,
      collectionFailed: "保存集合失败。",
      collectionLabel: (name) => `集合：${name}`,
      usingSelectedItem: (title) => `已根据当前选中文献生成查询：${title}`,
      libraryLabel: (name) => `文库：${name}`,
      summaryText: (count, query) => `共 ${count} 条结果，查询：${query}`,
      llmReranked: (model, count) => `已用 ${model} 对前 ${count} 条结果做二次重排。`,
      llmFallback: (message) => `LLM 重排失败，已回退到本地排序。${message}`,
      llmIncomplete: "已启用 LLM 重排，但 API 设置还不完整。",
    },
  };

  const state = {
    launchState: null,
    currentResult: null,
    busy: false,
    rootURI: "",
  };

  const elements = {};

  function ui(key, ...args) {
    const bucket = SemanticSearchCore.getLocaleBucket();
    const value = STRINGS[bucket][key] || STRINGS.en[key];
    return typeof value === "function" ? value(...args) : value;
  }

  function bindElements() {
    elements.queryInput = document.getElementById("query-input");
    elements.runSearch = document.getElementById("run-search");
    elements.openSettings = document.getElementById("open-settings");
    elements.useSelectedItem = document.getElementById("use-selected-item");
    elements.saveCollection = document.getElementById("save-collection");
    elements.closeWindow = document.getElementById("close-window");
    elements.statusText = document.getElementById("status-text");
    elements.libraryPill = document.getElementById("library-pill");
    elements.collectionPill = document.getElementById("collection-pill");
    elements.llmPill = document.getElementById("llm-pill");
    elements.emptyState = document.getElementById("empty-state");
    elements.resultsSection = document.getElementById("results-section");
    elements.resultsBody = document.getElementById("results-body");
    elements.summaryText = document.getElementById("summary-text");
  }

  function setBusy(isBusy) {
    state.busy = isBusy;
    elements.runSearch.disabled = isBusy;
    elements.openSettings.disabled = isBusy;
    elements.useSelectedItem.disabled = isBusy;
    elements.saveCollection.disabled = isBusy || !(state.currentResult?.results?.length);
  }

  function setStatus(message) {
    elements.statusText.textContent = message || "";
  }

  function showEmptyState(show) {
    elements.emptyState.classList.toggle("hidden", !show);
    elements.resultsSection.classList.toggle("hidden", show);
  }

  function renderLLMStatus() {
    const status = SemanticSearchSettings.getLLMStatus();
    elements.llmPill.textContent = status.label;
    elements.llmPill.classList.toggle("hidden", !status.enabled);
    elements.llmPill.classList.toggle("pill-warning", status.enabled && !status.configured);
  }

  function renderContext() {
    const launchState = state.launchState || {};
    elements.libraryPill.textContent = ui("libraryLabel", launchState.libraryName || SemanticSearchCore.getText("defaultLibrary"));

    if (launchState.selectedCollection?.name) {
      elements.collectionPill.textContent = ui("collectionLabel", launchState.selectedCollection.name);
      elements.collectionPill.classList.remove("hidden");
    } else {
      elements.collectionPill.textContent = "";
      elements.collectionPill.classList.add("hidden");
    }
  }

  function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text || "";
    return cell;
  }

  function createTitleCell(result) {
    const cell = document.createElement("td");
    cell.className = "title-cell";

    const titleButton = document.createElement("button");
    titleButton.className = "title-button";
    titleButton.type = "button";
    titleButton.textContent = result.title;
    titleButton.addEventListener("click", async () => {
      await SemanticSearchCore.openItemInLibrary(result.itemID, result.uri, window);
    });

    const meta = document.createElement("div");
    meta.className = "title-meta";

    if (result.abstractSnippet) {
      const snippet = document.createElement("p");
      snippet.className = "snippet";
      snippet.textContent = result.abstractSnippet;
      meta.appendChild(snippet);
    }

    const uri = document.createElement("a");
    uri.className = "uri-link";
    uri.href = result.uri;
    uri.textContent = result.uri;
    meta.appendChild(uri);

    cell.append(titleButton, meta);
    return cell;
  }

  function renderResults(result, extraStatus = "") {
    state.currentResult = result;
    elements.resultsBody.replaceChildren();

    if (!result.results.length) {
      showEmptyState(true);
      setStatus(ui("noResults"));
      elements.summaryText.textContent = "";
      elements.saveCollection.disabled = true;
      return;
    }

    showEmptyState(false);
    elements.summaryText.textContent = ui("summaryText", result.results.length, result.query);

    result.results.forEach((entry, index) => {
      const row = document.createElement("tr");
      row.appendChild(createCell(String(index + 1)));
      row.appendChild(createTitleCell(entry));
      row.appendChild(createCell(entry.authors));
      row.appendChild(createCell(entry.year));
      row.appendChild(createCell(entry.source));
      row.appendChild(createCell(String(entry.score)));
      row.appendChild(createCell(entry.why.join(" | ")));
      elements.resultsBody.appendChild(row);
    });

    elements.saveCollection.disabled = false;
    const baseStatus = ui("searchDone", result.results.length, result.totalRanked, result.scanned, result.durationMs);
    setStatus(extraStatus ? `${baseStatus} ${extraStatus}` : baseStatus);
  }

  async function runSearch() {
    if (state.busy) {
      return;
    }

    const query = elements.queryInput.value.trim();
    if (!query) {
      setStatus(ui("emptyQuery"));
      showEmptyState(true);
      return;
    }

    setBusy(true);
    setStatus(ui("searching"));

    try {
      const launchState = state.launchState || {};
      const settings = SemanticSearchSettings.getAll();
      renderLLMStatus();
      const result = await SemanticSearchCore.searchLibrary({
        query,
        libraryID: launchState.libraryID || Zotero.Libraries.userLibraryID,
        limit: settings.search.resultLimit,
        minScoreRatio: settings.search.minScoreRatio,
        minScoreFloor: settings.search.minScoreFloor,
        fallbackLimit: settings.search.fallbackLimit,
      });
      let extraStatus = "";

      if (result.results.length) {
        const llmStatus = SemanticSearchSettings.getLLMStatus(settings);
        if (llmStatus.enabled && llmStatus.configured) {
          setStatus(ui("reranking", settings.llm.model));
          const reranked = await SemanticSearchSettings.maybeRerankResults({
            query,
            results: result.results,
            settings,
            fetchImpl: window.fetch.bind(window),
          });

          if (reranked.applied) {
            result.results = reranked.results;
            extraStatus = ui("llmReranked", reranked.model, reranked.candidateCount);
          } else if (reranked.reason === "error") {
            extraStatus = ui("llmFallback", reranked.message);
          }
        } else if (llmStatus.enabled && !llmStatus.configured) {
          extraStatus = ui("llmIncomplete");
        }
      }

      renderResults(result, extraStatus);
    } catch (error) {
      Zotero.debug(`Semantic Search window: ${error}\n${error?.stack || ""}`);
      setStatus(ui("searchFailed"));
      showEmptyState(true);
    } finally {
      setBusy(false);
    }
  }

  async function useSelectedItem() {
    const item = SemanticSearchCore.getCurrentSelectedRegularItem();
    if (!item) {
      setStatus(ui("noSelectedItem"));
      return;
    }

    const seed = SemanticSearchCore.serializeSeedItem(item);
    state.launchState = {
      ...(state.launchState || {}),
      libraryID: seed.libraryID,
      libraryName: SemanticSearchCore.describeLibrary(Zotero.Libraries.get(seed.libraryID)),
      selectedItem: seed,
    };
    renderContext();
    elements.queryInput.value = seed.suggestedQuery;
    setStatus(ui("usingSelectedItem", seed.title || seed.key));
    await runSearch();
  }

  async function saveCollection() {
    if (state.busy || !state.currentResult?.results?.length) {
      return;
    }

    setBusy(true);
    setStatus(ui("savingCollection"));

    try {
      const saved = await SemanticSearchCore.saveResultsToCollection({
        libraryID: state.currentResult.libraryID,
        query: state.currentResult.query,
        itemIDs: state.currentResult.results.map((entry) => entry.itemID),
        collectionPrefix: SemanticSearchSettings.getAll().search.collectionPrefix,
      });
      setStatus(ui("collectionSaved", saved.name));
    } catch (error) {
      Zotero.debug(`Semantic Search save error: ${error}\n${error?.stack || ""}`);
      setStatus(ui("collectionFailed"));
    } finally {
      setBusy(false);
    }
  }

  function applyLaunchState(launchState) {
    state.launchState = launchState || {};
    renderContext();
    renderLLMStatus();

    if (launchState.initialQuery) {
      elements.queryInput.value = launchState.initialQuery;
    } else if (launchState.selectedItem?.suggestedQuery && !elements.queryInput.value.trim()) {
      elements.queryInput.value = launchState.selectedItem.suggestedQuery;
    }

    if (launchState.autoSearch && elements.queryInput.value.trim()) {
      void runSearch();
      return;
    }

    showEmptyState(true);
    setStatus(ui("readyForQuery"));
  }

  function bindEvents() {
    elements.runSearch.addEventListener("click", () => {
      void runSearch();
    });

    elements.openSettings.addEventListener("click", () => {
      SemanticSearchSettings.openSettingsWindow(window, state.rootURI);
    });

    elements.queryInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void runSearch();
      }
    });

    elements.useSelectedItem.addEventListener("click", () => {
      void useSelectedItem();
    });

    elements.saveCollection.addEventListener("click", () => {
      void saveCollection();
    });

    elements.closeWindow.addEventListener("click", () => {
      window.close();
    });

    window.addEventListener("focus", () => {
      renderLLMStatus();
    });
  }

  function init() {
    state.rootURI = window.arguments?.[0]?.rootURI || String(window.location.href).replace(/[^/]+$/, "");
    bindElements();
    bindEvents();
    renderLLMStatus();
    applyLaunchState(window.arguments?.[0]?.state || {});
  }

  return {
    init,
    receiveLaunchRequest(launchState) {
      applyLaunchState(launchState);
      window.focus();
    },
  };
})();

window.addEventListener("load", () => {
  SemanticSearchWindow.init();
});
