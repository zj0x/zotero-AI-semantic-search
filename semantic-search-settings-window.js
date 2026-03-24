var SemanticSearchSettingsWindow = (() => {
  let initialized = false;

  const STRINGS = {
    en: {
      eyebrow: "Editable plugin settings",
      title: "Semantic Search Settings",
      subtitle:
        "Tune local ranking behavior and optionally connect an OpenAI-compatible model to rerank the strongest candidates.",
      testConnection: "Test API",
      saveSettings: "Save",
      resetSettings: "Reset Defaults",
      closeSettings: "Close",
      searchSectionTitle: "Local Search",
      resultLimitLabel: "Maximum results to display",
      minScoreRatioLabel: "Relative score threshold",
      minScoreFloorLabel: "Absolute score floor",
      fallbackLimitLabel: "Fallback result count",
      collectionPrefixLabel: "Saved collection name prefix",
      searchHelp:
        "Use the threshold settings to make the local search stricter or looser. Fallback count controls how many top local matches are shown when the threshold would otherwise filter out everything.",
      collectionPrefixPlaceholder: "Optional custom prefix for saved collections",
      llmSectionTitle: "LLM Reranking",
      llmEnabledLabel: "Enable OpenAI-compatible API reranking",
      llmProviderLabel: "Provider preset",
      llmModelPresetLabel: "Quick model preset",
      llmBaseURLLabel: "API Base URL",
      llmBaseURLPlaceholder: "https://api.openai.com/v1",
      llmModelLabel: "Model name",
      llmModelPlaceholder: "gpt-4.1-mini",
      llmAPIKeyLabel: "API key",
      llmAPIKeyPlaceholder: "Optional for local Ollama / LM Studio endpoints",
      llmCandidateCountLabel: "Top candidates sent to the model",
      llmTimeoutLabel: "Timeout in seconds",
      llmTemperatureLabel: "Sampling temperature",
      llmMaxTokensLabel: "Max response tokens",
      llmSystemPromptLabel: "Additional system prompt",
      llmSystemPromptPlaceholder: "Optional extra instruction for the reranker...",
      llmHelp:
        "OpenAI-style /chat/completions endpoints are supported. API keys are optional for local compatible servers such as Ollama and LM Studio.",
      providerOpenAI: "OpenAI",
      providerOpenRouter: "OpenRouter",
      providerOllama: "Ollama",
      providerLMStudio: "LM Studio",
      providerCustom: "Custom",
      modelPresetCustom: "Keep current / custom",
      ready: "Settings loaded.",
      saved: "Settings saved.",
      resetDone: "Defaults restored.",
      testing: "Testing API connection...",
      testSuccess: (preview) => `API test passed: ${preview}`,
      testFailed: (message) => `API test failed: ${message}`,
      saveFailed: (message) => `Could not save settings: ${message}`,
    },
    zh: {
      eyebrow: "可编辑插件设置",
      title: "语义搜索设置",
      subtitle: "可以调节本地排序的严格度，并可接入 OpenAI-compatible 模型，对最相关结果做二次重排。",
      testConnection: "测试 API",
      saveSettings: "保存",
      resetSettings: "恢复默认",
      closeSettings: "关闭",
      searchSectionTitle: "本地搜索",
      resultLimitLabel: "最多显示结果数",
      minScoreRatioLabel: "相对分数阈值",
      minScoreFloorLabel: "绝对分数下限",
      fallbackLimitLabel: "兜底结果数量",
      collectionPrefixLabel: "保存结果集合名前缀",
      searchHelp: "调高阈值会让结果更严格，调低会更宽松。兜底结果数量用于避免阈值过高时出现空结果。",
      collectionPrefixPlaceholder: "可选，自定义保存结果时的集合名前缀",
      llmSectionTitle: "LLM 重排",
      llmEnabledLabel: "启用 OpenAI-compatible API 重排",
      llmProviderLabel: "提供商预设",
      llmModelPresetLabel: "快速模型预设",
      llmBaseURLLabel: "API Base URL",
      llmBaseURLPlaceholder: "https://api.openai.com/v1",
      llmModelLabel: "模型名",
      llmModelPlaceholder: "gpt-4.1-mini",
      llmAPIKeyLabel: "API Key",
      llmAPIKeyPlaceholder: "本地 Ollama / LM Studio 通常可留空",
      llmCandidateCountLabel: "送入模型的候选条目数",
      llmTimeoutLabel: "超时时间（秒）",
      llmTemperatureLabel: "采样温度",
      llmMaxTokensLabel: "最大返回 token 数",
      llmSystemPromptLabel: "附加系统提示词",
      llmSystemPromptPlaceholder: "可选的额外重排指令...",
      llmHelp:
        "兼容 OpenAI 风格的 /chat/completions 接口，例如 OpenAI、OpenRouter、Ollama、LM Studio 或其他兼容网关。",
      providerOpenAI: "OpenAI",
      providerOpenRouter: "OpenRouter",
      providerOllama: "Ollama",
      providerLMStudio: "LM Studio",
      providerCustom: "自定义",
      modelPresetCustom: "保持当前值 / 自定义",
      ready: "设置已载入。",
      saved: "设置已保存。",
      resetDone: "已恢复默认设置。",
      testing: "正在测试 API 连接...",
      testSuccess: (preview) => `API 测试成功：${preview}`,
      testFailed: (message) => `API 测试失败：${message}`,
      saveFailed: (message) => `保存设置失败：${message}`,
    },
  };

  const elements = {};

  function ui(key, ...args) {
    const bucket = SemanticSearchSettings.getLocaleBucket();
    const value = STRINGS[bucket][key] || STRINGS.en[key];
    return typeof value === "function" ? value(...args) : value;
  }

  function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function getProviderOptions() {
    return [
      ["openai", ui("providerOpenAI")],
      ["openrouter", ui("providerOpenRouter")],
      ["ollama", ui("providerOllama")],
      ["lmstudio", ui("providerLMStudio")],
      ["custom", ui("providerCustom")],
    ];
  }

  function getModelPresetOptions() {
    return [
      ["", ui("modelPresetCustom")],
      ...SemanticSearchSettings.MODEL_PRESETS.map((model) => [model, model]),
    ];
  }

  function getKnownProviderBaseURLs() {
    return new Set(
      Object.values(SemanticSearchSettings.PROVIDER_PRESETS)
        .map((provider) => String(provider.baseURL || "").trim())
        .filter(Boolean)
    );
  }

  function getModelPresetValue(model) {
    const normalized = String(model || "").trim();
    return SemanticSearchSettings.MODEL_PRESETS.includes(normalized) ? normalized : "";
  }

  function bindElements() {
    elements.settingsEyebrow = document.getElementById("settings-eyebrow");
    elements.settingsTitle = document.getElementById("settings-title");
    elements.settingsSubtitle = document.getElementById("settings-subtitle");
    elements.testConnection = document.getElementById("test-connection");
    elements.saveSettings = document.getElementById("save-settings");
    elements.resetSettings = document.getElementById("reset-settings");
    elements.closeSettings = document.getElementById("close-settings");
    elements.searchSectionTitle = document.getElementById("search-section-title");
    elements.resultLimitLabel = document.getElementById("result-limit-label");
    elements.resultLimit = document.getElementById("result-limit");
    elements.minScoreRatioLabel = document.getElementById("min-score-ratio-label");
    elements.minScoreRatio = document.getElementById("min-score-ratio");
    elements.minScoreFloorLabel = document.getElementById("min-score-floor-label");
    elements.minScoreFloor = document.getElementById("min-score-floor");
    elements.fallbackLimitLabel = document.getElementById("fallback-limit-label");
    elements.fallbackLimit = document.getElementById("fallback-limit");
    elements.collectionPrefixLabel = document.getElementById("collection-prefix-label");
    elements.collectionPrefix = document.getElementById("collection-prefix");
    elements.searchHelp = document.getElementById("search-help");
    elements.llmSectionTitle = document.getElementById("llm-section-title");
    elements.llmEnabled = document.getElementById("llm-enabled");
    elements.llmEnabledLabel = document.getElementById("llm-enabled-label");
    elements.llmProviderLabel = document.getElementById("llm-provider-label");
    elements.llmProvider = document.getElementById("llm-provider");
    elements.llmModelPresetLabel = document.getElementById("llm-model-preset-label");
    elements.llmModelPreset = document.getElementById("llm-model-preset");
    elements.llmBaseURLLabel = document.getElementById("llm-base-url-label");
    elements.llmBaseURL = document.getElementById("llm-base-url");
    elements.llmModelLabel = document.getElementById("llm-model-label");
    elements.llmModel = document.getElementById("llm-model");
    elements.llmAPIKeyLabel = document.getElementById("llm-api-key-label");
    elements.llmAPIKey = document.getElementById("llm-api-key");
    elements.llmCandidateCountLabel = document.getElementById("llm-candidate-count-label");
    elements.llmCandidateCount = document.getElementById("llm-candidate-count");
    elements.llmTimeoutLabel = document.getElementById("llm-timeout-label");
    elements.llmTimeout = document.getElementById("llm-timeout");
    elements.llmTemperatureLabel = document.getElementById("llm-temperature-label");
    elements.llmTemperature = document.getElementById("llm-temperature");
    elements.llmMaxTokensLabel = document.getElementById("llm-max-tokens-label");
    elements.llmMaxTokens = document.getElementById("llm-max-tokens");
    elements.llmSystemPromptLabel = document.getElementById("llm-system-prompt-label");
    elements.llmSystemPrompt = document.getElementById("llm-system-prompt");
    elements.llmHelp = document.getElementById("llm-help");
    elements.settingsStatus = document.getElementById("settings-status");
  }

  function populateSelects() {
    if (elements.llmProvider) {
      elements.llmProvider.replaceChildren(
        ...getProviderOptions().map(([value, label]) => createOption(value, label))
      );
    }

    if (elements.llmModelPreset) {
      elements.llmModelPreset.replaceChildren(
        ...getModelPresetOptions().map(([value, label]) => createOption(value, label))
      );
    }
  }

  function applyCopy() {
    elements.settingsEyebrow.textContent = ui("eyebrow");
    elements.settingsTitle.textContent = ui("title");
    elements.settingsSubtitle.textContent = ui("subtitle");
    elements.testConnection.textContent = ui("testConnection");
    elements.saveSettings.textContent = ui("saveSettings");
    elements.resetSettings.textContent = ui("resetSettings");
    if (elements.closeSettings) {
      elements.closeSettings.textContent = ui("closeSettings");
    }

    elements.searchSectionTitle.textContent = ui("searchSectionTitle");
    elements.resultLimitLabel.textContent = ui("resultLimitLabel");
    elements.minScoreRatioLabel.textContent = ui("minScoreRatioLabel");
    elements.minScoreFloorLabel.textContent = ui("minScoreFloorLabel");
    elements.fallbackLimitLabel.textContent = ui("fallbackLimitLabel");
    elements.collectionPrefixLabel.textContent = ui("collectionPrefixLabel");
    elements.collectionPrefix.placeholder = ui("collectionPrefixPlaceholder");
    elements.searchHelp.textContent = ui("searchHelp");

    elements.llmSectionTitle.textContent = ui("llmSectionTitle");
    elements.llmEnabledLabel.textContent = ui("llmEnabledLabel");
    elements.llmProviderLabel.textContent = ui("llmProviderLabel");
    elements.llmModelPresetLabel.textContent = ui("llmModelPresetLabel");
    elements.llmBaseURLLabel.textContent = ui("llmBaseURLLabel");
    elements.llmBaseURL.placeholder = ui("llmBaseURLPlaceholder");
    elements.llmModelLabel.textContent = ui("llmModelLabel");
    elements.llmModel.placeholder = ui("llmModelPlaceholder");
    elements.llmAPIKeyLabel.textContent = ui("llmAPIKeyLabel");
    elements.llmAPIKey.placeholder = ui("llmAPIKeyPlaceholder");
    elements.llmCandidateCountLabel.textContent = ui("llmCandidateCountLabel");
    elements.llmTimeoutLabel.textContent = ui("llmTimeoutLabel");
    elements.llmTemperatureLabel.textContent = ui("llmTemperatureLabel");
    elements.llmMaxTokensLabel.textContent = ui("llmMaxTokensLabel");
    elements.llmSystemPromptLabel.textContent = ui("llmSystemPromptLabel");
    elements.llmSystemPrompt.placeholder = ui("llmSystemPromptPlaceholder");
    elements.llmHelp.textContent = ui("llmHelp");
  }

  function setStatus(message) {
    if (elements.settingsStatus) {
      elements.settingsStatus.textContent = message || "";
    }
  }

  function readForm() {
    return {
      search: {
        resultLimit: Number(elements.resultLimit.value || 50),
        minScoreRatio: Number(elements.minScoreRatio.value || 0.22),
        minScoreFloor: Number(elements.minScoreFloor.value || 4.2),
        fallbackLimit: Number(elements.fallbackLimit.value || 25),
        collectionPrefix: elements.collectionPrefix.value.trim(),
      },
      llm: {
        enabled: elements.llmEnabled.checked,
        provider: elements.llmProvider.value,
        baseURL: elements.llmBaseURL.value.trim(),
        apiKey: elements.llmAPIKey.value.trim(),
        model: elements.llmModel.value.trim(),
        candidateCount: Number(elements.llmCandidateCount.value || 20),
        timeoutSeconds: Number(elements.llmTimeout.value || 45),
        temperature: Number(elements.llmTemperature.value || 0),
        maxTokens: Number(elements.llmMaxTokens.value || 256),
        systemPrompt: elements.llmSystemPrompt.value,
      },
    };
  }

  function fillForm(settings) {
    elements.resultLimit.value = settings.search.resultLimit;
    elements.minScoreRatio.value = settings.search.minScoreRatio;
    elements.minScoreFloor.value = settings.search.minScoreFloor;
    elements.fallbackLimit.value = settings.search.fallbackLimit;
    elements.collectionPrefix.value = settings.search.collectionPrefix;

    elements.llmEnabled.checked = settings.llm.enabled;
    elements.llmProvider.value = settings.llm.provider;
    elements.llmBaseURL.value = settings.llm.baseURL;
    elements.llmAPIKey.value = settings.llm.apiKey;
    elements.llmModel.value = settings.llm.model;
    elements.llmModelPreset.value = getModelPresetValue(settings.llm.model);
    elements.llmCandidateCount.value = settings.llm.candidateCount;
    elements.llmTimeout.value = settings.llm.timeoutSeconds;
    elements.llmTemperature.value = settings.llm.temperature;
    elements.llmMaxTokens.value = settings.llm.maxTokens;
    elements.llmSystemPrompt.value = settings.llm.systemPrompt;
    updateLLMFieldState();
  }

  function updateLLMFieldState() {
    const canTest = Boolean(elements.llmBaseURL.value.trim() && elements.llmModel.value.trim());
    elements.testConnection.disabled = !canTest;
  }

  function syncModelPresetSelect() {
    elements.llmModelPreset.value = getModelPresetValue(elements.llmModel.value);
    updateLLMFieldState();
  }

  function applyProviderPreset() {
    const provider = String(elements.llmProvider.value || "").trim();
    const preset = SemanticSearchSettings.PROVIDER_PRESETS[provider];
    if (!preset) {
      return;
    }

    const currentBaseURL = elements.llmBaseURL.value.trim();
    if (!currentBaseURL || getKnownProviderBaseURLs().has(currentBaseURL)) {
      elements.llmBaseURL.value = preset.baseURL || currentBaseURL;
    }

    if (!elements.llmModel.value.trim() || !elements.llmModelPreset.value) {
      elements.llmModel.value = preset.defaultModel || elements.llmModel.value;
    }

    syncModelPresetSelect();
  }

  async function saveSettings() {
    try {
      const snapshot = SemanticSearchSettings.save(readForm());
      fillForm(snapshot);
      setStatus(ui("saved"));
    } catch (error) {
      setStatus(ui("saveFailed", error?.message || String(error)));
    }
  }

  function resetSettings() {
    const defaults = SemanticSearchSettings.reset();
    fillForm(defaults);
    setStatus(ui("resetDone"));
  }

  async function testConnection() {
    setStatus(ui("testing"));

    try {
      const fetchImpl = typeof window !== "undefined" && window.fetch ? window.fetch.bind(window) : null;
      const result = await SemanticSearchSettings.testConnection({
        settings: readForm(),
        fetchImpl,
      });
      setStatus(ui("testSuccess", result.preview));
    } catch (error) {
      setStatus(ui("testFailed", error?.message || String(error)));
    }
  }

  function bindEvents() {
    elements.llmEnabled.addEventListener("change", () => {
      updateLLMFieldState();
    });

    elements.llmProvider.addEventListener("change", () => {
      applyProviderPreset();
    });

    elements.llmModelPreset.addEventListener("change", () => {
      if (elements.llmModelPreset.value) {
        elements.llmModel.value = elements.llmModelPreset.value;
      }
      updateLLMFieldState();
    });

    elements.llmBaseURL.addEventListener("input", () => {
      updateLLMFieldState();
    });

    elements.llmModel.addEventListener("input", () => {
      syncModelPresetSelect();
    });

    elements.saveSettings.addEventListener("click", () => {
      void saveSettings();
    });

    elements.resetSettings.addEventListener("click", () => {
      resetSettings();
    });

    elements.testConnection.addEventListener("click", () => {
      void testConnection();
    });

    if (elements.closeSettings) {
      elements.closeSettings.addEventListener("click", () => {
        window.close();
      });
    }
  }

  function init() {
    if (initialized) {
      return;
    }

    if (!document.getElementById("settings-shell")) {
      return;
    }

    bindElements();
    populateSelects();
    applyCopy();
    fillForm(SemanticSearchSettings.getAll());
    bindEvents();
    setStatus(ui("ready"));
    initialized = true;
  }

  return {
    init,
    refreshFromPrefs() {
      if (!initialized) {
        init();
        return;
      }

      fillForm(SemanticSearchSettings.getAll());
      setStatus(ui("ready"));
    },
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.SemanticSearchSettingsWindow = SemanticSearchSettingsWindow;
}

function maybeInitSemanticSearchSettingsWindow() {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById("settings-shell")) {
    SemanticSearchSettingsWindow.init();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", maybeInitSemanticSearchSettingsWindow, { once: true });
  } else {
    maybeInitSemanticSearchSettingsWindow();
  }
}
