var SemanticSearchSettings = (() => {
  const PREF_PREFIX = "extensions.semantic-library-search";
  const WINDOW_NAME = "semantic-search-settings-window";
  const WINDOW_TYPE = "semantic-search:settings";
  const WINDOW_FEATURES = "chrome,dialog=no,resizable,centerscreen,width=860,height=760";

  const DEFAULTS = Object.freeze({
    "search.resultLimit": 50,
    "search.minScoreRatio": 0.22,
    "search.minScoreFloor": 4.2,
    "search.fallbackLimit": 25,
    "search.collectionPrefix": "",
    "llm.enabled": false,
    "llm.provider": "openai",
    "llm.baseURL": "https://api.openai.com/v1",
    "llm.apiKey": "",
    "llm.model": "gpt-4.1-mini",
    "llm.candidateCount": 20,
    "llm.timeoutSeconds": 45,
    "llm.temperature": 0,
    "llm.maxTokens": 256,
    "llm.systemPrompt": "",
  });

  const PROVIDER_PRESETS = Object.freeze({
    openai: Object.freeze({
      baseURL: "https://api.openai.com/v1",
      defaultModel: "gpt-4.1-mini",
    }),
    openrouter: Object.freeze({
      baseURL: "https://openrouter.ai/api/v1",
      defaultModel: "openai/gpt-4.1-mini",
    }),
    ollama: Object.freeze({
      baseURL: "http://127.0.0.1:11434/v1",
      defaultModel: "qwen2.5:7b-instruct",
    }),
    lmstudio: Object.freeze({
      baseURL: "http://127.0.0.1:1234/v1",
      defaultModel: "local-model",
    }),
    custom: Object.freeze({
      baseURL: "",
      defaultModel: "",
    }),
  });

  const MODEL_PRESETS = Object.freeze([
    "gpt-4.1-mini",
    "gpt-4.1",
    "deepseek-chat",
    "qwen2.5:7b-instruct",
    "llama3.1:8b-instruct",
  ]);

  const LOCALE_TEXT = {
    en: {
      llmEnabled: "LLM reranking enabled",
      llmDisabled: "Local ranking only",
      llmIncomplete: "LLM config incomplete",
      llmReady: (model) => `LLM: ${model}`,
      llmReordered: (rank, note) => `LLM rerank #${rank}${note ? `: ${note}` : ""}`,
      missingConfig: "Base URL and model are required.",
    },
    zh: {
      llmEnabled: "已启用 LLM 重排",
      llmDisabled: "仅使用本地排序",
      llmIncomplete: "LLM 配置不完整",
      llmReady: (model) => `LLM：${model}`,
      llmReordered: (rank, note) => `LLM 重排 #${rank}${note ? `：${note}` : ""}`,
      missingConfig: "请填写 Base URL 和模型名。",
    },
  };

  function getLocaleBucket() {
    const locale = String(Zotero?.locale || "en-US").toLowerCase();
    return locale.startsWith("zh") ? "zh" : "en";
  }

  function t(key, ...args) {
    const value = LOCALE_TEXT[getLocaleBucket()][key] || LOCALE_TEXT.en[key] || key;
    return typeof value === "function" ? value(...args) : value;
  }

  function prefName(key) {
    return `${PREF_PREFIX}.${key}`;
  }

  function coerceBoolean(value, fallback) {
    if (value === undefined || value === null) {
      return fallback;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return Boolean(value);
    }
    return String(value).toLowerCase() === "true";
  }

  function coerceNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(Math.max(number, min), max);
  }

  function coerceString(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function coerceProvider(value) {
    const provider = String(value || "").trim().toLowerCase();
    return PROVIDER_PRESETS[provider] ? provider : DEFAULTS["llm.provider"];
  }

  function getRawPref(key) {
    const value = Zotero.Prefs.get(prefName(key));
    return value === undefined ? DEFAULTS[key] : value;
  }

  function ensureDefaults() {
    for (const [key, value] of Object.entries(DEFAULTS)) {
      const fullName = prefName(key);
      if (Zotero.Prefs.get(fullName) === undefined) {
        Zotero.Prefs.set(fullName, value);
      }
    }
  }

  function getDefaultsSnapshot() {
    return {
      search: {
        resultLimit: DEFAULTS["search.resultLimit"],
        minScoreRatio: DEFAULTS["search.minScoreRatio"],
        minScoreFloor: DEFAULTS["search.minScoreFloor"],
        fallbackLimit: DEFAULTS["search.fallbackLimit"],
        collectionPrefix: DEFAULTS["search.collectionPrefix"],
      },
      llm: {
        enabled: DEFAULTS["llm.enabled"],
        provider: DEFAULTS["llm.provider"],
        baseURL: DEFAULTS["llm.baseURL"],
        apiKey: DEFAULTS["llm.apiKey"],
        model: DEFAULTS["llm.model"],
        candidateCount: DEFAULTS["llm.candidateCount"],
        timeoutSeconds: DEFAULTS["llm.timeoutSeconds"],
        temperature: DEFAULTS["llm.temperature"],
        maxTokens: DEFAULTS["llm.maxTokens"],
        systemPrompt: DEFAULTS["llm.systemPrompt"],
      },
    };
  }

  function getAll() {
    return {
      search: {
        resultLimit: coerceNumber(getRawPref("search.resultLimit"), DEFAULTS["search.resultLimit"], 10, 300),
        minScoreRatio: coerceNumber(getRawPref("search.minScoreRatio"), DEFAULTS["search.minScoreRatio"], 0.05, 0.6),
        minScoreFloor: coerceNumber(getRawPref("search.minScoreFloor"), DEFAULTS["search.minScoreFloor"], 1, 12),
        fallbackLimit: coerceNumber(getRawPref("search.fallbackLimit"), DEFAULTS["search.fallbackLimit"], 5, 100),
        collectionPrefix: String(getRawPref("search.collectionPrefix") || ""),
      },
      llm: {
        enabled: coerceBoolean(getRawPref("llm.enabled"), DEFAULTS["llm.enabled"]),
        provider: coerceProvider(getRawPref("llm.provider")),
        baseURL: String(getRawPref("llm.baseURL") || "").trim() || DEFAULTS["llm.baseURL"],
        apiKey: String(getRawPref("llm.apiKey") || "").trim(),
        model: String(getRawPref("llm.model") || "").trim() || DEFAULTS["llm.model"],
        candidateCount: coerceNumber(
          getRawPref("llm.candidateCount"),
          DEFAULTS["llm.candidateCount"],
          5,
          50
        ),
        timeoutSeconds: coerceNumber(
          getRawPref("llm.timeoutSeconds"),
          DEFAULTS["llm.timeoutSeconds"],
          10,
          180
        ),
        temperature: coerceNumber(getRawPref("llm.temperature"), DEFAULTS["llm.temperature"], 0, 2),
        maxTokens: coerceNumber(getRawPref("llm.maxTokens"), DEFAULTS["llm.maxTokens"], 32, 4096),
        systemPrompt: String(getRawPref("llm.systemPrompt") || ""),
      },
    };
  }

  function save(settings) {
    const snapshot = {
      search: {
        resultLimit: coerceNumber(settings?.search?.resultLimit, DEFAULTS["search.resultLimit"], 10, 300),
        minScoreRatio: coerceNumber(
          settings?.search?.minScoreRatio,
          DEFAULTS["search.minScoreRatio"],
          0.05,
          0.6
        ),
        minScoreFloor: coerceNumber(
          settings?.search?.minScoreFloor,
          DEFAULTS["search.minScoreFloor"],
          1,
          12
        ),
        fallbackLimit: coerceNumber(
          settings?.search?.fallbackLimit,
          DEFAULTS["search.fallbackLimit"],
          5,
          100
        ),
        collectionPrefix: String(settings?.search?.collectionPrefix || "").trim(),
      },
      llm: {
        enabled: coerceBoolean(settings?.llm?.enabled, DEFAULTS["llm.enabled"]),
        provider: coerceProvider(settings?.llm?.provider),
        baseURL: String(settings?.llm?.baseURL || DEFAULTS["llm.baseURL"]).trim(),
        apiKey: String(settings?.llm?.apiKey || "").trim(),
        model: String(settings?.llm?.model || DEFAULTS["llm.model"]).trim(),
        candidateCount: coerceNumber(
          settings?.llm?.candidateCount,
          DEFAULTS["llm.candidateCount"],
          5,
          50
        ),
        timeoutSeconds: coerceNumber(
          settings?.llm?.timeoutSeconds,
          DEFAULTS["llm.timeoutSeconds"],
          10,
          180
        ),
        temperature: coerceNumber(
          settings?.llm?.temperature,
          DEFAULTS["llm.temperature"],
          0,
          2
        ),
        maxTokens: coerceNumber(
          settings?.llm?.maxTokens,
          DEFAULTS["llm.maxTokens"],
          32,
          4096
        ),
        systemPrompt: String(settings?.llm?.systemPrompt || ""),
      },
    };

    Zotero.Prefs.set(prefName("search.resultLimit"), snapshot.search.resultLimit);
    Zotero.Prefs.set(prefName("search.minScoreRatio"), snapshot.search.minScoreRatio);
    Zotero.Prefs.set(prefName("search.minScoreFloor"), snapshot.search.minScoreFloor);
    Zotero.Prefs.set(prefName("search.fallbackLimit"), snapshot.search.fallbackLimit);
    Zotero.Prefs.set(prefName("search.collectionPrefix"), snapshot.search.collectionPrefix);
    Zotero.Prefs.set(prefName("llm.enabled"), snapshot.llm.enabled);
    Zotero.Prefs.set(prefName("llm.provider"), snapshot.llm.provider);
    Zotero.Prefs.set(prefName("llm.baseURL"), snapshot.llm.baseURL);
    Zotero.Prefs.set(prefName("llm.apiKey"), snapshot.llm.apiKey);
    Zotero.Prefs.set(prefName("llm.model"), snapshot.llm.model);
    Zotero.Prefs.set(prefName("llm.candidateCount"), snapshot.llm.candidateCount);
    Zotero.Prefs.set(prefName("llm.timeoutSeconds"), snapshot.llm.timeoutSeconds);
    Zotero.Prefs.set(prefName("llm.temperature"), snapshot.llm.temperature);
    Zotero.Prefs.set(prefName("llm.maxTokens"), snapshot.llm.maxTokens);
    Zotero.Prefs.set(prefName("llm.systemPrompt"), snapshot.llm.systemPrompt);
    return snapshot;
  }

  function reset() {
    return save(getDefaultsSnapshot());
  }

  function deriveRootURI(sourceWindow) {
    const href = String(sourceWindow?.location?.href || "");
    return href ? href.replace(/[^/]+$/, "") : "";
  }

  function openSettingsWindow(sourceWindow, rootURI) {
    const owner = sourceWindow || Zotero.getMainWindows()?.[0];
    const resolvedRootURI = rootURI || deriveRootURI(owner);
    const existingWindow = Services.wm.getMostRecentWindow(WINDOW_TYPE);

    if (existingWindow && !existingWindow.closed) {
      existingWindow.focus();
      existingWindow.SemanticSearchSettingsWindow?.refreshFromPrefs();
      return existingWindow;
    }

    return owner.openDialog(
      resolvedRootURI + "semantic-search-settings.xhtml",
      WINDOW_NAME,
      WINDOW_FEATURES,
      {
        rootURI: resolvedRootURI,
      }
    );
  }

  function isLLMConfigured(settings = getAll()) {
    return Boolean(settings.llm.enabled && settings.llm.baseURL && settings.llm.model);
  }

  function getLLMStatus(settings = getAll()) {
    if (!settings.llm.enabled) {
      return {
        enabled: false,
        configured: false,
        label: t("llmDisabled"),
      };
    }

    if (!isLLMConfigured(settings)) {
      return {
        enabled: true,
        configured: false,
        label: t("llmIncomplete"),
      };
    }

    return {
      enabled: true,
      configured: true,
      label: t("llmReady", settings.llm.model),
    };
  }

  function buildEndpoint(baseURL) {
    const normalized = String(baseURL || "").trim().replace(/\/+$/, "");
    if (!normalized) {
      return "";
    }
    return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
  }

  function buildSystemPrompt(customPrompt) {
    const basePrompt = [
      "You rerank Zotero library search results.",
      'Return only valid JSON with this shape: {"ordered_ids":[101,102], "notes":{"101":"short reason"}}.',
      "Use only the provided numeric item IDs.",
      "Keep every note very short.",
      "Rank by semantic relevance to the search query, not by citation count.",
    ].join(" ");

    const custom = String(customPrompt || "").trim();
    return custom ? `${basePrompt}\nAdditional instruction: ${custom}` : basePrompt;
  }

  function buildUserPrompt(query, candidates) {
    return [
      `Search query: ${query}`,
      "",
      "Candidates:",
      JSON.stringify(candidates, null, 2),
      "",
      "Return JSON only.",
    ].join("\n");
  }

  function serializeCandidates(results, candidateCount) {
    return results.slice(0, candidateCount).map((result) => ({
      id: result.itemID,
      title: result.title,
      authors: result.authors,
      year: result.year,
      source: result.source,
      abstract: result.abstractSnippet,
      local_score: result.score,
      local_why: result.why,
    }));
  }

  function extractJSONObject(text) {
    const raw = String(text || "").trim();
    if (!raw) {
      return null;
    }

    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch ? fencedMatch[1].trim() : raw;

    try {
      return JSON.parse(candidate);
    } catch (_error) {
      const firstBrace = candidate.indexOf("{");
      const lastBrace = candidate.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
      }

      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch (__error) {
        return null;
      }
    }
  }

  function reorderResults(results, orderedIDs, notes) {
    const resultMap = new Map(results.map((entry) => [entry.itemID, entry]));
    const usedIDs = new Set();
    const noteEntries = Object.entries(notes || {}).map(([itemID, note]) => [Number(itemID), String(note || "").trim()]);
    const noteMap = new Map(noteEntries.filter(([itemID]) => Number.isFinite(itemID)));
    const reordered = [];

    orderedIDs.forEach((itemID, index) => {
      const original = resultMap.get(itemID);
      if (!original || usedIDs.has(itemID)) {
        return;
      }

      usedIDs.add(itemID);
      const note = noteMap.get(itemID);
      const why = [t("llmReordered", index + 1, note), ...original.why].slice(0, 5);
      reordered.push({
        ...original,
        score: Math.round((original.score + Math.max(0.5, orderedIDs.length - index) * 0.6) * 100) / 100,
        why,
      });
    });

    const remaining = results.filter((entry) => !usedIDs.has(entry.itemID));
    return [...reordered, ...remaining];
  }

  async function sendChatRequest({ body, settings, fetchImpl }) {
    if (!fetchImpl) {
      throw new Error("fetch() is not available in this window.");
    }

    const endpoint = buildEndpoint(settings.llm.baseURL);
    if (!endpoint || !settings.llm.model) {
      throw new Error(t("missingConfig"));
    }

    let timeoutHandle = null;
    let abortController = null;

    if (typeof AbortController === "function") {
      abortController = new AbortController();
      timeoutHandle = setTimeout(() => abortController.abort(), settings.llm.timeoutSeconds * 1000);
    }

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      if (settings.llm.apiKey) {
        headers.Authorization = `Bearer ${settings.llm.apiKey}`;
      }

      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: abortController?.signal,
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${responseText.slice(0, 300)}`);
      }

      return JSON.parse(responseText);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  async function maybeRerankResults({ query, results, settings = getAll(), fetchImpl }) {
    if (!settings.llm.enabled) {
      return { applied: false, reason: "disabled" };
    }

    if (!isLLMConfigured(settings)) {
      return { applied: false, reason: "not-configured" };
    }

    if (!results?.length) {
      return { applied: false, reason: "no-results" };
    }

    const candidateCount = Math.min(settings.llm.candidateCount, results.length);
    const candidates = serializeCandidates(results, candidateCount);
    const allowedIDs = new Set(candidates.map((candidate) => candidate.id));

    try {
      const payload = await sendChatRequest({
        settings,
        fetchImpl,
        body: {
          model: settings.llm.model,
          temperature: settings.llm.temperature,
          ...(settings.llm.maxTokens ? { max_tokens: settings.llm.maxTokens } : {}),
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(settings.llm.systemPrompt),
            },
            {
              role: "user",
              content: buildUserPrompt(query, candidates),
            },
          ],
        },
      });

      const content =
        payload?.choices?.[0]?.message?.content ||
        payload?.choices?.[0]?.text ||
        "";
      const parsed = extractJSONObject(content);
      const orderedIDs = Array.isArray(parsed?.ordered_ids)
        ? parsed.ordered_ids
            .map((itemID) => Number(itemID))
            .filter((itemID) => Number.isFinite(itemID) && allowedIDs.has(itemID))
        : [];

      if (!orderedIDs.length) {
        throw new Error("The LLM response did not contain ordered_ids.");
      }

      return {
        applied: true,
        candidateCount,
        model: settings.llm.model,
        results: reorderResults(results, orderedIDs, parsed?.notes || {}),
      };
    } catch (error) {
      return {
        applied: false,
        reason: "error",
        message: error?.message || String(error),
      };
    }
  }

  async function testConnection({ settings = getAll(), fetchImpl }) {
    if (!settings.llm.baseURL || !settings.llm.model) {
      throw new Error(t("missingConfig"));
    }

    const payload = await sendChatRequest({
      settings,
      fetchImpl,
      body: {
        model: settings.llm.model,
        temperature: settings.llm.temperature,
        ...(settings.llm.maxTokens ? { max_tokens: settings.llm.maxTokens } : {}),
        messages: [
          {
            role: "system",
            content: "Reply with the single word OK.",
          },
          {
            role: "user",
            content: "Connection test",
          },
        ],
      },
    });

    const content =
      payload?.choices?.[0]?.message?.content ||
      payload?.choices?.[0]?.text ||
      "";

    return {
      ok: true,
      preview: String(content || "").trim().slice(0, 120) || "OK",
    };
  }

  return {
    DEFAULTS,
    MODEL_PRESETS,
    PROVIDER_PRESETS,
    ensureDefaults,
    getAll,
    getDefaultsSnapshot,
    getLLMStatus,
    getLocaleBucket,
    getText: t,
    isLLMConfigured,
    maybeRerankResults,
    openSettingsWindow,
    reset,
    save,
    testConnection,
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.SemanticSearchSettings = SemanticSearchSettings;
}
