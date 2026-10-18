# 提交到 Obsidian 社区插件目录

[English README](../README.md) · [中文说明](../README.zh-CN.md) · [发布维护](../RELEASING.md)

资料核对日期：2026-10-18。GitHub 公开发布与 Obsidian 官方目录收录是两个步骤。本文件准备了提交资料，**不代表已经提交、审核通过或在插件商店上架**。

## 当前应该在哪里提交

Obsidian 当前的[官方提交指南](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)要求通过 [community.obsidian.md](https://community.obsidian.md) 提交。网上让作者向 `obsidianmd/obsidian-releases` 新建 PR 的教程属于旧流程，不能直接照做。官方仓库仍提供插件安装索引；这与新作者使用的提交入口不同。

流程如下：

1. 在 GitHub 公开源代码，仓库根目录放好 `README.md`、`LICENSE`、`manifest.json`。
2. 发布与 manifest 版本号完全一致的 GitHub Release。本次版本为 **`0.6.2`**，tag 也必须是 **`0.6.2`**，不要加 `v`。
3. Release 附件单独上传 **`main.js`、`manifest.json`、`styles.css`**；安装 ZIP 和源码 ZIP 是额外的便利下载，不能替代这三个单独附件。
4. 在社区网站登录 Obsidian 账号，在个人资料的 **GitHub → Connect** 关联 `oranipost`。这是网站用来验证仓库所有权的步骤。
5. 进入侧栏 **Plugins → New plugin**，填入仓库 URL，Owner 选择自己，阅读开发者政策与维护承诺后提交。
6. 查看网站给出的自动检查结果。需要修正时修改源码，增加版本号，重新发布对应 Release，再按照页面提示处理。公开显示条目和能在 Obsidian 内安装是不同状态，应确认所有阻止安装的错误均已解决。

首次提交后，后续版本通常只需发布新的 GitHub Release；不必为每个更新重新申请目录条目。具体账号关联和表单步骤见[官方账号与新增插件说明](https://docs.obsidian.md/community-directory/set-up-and-claim)，更新规则见[官方 FAQ](https://docs.obsidian.md/community-directory/faq)。

## 本项目可以直接填写的资料

| 字段 | 内容 |
| --- | --- |
| GitHub repository URL | `https://github.com/oranipost/visual-math-editor` |
| Name | `Visual Math Editor` |
| ID | `visual-math-editor` |
| Author | `Dongfang Wang` |
| Author URL | `https://github.com/oranipost` |
| Version / release tag | `0.6.2` |
| Minimum Obsidian version | `1.14.4` |
| Platforms | Desktop only；目前实际验证 macOS，Windows / Linux 尚未做原生应用测试 |
| License | MIT；依赖与字体遵循各自许可证，见 [Third-party notices](../THIRD-PARTY-NOTICES.md) |
| Payment | Free |
| Support | `https://github.com/oranipost/visual-math-editor/issues` |

英文短描述与 `manifest.json` 保持一致：

> Edit math and science formulas, plot real functions and complex numbers, and pan or zoom saved graphs, entirely offline.

中文介绍可用：

> 在笔记正文中可视化编辑数学公式，也可切换 LaTeX 和双栏同步模式。内置化学式、配平建议、元素信息、单位换算、实函数图像与复平面。全部在本地运行；公式保存为 LaTeX/Markdown，图像保存为可再次编辑的配置。

英文详细介绍可用：

> Write and revise equations inside your notes with Visual, LaTeX, and synchronized Hybrid modes. Insert fractions, roots, scripts, sums, and integrals without learning LaTeX. Use chemistry notation, optional balancing suggestions, element details, and deterministic unit conversion. Plot a real function or mark complex numbers on a Re/Im plane, pan and zoom, and explicitly save the view for later editing. Everything runs locally without accounts or runtime network requests. Formulas remain LaTeX/Markdown; editable graphs use a `vme-plot` code block. This desktop public beta is tested in Obsidian 1.14.4 on macOS. It is not a computer algebra system or a chemical structure drawing application.

如果目录表单提供分类或关键词，可以优先选择现有的 **Math / LaTeX / Graph**，再按页面实际选项补充 Chemistry；不要在 manifest 中添加未定义的 `tags` 字段。

以下是仓库索引使用的资料形状，方便核对一致性。**当前提交表单填仓库 URL 即可，不需要把这段 JSON 手动提交到官方仓库。**

```json
{
  "id": "visual-math-editor",
  "name": "Visual Math Editor",
  "author": "Dongfang Wang",
  "description": "Edit math and science formulas, plot real functions and complex numbers, and pan or zoom saved graphs, entirely offline.",
  "repo": "oranipost/visual-math-editor"
}
```

本次实时检查官方现有索引（9,111 条）和已移除插件列表，未发现这个 ID 或名称；这并不预留名称，提交时仍需由目录验证唯一性。

## 其他类似插件是怎样介绍自己的

这里借鉴的是信息结构，不是复制其他插件的代码或品牌。

| 插件 | 它实际怎样展示 | 本项目采用的写法 |
| --- | --- | --- |
| [MathLive](https://github.com/danzilberdan/obsidian-mathlive) | [商店](https://community.obsidian.md/plugins/mathlive)用一句话说明可视化数学输入；README 分开讲入门、命令、快捷键与 OCR 的云端/本地配置；manifest 声明 desktop-only | 首屏说明三模式与正文内编辑，提供三步入门，明确全部本地运行；不宣传尚未实现的 OCR |
| [Latex Suite](https://github.com/artisticat1/obsidian-latex-suite) | [商店](https://community.obsidian.md/plugins/obsidian-latex-suite)突出用 snippets 提升 LaTeX 速度；README 先演示动图和几个短输入例子，再展开功能和快捷表 | 用实际界面截图展示 Visual / Hybrid、复平面和化学；先给能立即尝试的例子，再链接详细安装、限制与开发文档 |
| [Obsidian Functionplot](https://github.com/leonhma/obsidian-functionplot) | [商店](https://community.obsidian.md/plugins/obsidian-functionplot)介绍 Markdown 内画函数；README 同时说明图形界面和 code fence 两种操作，以及范围、拖动缩放、设置与支持入口 | 明确“拖动或缩放只是预览，Save view 才保存”，展示 `3+2i`，解释 `vme-plot` 数据与重新编辑方法 |

三者的 manifest 都将名称、简短英文描述、作者主页、最低 Obsidian 版本、桌面/移动端支持写为可解析字段。README 则承担截图、安装步骤、详细功能、限制、许可证和问题反馈等信息。成熟插件可能保留历史 ID、较旧的描述格式或较低最低版本；新插件仍应按**当前**[提交要求](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)填写，不能照抄它们的兼容声明。

## 提交前核对

- `manifest.json` 描述不超过 250 字符、以句号结尾，不加表情；ID 不含 `obsidian`，作者主页指向实际维护者。
- 不把未测试的旧 Obsidian 版本或移动端写成已兼容。当前保守地以实际验证的 `1.14.4` 为最低版本。
- 英文 README 作为仓库首屏，中文 README 可一键切换；截图使用仓库相对路径，别人打开仓库和目录条目时都能加载。
- 两种手动安装方法都说明清楚：下载完整安装 ZIP，或者下载三个独立插件文件放入 `.obsidian/plugins/visual-math-editor/`；完成后在 Community plugins 启用。目录审核通过前不声称能在 Browse 中搜索到本项目。
- README 披露实际行为：无账户、无费用、无遥测、无运行时网络；只在用户明确插入/保存时修改当前笔记；草稿目前只暂存在内存，重启前要保存。
- 说明功能边界：复数是每行一个 `a+bi` 数值点；实函数有范围与采样限制；配平建议可选，不阻止保留原式；元素电子排布与壳层数据有来源与预测标记；没有通用符号求解、OCR 或分子结构绘图。
- 仓库公开源码、MIT LICENSE，以及完整依赖、字体、mhchem 许可证与必要归属；附带许可证的完整 ZIP 也一并提供。
- 构建、逻辑测试、宽窄界面检查和实际 Obsidian 操作验证的结果写入 [TEST-REPORT.md](../TEST-REPORT.md)，不要把这些本地结果称为“官方审核通过”。
- 最终 Release tag、根目录 manifest、Release manifest 和构建产物一致；检查 GitHub Actions 成功，三个独立附件可下载。更新时同步 `versions.json`。

本地预审同时参考了[开发者政策](https://docs.obsidian.md/community-directory/developer-policies)和[官方仓库中的代码指南](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Releasing/Plugin%20guidelines.md)：避免 HTML 注入式构造、释放监听器与定时器、编辑活动笔记使用 Editor API、不要强占默认全局热键。官方扫描仍可能给出进一步修改要求。

## 后续维护

维护者应关注社区网站的检查结果和仓库 Issues。收到有效错误反馈后，先复现并修复，再发布增加版本号的 Release。未来增加移动端或更低 Obsidian 版本支持，应先完成对应原生环境测试，再更改兼容元数据。维护者无法继续支持时，按社区网站提供的归档或转移流程处理。
