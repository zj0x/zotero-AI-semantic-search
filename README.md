# Semantic Library Search

一个面向 `Zotero 8.x` 的插件。运行后可以在当前文库里做本地“语义近似搜索”，并把相关论文按分数列出来；现在也支持可编辑设置和 OpenAI-compatible 大模型重排。

## 功能

- 在 `Tools` 菜单中新增 `语义搜索论文...`
- 在条目右键菜单中新增 `查找相似论文`
- 在 `Tools` 菜单中新增 `语义搜索设置...`
- 对当前文库中的常规条目做本地排序
- 评分来源包含标题、摘要、作者、标签、刊物 / 会议等字段
- 可配置结果显示数量
- 可选接入 OpenAI-compatible API，对本地候选结果做 LLM 二次重排
- 可以把结果保存成新的 Zotero 集合，方便继续筛选

## 适用范围

默认情况下它仍然是一个**不依赖外部 API** 的本地版本，所以更接近“语义近似检索”而不是真正的向量嵌入检索。你也可以在设置里打开 OpenAI-compatible API 重排能力。

它适合：

- 按主题找相关论文
- 根据已选中的一篇论文找相似条目
- 在自己的文库里做快速归档和浏览

如果你后面要接入 OpenAI / Ollama / 本地 embedding 模型，我可以在这个基础上继续改成真正的向量检索版。

## 构建

当前环境没有 `zip` 和 `node`，所以仓库里附了一个 Python 打包脚本：

```bash
python3 tools/build_xpi.py
```

生成文件位置：

```text
dist/semantic-library-search-0.2.10.xpi
```

## 安装

1. 打开 Zotero
2. 进入 `Tools -> Plugins`
3. 右上角齿轮菜单选择 `Install Plugin From File...`
4. 选择 `dist/*.xpi`

## 文件结构

- `manifest.json`: Zotero 插件清单
- `bootstrap.js`: 插件生命周期入口
- `semantic-search-core.js`: 搜索算法与 Zotero 数据访问
- `semantic-search-settings.js`: 设置持久化与 OpenAI-compatible API 调用
- `semantic-search-plugin.js`: 菜单注册与窗口打开逻辑
- `semantic-search.xhtml`: 搜索窗口
- `semantic-search-window.js`: 窗口交互与结果渲染
- `semantic-search-settings.xhtml`: 设置窗口
- `semantic-search-settings-window.js`: 设置窗口交互
- `semantic-search.css`: 搜索窗口样式
