var SemanticSearchSettingsWindow = (() => {
  const STRINGS = {
    en: {
      eyebrow: "Editable plugin settings",
      title: "Semantic Search Settings",
      subtitle:
        "Tune local result size and optionally connect an OpenAI-compatible LLM for reranking the most relevant papers.",
      testConnection: "Test API",
      saveSettings: "Save",
      resetSettings: "Reset Defaults",
      closeSettings: "Close",
      searchSectionTitle: "Local Search",
      resultLimitLabel: "Maximum results to display",
      resultLimitHelp: "This controls how many ranked papers are shown in the search window.",
      llmSectionTitle: "LLM Reranking",
      llmEnabledLabel: "Enable OpenAI-compatible API reranking",
      llmBaseURLLabel: "API Base URL",
      llmBaseURLPlaceholder: "https://api.openai.com/v1",
      llmModelLabel: "Model name",
      llmModelPlaceholder: "gpt-4.1-mini",
      llmAPIKeyLabel: "API key",
      llmCandidateCountLabel: "Top candidates sent to the model",
      llmTimeoutLabel: "Timeout in seconds",
      llmSystemPromptLabel: "Additional system prompt",
      llmSystemPromptPlaceholder: "Optional extra instruction for the reranker...",
      llmHelp:
        "Compatible with OpenAI-style /chat/completions endpoints such as OpenAI, Ollama, LM Studio, or other compatible gateways.",
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
      subtitle: "可以调整本地结果数量，并可接入 OpenAI-compatible 大模型接口，对最相关的论文做二次重排。",
      testConnection: "测试 API",
      saveSettings: "保存",
      resetSettings: "恢复默认",
      closeSettings: "关闭",
      searchSectionTitle: "本地搜索",
      resultLimitLabel: "最多显示结果数",
      resultLimitHelp: "控制搜索窗口中最终显示多少条排序结果。",
      llmSectionTitle: "LLM 重排",
      llmEnabledLabel: "启用 OpenAI-compatible API 重排",
      llmBaseURLLabel: "API Base URL",
      llmBaseURLPlaceholder: "https://api.openai.com/v1",
      llmModelLabel: "模型名",
      llmModelPlaceholder: "gpt-4.1-mini",
      llmAPIKeyLabel: "API Key",
      llmCandidateCountLabel: "送入模型的候选条目数",
      llmTimeoutLabel: "超时时间（秒）",
      llmSystemPromptLabel: "附加系统提示词",
      llmSystemPromptPlaceholder: "可选的额外重排指令...",
      llmHelp:
        "兼容 OpenAI 风格的 /chat/completions 接口，例如 OpenAI、Ollama、LM Studio 或其他兼容网关。",
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
    elements.resultLimitHelp = document.getElementById("result-limit-help");
    elements.llmSectionTitle = document.getElementById("llm-section-title");
    elements.llmEnabled = document.getElementById("llm-enabled");
    elements.llmEnabledLabel = document.getElementById("llm-enabled-label");
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
    elements.llmSystemPromptLabel = document.getElementById("llm-system-prompt-label");
    elements.llmSystemPrompt = document.getElementById("llm-system-prompt");
    elements.llmHelp = document.getElementById("llm-help");
    elements.settingsStatus = document.getElementById("settings-status");
  }

  function applyCopy() {
    elements.settingsEyebrow.textContent = ui("eyebrow");
    elements.settingsTitle.textContent = ui("title");
    elements.settingsSubtitle.textContent = ui("subtitle");
    elements.testConnection.textContent = ui("testConnection");
    elements.saveSettings.textContent = ui("saveSettings");
    elements.resetSettings.textContent = ui("resetSettings");
    elements.closeSettings.textContent = ui("closeSettings");
    elements.searchSectionTitle.textContent = ui("searchSectionTitle");
    elements.resultLimitLabel.textContent = ui("resultLimitLabel");
    elements.resultLimitHelp.textContent = ui("resultLimitHelp");
    elements.llmSectionTitle.textContent = ui("llmSectionTitle");
    elements.llmEnabledLabel.textContent = ui("llmEnabledLabel");
    elements.llmBaseURLLabel.textContent = ui("llmBaseURLLabel");
    elements.llmBaseURL.placeholder = ui("llmBaseURLPlaceholder");
    elements.llmModelLabel.textContent = ui("llmModelLabel");
    elements.llmModel.placeholder = ui("llmModelPlaceholder");
    elements.llmAPIKeyLabel.textContent = ui("llmAPIKeyLabel");
    elements.llmCandidateCountLabel.textContent = ui("llmCandidateCountLabel");
    elements.llmTimeoutLabel.textContent = ui("llmTimeoutLabel");
    elements.llmSystemPromptLabel.textContent = ui("llmSystemPromptLabel");
    elements.llmSystemPrompt.placeholder = ui("llmSystemPromptPlaceholder");
    elements.llmHelp.textContent = ui("llmHelp");
  }

  function setStatus(message) {
    elements.settingsStatus.textContent = message || "";
  }

  function readForm() {
    return {
      search: {
        resultLimit: Number(elements.resultLimit.value || 50),
      },
      llm: {
        enabled: elements.llmEnabled.checked,
        baseURL: elements.llmBaseURL.value.trim(),
        apiKey: elements.llmAPIKey.value.trim(),
        model: elements.llmModel.value.trim(),
        candidateCount: Number(elements.llmCandidateCount.value || 20),
        timeoutSeconds: Number(elements.llmTimeout.value || 45),
        systemPrompt: elements.llmSystemPrompt.value,
      },
    };
  }

  function fillForm(settings) {
    elements.resultLimit.value = settings.search.resultLimit;
    elements.llmEnabled.checked = settings.llm.enabled;
    elements.llmBaseURL.value = settings.llm.baseURL;
    elements.llmAPIKey.value = settings.llm.apiKey;
    elements.llmModel.value = settings.llm.model;
    elements.llmCandidateCount.value = settings.llm.candidateCount;
    elements.llmTimeout.value = settings.llm.timeoutSeconds;
    elements.llmSystemPrompt.value = settings.llm.systemPrompt;
    updateLLMFieldState();
  }

  function updateLLMFieldState() {
    elements.testConnection.disabled = false;
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
      const result = await SemanticSearchSettings.testConnection({
        settings: readForm(),
        fetchImpl: window.fetch.bind(window),
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

    elements.saveSettings.addEventListener("click", () => {
      void saveSettings();
    });

    elements.resetSettings.addEventListener("click", () => {
      resetSettings();
    });

    elements.testConnection.addEventListener("click", () => {
      void testConnection();
    });

    elements.closeSettings.addEventListener("click", () => {
      window.close();
    });
  }

  function init() {
    bindElements();
    applyCopy();
    fillForm(SemanticSearchSettings.getAll());
    bindEvents();
    setStatus(ui("ready"));
  }

  return {
    init,
    refreshFromPrefs() {
      fillForm(SemanticSearchSettings.getAll());
      setStatus(ui("ready"));
    },
  };
})();

window.addEventListener("load", () => {
  SemanticSearchSettingsWindow.init();
});
