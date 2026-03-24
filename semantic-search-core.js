var SemanticSearchCore = (() => {
  const EN_STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "this",
    "to",
    "toward",
    "using",
    "via",
    "with",
  ]);

  const CONCEPT_GROUPS = [
    {
      id: "ai",
      terms: ["ai", "artificial intelligence", "人工智能"],
    },
    {
      id: "machine-learning",
      terms: ["ml", "machine learning", "机器学习"],
    },
    {
      id: "deep-learning",
      terms: ["deep learning", "深度学习"],
    },
    {
      id: "llm",
      terms: ["llm", "large language model", "large language models", "大语言模型", "语言大模型"],
    },
    {
      id: "nlp",
      terms: ["nlp", "natural language processing", "自然语言处理"],
    },
    {
      id: "computer-vision",
      terms: ["cv", "computer vision", "计算机视觉"],
    },
    {
      id: "information-retrieval",
      terms: ["ir", "information retrieval", "信息检索"],
    },
    {
      id: "knowledge-graph",
      terms: ["knowledge graph", "知识图谱"],
    },
    {
      id: "recommendation",
      terms: ["recommender system", "recommendation system", "推荐系统"],
    },
    {
      id: "graph-neural-network",
      terms: ["gnn", "graph neural network", "graph neural networks", "图神经网络"],
    },
    {
      id: "reinforcement-learning",
      terms: ["rl", "reinforcement learning", "强化学习"],
    },
    {
      id: "survey",
      terms: ["survey", "review", "systematic review", "综述", "系统综述"],
    },
  ];

  const FIELD_CONFIGS = [
    {
      key: "title",
      labelKey: "fieldTitle",
      tokenWeight: 2.8,
      phraseWeight: 4.8,
      conceptWeight: 2.3,
      fuzzyWeight: 2.2,
    },
    {
      key: "abstractText",
      labelKey: "fieldAbstract",
      tokenWeight: 1.7,
      phraseWeight: 2.4,
      conceptWeight: 1.5,
      fuzzyWeight: 1.3,
    },
    {
      key: "creators",
      labelKey: "fieldAuthors",
      tokenWeight: 1.1,
      phraseWeight: 1.2,
      conceptWeight: 0.8,
      fuzzyWeight: 0.3,
    },
    {
      key: "tags",
      labelKey: "fieldTags",
      tokenWeight: 1.4,
      phraseWeight: 1.4,
      conceptWeight: 1.1,
      fuzzyWeight: 0.6,
    },
    {
      key: "source",
      labelKey: "fieldSource",
      tokenWeight: 1.2,
      phraseWeight: 1.5,
      conceptWeight: 0.9,
      fuzzyWeight: 0.5,
    },
  ];

  const LOCALE_TEXT = {
    en: {
      defaultLibrary: "My Library",
      groupLibrary: "Group Library",
      fieldTitle: "Title",
      fieldAbstract: "Abstract",
      fieldAuthors: "Authors",
      fieldTags: "Tags",
      fieldSource: "Venue",
      phraseMatch: "phrase",
      conceptMatch: "concept",
      relatedCollectionPrefix: "Semantic Search",
      generatedQueryPrefix: "Similar to",
    },
    zh: {
      defaultLibrary: "我的文库",
      groupLibrary: "群组文库",
      fieldTitle: "标题",
      fieldAbstract: "摘要",
      fieldAuthors: "作者",
      fieldTags: "标签",
      fieldSource: "来源",
      phraseMatch: "短语匹配",
      conceptMatch: "语义概念",
      relatedCollectionPrefix: "语义搜索结果",
      generatedQueryPrefix: "相似论文",
    },
  };

  function getLocaleBucket() {
    const locale = String(Zotero?.locale || "en-US").toLowerCase();
    return locale.startsWith("zh") ? "zh" : "en";
  }

  function t(key) {
    return LOCALE_TEXT[getLocaleBucket()][key] || LOCALE_TEXT.en[key] || key;
  }

  function normalizeText(text) {
    return String(text || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function stemEnglish(word) {
    if (word.length <= 3) {
      return word;
    }

    if (word.endsWith("ies") && word.length > 4) {
      return word.slice(0, -3) + "y";
    }

    if (word.endsWith("ing") && word.length > 5) {
      return word.slice(0, -3);
    }

    if (word.endsWith("ed") && word.length > 4) {
      return word.slice(0, -2);
    }

    if (word.endsWith("es") && word.length > 4) {
      return word.slice(0, -2);
    }

    if (word.endsWith("s") && word.length > 4) {
      return word.slice(0, -1);
    }

    return word;
  }

  function tokenize(text) {
    const normalized = normalizeText(text);
    const tokens = [];

    for (const match of normalized.matchAll(/[a-z0-9][a-z0-9+#./-]*/g)) {
      const token = match[0];
      if (token.length < 2 || EN_STOPWORDS.has(token)) {
        continue;
      }

      tokens.push(token);
      const stemmed = stemEnglish(token);
      if (stemmed !== token && stemmed.length >= 2) {
        tokens.push(stemmed);
      }
    }

    for (const match of normalized.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu)) {
      const block = match[0];
      if (block.length < 2) {
        continue;
      }

      if (block.length <= 4) {
        tokens.push(block);
      }

      for (let index = 0; index < block.length - 1; index += 1) {
        tokens.push(block.slice(index, index + 2));
      }
    }

    return unique(tokens);
  }

  function buildCharGrams(text, gramSize = 3) {
    const condensed = normalizeText(text).replace(/\s+/g, "");
    if (!condensed) {
      return new Set();
    }

    if (condensed.length <= gramSize) {
      return new Set([condensed]);
    }

    const grams = new Set();
    for (let index = 0; index <= condensed.length - gramSize; index += 1) {
      grams.add(condensed.slice(index, index + gramSize));
    }
    return grams;
  }

  function intersectionCount(left, right) {
    let count = 0;
    for (const value of left) {
      if (right.has(value)) {
        count += 1;
      }
    }
    return count;
  }

  function jaccard(left, right) {
    if (!left.size || !right.size) {
      return 0;
    }

    let intersection = 0;
    for (const value of left) {
      if (right.has(value)) {
        intersection += 1;
      }
    }

    const union = left.size + right.size - intersection;
    return union ? intersection / union : 0;
  }

  function scoreToken(token) {
    return Math.min(2.4, 0.65 + Math.log2(token.length + 1) * 0.6);
  }

  function buildConceptSet(text, tokens) {
    const normalized = normalizeText(text);
    const tokenSet = new Set(tokens);
    const concepts = new Set();

    for (const group of CONCEPT_GROUPS) {
      const matched = group.terms.some((term) => {
        const normalizedTerm = normalizeText(term);
        const termTokens = tokenize(normalizedTerm);
        const canUseSubstringMatch =
          normalizedTerm.includes(" ") ||
          /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(normalizedTerm) ||
          normalizedTerm.length > 3;

        return (
          tokenSet.has(normalizedTerm) ||
          (termTokens.length > 1 && termTokens.every((token) => tokenSet.has(token))) ||
          (canUseSubstringMatch && normalized.includes(normalizedTerm))
        );
      });

      if (matched) {
        concepts.add(group.id);
      }
    }

    return concepts;
  }

  function buildQueryProfile(query) {
    const normalized = normalizeText(query);
    const baseTokens = tokenize(normalized);
    const concepts = buildConceptSet(normalized, baseTokens);
    const expandedTokens = new Set(baseTokens);

    for (const group of CONCEPT_GROUPS) {
      if (!concepts.has(group.id)) {
        continue;
      }

      for (const term of group.terms) {
        for (const token of tokenize(term)) {
          expandedTokens.add(token);
        }
      }
    }

    const phrases = unique(
      [
        normalized,
        ...normalized
          .split(/[,;:，；。!?、]+/g)
          .map((part) => normalizeText(part))
          .filter((part) => part.length >= 4),
      ].filter(Boolean)
    );

    return {
      raw: query,
      normalized,
      tokens: [...expandedTokens],
      tokenSet: new Set(expandedTokens),
      concepts,
      phrases,
      charGrams: buildCharGrams(normalized),
    };
  }

  function getContainerTitle(item) {
    const fields = [
      "publicationTitle",
      "proceedingsTitle",
      "bookTitle",
      "encyclopediaTitle",
      "seriesTitle",
      "websiteTitle",
      "blogTitle",
      "forumTitle",
      "programTitle",
      "publisher",
    ];

    for (const field of fields) {
      const value = item.getField(field);
      if (value) {
        return String(value);
      }
    }

    return "";
  }

  function formatCreators(item) {
    if (typeof item.getCreators !== "function") {
      return "";
    }

    const creators = item.getCreators() || [];
    return creators
      .map((creator) => {
        if (!creator) {
          return "";
        }
        if (creator.name) {
          return creator.name;
        }
        return [creator.firstName, creator.lastName].filter(Boolean).join(" ").trim();
      })
      .filter(Boolean)
      .join(", ");
  }

  function formatTags(item) {
    if (typeof item.getTags !== "function") {
      return "";
    }

    const tags = item.getTags() || [];
    return tags
      .map((entry) => (typeof entry === "string" ? entry : entry?.tag || ""))
      .filter(Boolean)
      .join(", ");
  }

  function extractYear(value) {
    const match = String(value || "").match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : "";
  }

  function prepareField(text) {
    const normalized = normalizeText(text);
    const tokens = tokenize(normalized);
    return {
      raw: String(text || ""),
      normalized,
      tokenSet: new Set(tokens),
      concepts: buildConceptSet(normalized, tokens),
      charGrams: buildCharGrams(normalized),
    };
  }

  function prepareItem(item) {
    const title = item.getField("title") || item.getDisplayTitle?.() || "";
    const abstractText = item.getField("abstractNote") || "";
    const creators = formatCreators(item);
    const tags = formatTags(item);
    const source = getContainerTitle(item);
    const year = extractYear(item.getField("date") || item.getField("year") || "");

    const fields = {
      title: prepareField(title),
      abstractText: prepareField(abstractText),
      creators: prepareField(creators),
      tags: prepareField(tags),
      source: prepareField(source),
      year: prepareField(year),
    };

    return {
      item,
      title,
      abstractText,
      creators,
      tags,
      source,
      year,
      fields,
    };
  }

  function scoreField(queryProfile, field, config) {
    let score = 0;
    const matchedTokens = [];

    for (const token of queryProfile.tokens) {
      if (field.tokenSet.has(token)) {
        score += scoreToken(token) * config.tokenWeight;
        matchedTokens.push(token);
      }
    }

    let phraseHits = 0;
    for (const phrase of queryProfile.phrases) {
      if (phrase && field.normalized.includes(phrase)) {
        phraseHits += 1;
        score += Math.min(config.phraseWeight + phrase.length * 0.08, config.phraseWeight + 2.2);
      }
    }

    const conceptHits = intersectionCount(queryProfile.concepts, field.concepts);
    score += conceptHits * config.conceptWeight;

    const similarity = jaccard(queryProfile.charGrams, field.charGrams);
    score += similarity * config.fuzzyWeight * 10;

    const reasons = [];
    if (matchedTokens.length) {
      const label = t(config.labelKey);
      reasons.push(`${label}: ${unique(matchedTokens).slice(0, 4).join(", ")}`);
    }
    if (phraseHits) {
      reasons.push(`${t(config.labelKey)} ${t("phraseMatch")}`);
    }
    if (conceptHits) {
      reasons.push(`${t(config.labelKey)} ${t("conceptMatch")}`);
    }

    return {
      score,
      reasons,
    };
  }

  function makeSnippet(abstractText) {
    const clean = String(abstractText || "").replace(/\s+/g, " ").trim();
    if (!clean) {
      return "";
    }
    if (clean.length <= 180) {
      return clean;
    }
    return `${clean.slice(0, 177)}...`;
  }

  function createItemURI(item) {
    const library = Zotero.Libraries.get(item.libraryID);
    if (!library || library.libraryType === "user") {
      return `zotero://select/library/items/${item.key}`;
    }
    if (library.libraryType === "group") {
      return `zotero://select/groups/${library.groupID}/items/${item.key}`;
    }
    return `zotero://select/library/items/${item.key}`;
  }

  function createCollectionURI(collection) {
    const library = Zotero.Libraries.get(collection.libraryID);
    if (!library || library.libraryType === "user") {
      return `zotero://select/library/collections/${collection.key}`;
    }
    if (library.libraryType === "group") {
      return `zotero://select/groups/${library.groupID}/collections/${collection.key}`;
    }
    return `zotero://select/library/collections/${collection.key}`;
  }

  async function openItemInLibrary(itemID, itemURI, sourceWindow) {
    const mainWindow = sourceWindow?.opener || Zotero.getMainWindows()?.[0];

    try {
      if (mainWindow?.ZoteroPane) {
        if (typeof mainWindow.ZoteroPane.selectItem === "function") {
          await mainWindow.ZoteroPane.selectItem(itemID);
          mainWindow.focus();
          return true;
        }

        if (typeof mainWindow.ZoteroPane.selectItems === "function") {
          await mainWindow.ZoteroPane.selectItems([itemID]);
          mainWindow.focus();
          return true;
        }
      }
    } catch (error) {
      Zotero.debug(`Semantic Search: failed to select item ${itemID}: ${error}`);
    }

    if (itemURI && sourceWindow) {
      sourceWindow.location.href = itemURI;
      return true;
    }

    return false;
  }

  function scorePreparedItem(preparedItem, queryProfile) {
    let score = 0;
    const reasons = [];

    for (const config of FIELD_CONFIGS) {
      const fieldResult = scoreField(queryProfile, preparedItem.fields[config.key], config);
      score += fieldResult.score;
      reasons.push(...fieldResult.reasons);
    }

    if (preparedItem.year && queryProfile.tokenSet.has(preparedItem.year)) {
      score += 1.4;
      reasons.push(`Year: ${preparedItem.year}`);
    }

    if (!score) {
      return null;
    }

    return {
      itemID: preparedItem.item.id,
      key: preparedItem.item.key,
      title: preparedItem.title || "[Untitled]",
      authors: preparedItem.creators,
      year: preparedItem.year,
      source: preparedItem.source,
      score: Math.round(score * 100) / 100,
      why: unique(reasons).slice(0, 4),
      abstractSnippet: makeSnippet(preparedItem.abstractText),
      uri: createItemURI(preparedItem.item),
    };
  }

  async function searchLibrary({
    query,
    libraryID,
    limit = 150,
    minScoreRatio = 0.22,
    minScoreFloor = 4.2,
    fallbackLimit = 25,
  }) {
    const trimmedQuery = String(query || "").trim();
    if (!trimmedQuery) {
      return {
        query: "",
        libraryID,
        scanned: 0,
        durationMs: 0,
        results: [],
      };
    }

    const startedAt = Date.now();
    const items = await Zotero.Items.getAll(libraryID);
    const queryProfile = buildQueryProfile(trimmedQuery);
    const scoredResults = [];
    let scanned = 0;

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item?.isRegularItem?.()) {
        continue;
      }

      scanned += 1;
      const result = scorePreparedItem(prepareItem(item), queryProfile);
      if (result) {
        scoredResults.push(result);
      }

      if (scanned % 200 === 0) {
        await Zotero.Promise.delay(0);
      }
    }

    scoredResults.sort((left, right) => right.score - left.score);
    const bestScore = scoredResults[0]?.score || 0;
    const threshold = bestScore ? Math.max(minScoreFloor, bestScore * minScoreRatio) : 0;
    const filtered = scoredResults.filter((entry) => entry.score >= threshold).slice(0, limit);
    const fallback = scoredResults.slice(0, Math.min(limit, fallbackLimit));
    const results = filtered.length ? filtered : fallback;

    return {
      query: trimmedQuery,
      libraryID,
      scanned,
      durationMs: Date.now() - startedAt,
      results,
      totalRanked: scoredResults.length,
    };
  }

  function keywordScore(token, count) {
    return token.length * 1.5 + count;
  }

  function extractKeywords(text, excludedTokens = new Set(), maxCount = 8) {
    const counts = new Map();
    for (const token of tokenize(text)) {
      if (excludedTokens.has(token)) {
        continue;
      }
      counts.set(token, (counts.get(token) || 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => keywordScore(right[0], right[1]) - keywordScore(left[0], left[1]))
      .slice(0, maxCount)
      .map(([token]) => token);
  }

  function buildQueryFromItem(item) {
    const title = item.getField("title") || item.getDisplayTitle?.() || "";
    const titleTokens = new Set(tokenize(title));
    const tags = formatTags(item);
    const tagTokens = tokenize(tags).slice(0, 4).join(" ");
    const source = getContainerTitle(item);
    const abstractKeywords = extractKeywords(item.getField("abstractNote") || "", titleTokens).join(" ");

    return [title, tagTokens, source, abstractKeywords].filter(Boolean).join(" ");
  }

  function serializeSeedItem(item) {
    return {
      itemID: item.id,
      key: item.key,
      title: item.getField("title") || item.getDisplayTitle?.() || "",
      libraryID: item.libraryID,
      year: extractYear(item.getField("date") || item.getField("year") || ""),
      authors: formatCreators(item),
      suggestedQuery: buildQueryFromItem(item),
    };
  }

  function describeLibrary(library) {
    if (!library) {
      return t("defaultLibrary");
    }

    if (library.name) {
      return library.name;
    }

    if (library.libraryType === "group") {
      return t("groupLibrary");
    }

    return t("defaultLibrary");
  }

  function getCurrentSelectedRegularItem() {
    const mainWindow = Zotero.getMainWindows()?.[0];
    const selectedItems = mainWindow?.ZoteroPane?.getSelectedItems?.() || [];
    return selectedItems.find((item) => item?.isRegularItem?.()) || null;
  }

  function buildCollectionName(query, prefix) {
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const shortQuery = String(query || "").replace(/\s+/g, " ").trim().slice(0, 48);
    const resolvedPrefix = String(prefix || "").trim() || t("relatedCollectionPrefix");
    return `${resolvedPrefix} - ${shortQuery || "Query"} - ${timestamp}`;
  }

  async function saveResultsToCollection({ libraryID, query, itemIDs, collectionPrefix }) {
    const collection = new Zotero.Collection();
    collection.libraryID = libraryID;
    collection.name = buildCollectionName(query, collectionPrefix);
    await collection.saveTx();

    if (itemIDs?.length) {
      await collection.addItems(itemIDs);
    }

    return {
      id: collection.id,
      key: collection.key,
      name: collection.name,
      uri: createCollectionURI(collection),
    };
  }

  return {
    buildQueryFromItem,
    createCollectionURI,
    createItemURI,
    describeLibrary,
    getCurrentSelectedRegularItem,
    getLocaleBucket,
    getText: t,
    openItemInLibrary,
    saveResultsToCollection,
    searchLibrary,
    serializeSeedItem,
  };
})();
