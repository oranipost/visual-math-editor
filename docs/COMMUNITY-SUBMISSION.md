# 提交到 Obsidian 社区插件目录

## 0.8.0 新版检查

0.8.0 新增极坐标、数值微积分和 XYZ 曲面，保留插件 ID、许可、离线运行与三语言界面。发布前通过 194 项自动测试及 368 项浏览器检查；原生 Obsidian 0.8.0 插入与保存重开尚未验证。官方目录扫描、GitHub 发行、商城安装必须分别核实，具体结果见 [TEST-REPORT.md](../TEST-REPORT.md)，不复用下方 0.7.0 结论。

[English README](../README.md) · [中文说明](../README.zh-CN.md) · [发布维护](../RELEASING.md)

## 0.7.0 历史发行与审核状态

0.7.0 为 **Visual Math 桌面公开测试版**，保留既有 ID、目录地址和仓库 `visual-math-editor`。官方 [Manifest 说明](https://docs.obsidian.md/Reference/Manifest)允许通过修改 `name` 更新插件名称，但要求名称唯一并符合命名规则。2026-10-18 核对官方安装索引时，已有 `visual-math-editor` 条目仍名为 **Visual Math Editor**，索引中未发现另一个名称恰为 **Visual Math** 的插件；最终仍须通过目录命名校验。索引观察不表示已完成原生商城安装或新版审核。

产品定位为：无需 LaTeX 基础即可开始的可视化数学、化学和物理笔记工具，支持三种编辑模式、当前公式下方的函数图像、离线科学工具和自定义公式快捷词。提供英语、简体中文和西班牙语；西班牙语元素搜索支持省略重音。联动只在当前编辑器中生效；保存后的公式与图像区块独立，修改公式须重新绘图或明确编辑已有图像。

**[0.7.0 此前作为 GitHub 发行版公开](https://github.com/oranipost/visual-math-editor/releases/tag/0.7.0)。** main／tag 的 Node.js 22／24 CI、[发行工作流 39192793031](https://github.com/oranipost/visual-math-editor/actions/runs/39192793031)成功，六个公开附件均通过严格来源证明验证。官方管理页 `0.7.0 / c21a7ed` 审核 **Completed**；公开条目显示 **Health Excellent / Review Passed**、版本 **0.7.0**、许可证 **GPL-3.0**，没有 Error 或 Warning。仍保留用户主动剪贴板访问及额外手动下载附件两类 **Recommendation**。目录识别的 GPL 标签不替代项目 [LICENSING.md](../LICENSING.md) 中完整的 Obsidian 链接例外。

现有 Personal vault 已从发行 ZIP 手动升级成功；设置和既有演示笔记字节一致，原生 About 显示 0.7.0，Hybrid `y=x/2` 联动预览已打开，该次升级检查未保存新图。这不是完成原生社区插件目录安装。详细发行、审核与运行证据见 [TEST-REPORT.md](../TEST-REPORT.md)。

旧 **0.6.2–0.6.5** 发行版已转为可恢复草稿，此前匿名公开 Release API 当时只列出 0.7.0；历史标签、源码和旧 MIT 授权仍保留。下方历史测试／审核观察按发生时的结果保留，不表示这些旧发行版仍公开下载。
### 可自行定义哪些搜索资料

- **社区目录**：可在 **Edit listing** 编辑简短／详细介绍、已有分类和截图，按页面实际提供的分类选择数学、科学或相关工具。官方 [条目管理说明](https://docs.obsidian.md/community-directory/manage-entry)没有承诺任意自定义搜索标签；不要添加未定义的 manifest `keywords` 或 `tags` 字段。
- **GitHub topics**：可自行填写与实现相关的标签，例如 `obsidian-plugin`、`equation-editor`、`latex`、`chemistry`、`physics`、`unit-conversion`。官方要求小写字母、数字或连字符，每项不超过 50 字符、最多 20 项；仓库描述、README 和 topic 各有自己的搜索范围。参见 [topics 规则](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)和[仓库搜索范围](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)。
- **package.json**：`keywords` 是标准 npm 元数据，本项目已经加入相关词，但仍为 `private: true`、不发布 npm。它不会自动成为 Obsidian 目录关键词，也不意味着目录排名提高；[npm 的说明](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#keywords)针对 npm 搜索。
- **编辑器中的公式关键词**：由用户在本地保存，用来复用公式，与公开搜索标签彼此独立。

相关词基于实际用途选择，没有经验证的关键词搜索量数据。不要宣称这些词搜索量最大、保证下载增长，或堆砌无关热门词。将 “No LaTeX knowledge required in Visual mode” 写入自然的功能说明即可；它不意味着所有复杂 TeX 都能可视化编辑。

## 0.6.5 历史发布观察

**0.6.5 当时记录的小修复状态**：[普通 latest GitHub Release 已公开](https://github.com/oranipost/visual-math-editor/releases/tag/0.6.5)；[发布工作流 39180466984](https://github.com/oranipost/visual-math-editor/actions/runs/39180466984)、main/tag 的 Node.js 22/24 检查、六个附件的严格来源证明与交付字节核对均通过。选择 **Check for new releases** 后，管理页显示 **“Your manifest points at version 0.6.5. A scan has been queued.”**，当时尚无 0.6.5 最终审核结果；这段保留历史观察，不表示当前状态。验证范围见 [TEST-REPORT.md](../TEST-REPORT.md)；下方保留 0.6.4 与 0.6.3 的历史审核结果。

历史 0.6.4 核对记录：本地 2026-10-18，目录审核页面日期为 **2026-10-19 UTC**。[0.6.4 当时已作为普通 latest GitHub Release 发布](https://github.com/oranipost/visual-math-editor/releases/tag/0.6.4)，六个下载附件的构建来源证明均已验证。[社区目录页面](https://community.obsidian.md/plugins/visual-math-editor)的 **0.6.4 / fedf59c 审核已 Completed（完成）**，当时目录发行版为 **0.6.4**，公开评分卡显示 **Review Passed**，未列出 Error 或 Warning，仅保留主动剪贴板用途和可选手动下载附件两类建议。历史 0.6.3 官方审核 **Completed / Review Satisfactory** 仍独立保留。GitHub Release 安装 ZIP 可用于手动安装；目录入口启用与完成原生安装测试是不同观察，后者以 [TEST-REPORT.md](../TEST-REPORT.md) 中实际记录为准。

此前原生 **Browse** 与 **Check for updates** 曾无结果，这是当时的历史观察。最新 2026-10-18 获取的官方 [`community-plugins.json`](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json) **已包含** `visual-math-editor`，当时显示名称仍为 **Visual Math Editor**。官方仓库[安装机制](https://github.com/obsidianmd/obsidian-releases#how-community-plugins-are-pulled)说明应用使用该列表搜索；目录网页、安装索引、应用实际显示版本以及完成原生安装须分别核对。已有原生编辑验证通过[手动安装](INSTALLATION.md)完成，不称为已从原生社区目录安装成功。

## 0.6.3 官方审核观察

该次 0.6.3 官方页面未显示 Error。源码与分发构建的逐字节一致性检查、依赖漏洞检查、代码混淆检查均显示 **Pass**。审核保留以下非阻断提醒，不能把 **Review Satisfactory** 解读为没有提醒、完整安全审计或所有平台实测通过。

| 提醒 | 用途与处理 |
| --- | --- |
| `prefer-create-el`，11 处 | 共用界面、独立浏览器预览、MathLive 自定义元素及 SVG 使用标准 DOM 创建方法；保留原生方法以兼容这些场景。 |
| CSS `!important`，2 处 | 仅限 `.vme-editor`：确保 `hidden` 元素不被组件布局样式显示，以及尊重系统的减少动画偏好。直接删除可能破坏隐藏状态或无障碍设置。 |
| 自定义 `math-field` 标签 | MathLive 已注册的公式编辑与预览元素，相关选择器限定在插件容器中。 |
| Clipboard Access | MathLive 提供用户主动剪切、复制和粘贴。插件自己的粘贴处理只读取当前粘贴事件的纯文本；未发现后台监控或上传剪贴板内容的实现。 |
| 缺少 attestations | 发布附件尚无构建来源证明。页面将其列为建议，当前不阻止安装；它与已通过的源码/构建逐字节一致性检查是不同项目。 |
| 额外 Release 附件 | ZIP、校验值和许可证附件作为便利下载保留；目录所需的三个独立程序附件仍齐全。页面对此仅给出建议，并非缺失必需附件或审核错误。 |

这些提醒已结合源码复核，该次检查没有要求立即修改运行时代码的阻断项；若官方后续给出具体修改要求，仍须处理。本记录属于 **0.6.3 官方目录审核**；[CODE-REVIEW.md](CODE-REVIEW.md) 独立保留 **0.6.2 使用官方 lint 工具进行的本地前置检查**，两者不能互相替代。

## 0.6.4 发行与审核跟进

0.6.4 针对上述提醒调整界面与发行流程。GitHub 发行版已公开，官方目录审核于 **2026-10-19 UTC** 显示 **Completed**，当时发行版为 **0.6.4**；本节记录该版结果，历史 0.6.3 提醒保留在上一节：

- 标准 HTML/SVG 使用 Obsidian 提供的创建辅助方法；独立浏览器预览保留兼容回退，MathLive 仍使用已注册的自定义元素。预览样式改按插件类名限定，调整隐藏状态与减少动画规则的顺序和选择器，不依赖 `!important`。
- 命令名称和界面语言无障碍标签按所选支持语言显示；仍仅支持英语和简体中文，未扩展科学工具或平台范围。
- 用户主动剪切、复制、粘贴功能继续保留；没有新增后台剪贴板读取或 MathLive 补丁。本次完成的审核仍将 Clipboard Access 列为用途建议；它没有被删除或隐藏。
- 固定 SHA 的官方 GitHub 来源证明 Action 已在同名版本标签上运行成功：[发布流程 39179067951](https://github.com/oranipost/visual-math-editor/actions/runs/39179067951)。六个附件均通过下载后的来源证明验证，并核对准确源码提交、标签和签名工作流。独立程序附件与安装 ZIP、本地构建、已安装程序逐字节一致，详见 [TEST-REPORT.md](../TEST-REPORT.md)。
- 新发行版不再重复上传独立许可证附件；完整条款保留在程序文件与 ZIP。手动安装/源码 ZIP 和校验文件保留，本次审核继续将这些安装器不使用的文件列为额外附件建议。

本次完整报告没有 Error、Warning，也没有列出 Source code 或 CSS lint 条目。**Pass** 包括 `main.js`、`styles.css` 的 verified GitHub artifact attestation、Vault Read、无已知漏洞依赖、无代码混淆，以及 `main.js` 逐字节构建复现。仅保留两类 **Recommendation**：Clipboard Access 和额外附件（`SHA256SUMS.txt`、两个 ZIP）。公开条目显示 **Health Excellent / Review Passed**，评分卡为 **Passed 6 / Other 2**，**Add to Obsidian** 链接已启用。Disclosures 同时明确列出 **Malware scan not available** 与 **Network requests scan not available**，说明本次恶意软件与网络请求扫描不可用。该结果不是所有平台实测或独立安全审计。

本地测试、托管发行验证与原生观察分别记入 [TEST-REPORT.md](../TEST-REPORT.md)。0.6.4 已有独立的 Completed 审核结果；目录审核完成、应用安装索引包含条目以及完成原生社区目录安装仍是不同状态，不可相互替代。

## 当前应该在哪里提交

Obsidian 当前的[官方提交指南](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)要求通过 [community.obsidian.md](https://community.obsidian.md) 提交。网上让作者向 `obsidianmd/obsidian-releases` 新建 PR 的教程属于旧流程，不能直接照做。官方仓库仍提供插件安装索引；这与新作者使用的提交入口不同。

流程如下：

1. 在 GitHub 公开源代码，仓库根目录放好 `README.md`、`LICENSE`、`manifest.json`。
2. 发布与 manifest 版本号完全一致的 GitHub Release。0.8.2 使用 tag **`0.8.2`**，不要加 `v`；不得改写旧标签或替换旧版程序附件；0.6.2–0.6.5 当前保留为可恢复草稿，旧 MIT 授权不变。
3. Release 附件单独上传 **`main.js`、`manifest.json`、`styles.css`**；安装 ZIP 和源码 ZIP 是额外的便利下载，不能替代这三个单独附件。
4. 在社区网站登录 Obsidian 账号，在个人资料的 **GitHub → Connect** 关联 `oranipost`。这是网站用来验证仓库所有权的步骤。
5. 进入侧栏 **Plugins → New plugin**，填入仓库 URL，Owner 选择自己，阅读开发者政策与维护承诺后提交。
6. 查看网站给出的自动检查结果。需要修正时修改源码，增加版本号，重新发布对应 Release，再按照页面提示处理。公开显示条目和能在 Obsidian 内安装是不同状态，应确认所有阻止安装的错误均已解决。

首次提交后，不必为每个更新重新申请目录条目，但每个新 Release 仍会触发目录的自动检查，包括 manifest、附件、源码与构建一致性。修复后发布增加版本号的新版本；需要时可在条目菜单选择 **Check for new releases / Request review**。有错误时以页面要求为准，不能把发布 Release 当作审核完成。具体账号关联和表单步骤见[官方账号与新增插件说明](https://docs.obsidian.md/community-directory/set-up-and-claim)，维护操作见[官方条目管理说明](https://docs.obsidian.md/community-directory/manage-entry)。

## 本项目可以直接填写的资料

| 字段 | 内容 |
| --- | --- |
| GitHub repository URL | `https://github.com/oranipost/visual-math-editor` |
| Name | `Visual Math` |
| ID | `visual-math-editor` |
| Author | `Oliver` |
| Author URL | `https://github.com/oranipost` |
| Version / release tag | `0.8.2`（GitHub、目录审核与原生验证分别核实；详见 TEST-REPORT） |
| Minimum Obsidian version | `1.14.4` |
| Platforms | Desktop only；目前实际验证 macOS，Windows / Linux 尚未做原生应用测试 |
| License | 0.7.0 新代码／本版整体：GPLv3 加 Obsidian 链接例外；0.6.5 及此前 MIT 授权保持有效，第三方 MIT／Apache 2.0 不变，见 [Third-party notices](../THIRD-PARTY-NOTICES.md) |
| Payment | Free |
| Support | `https://github.com/oranipost/visual-math-editor/issues` |
| Contact email | `oranipost@outlook.com`（私下联系；放在 README 与详细介绍中） |

英文短描述与 `manifest.json` 保持一致：

> Write math, chemistry and physics notes visually without learning LaTeX. Plot functions, polar curves and 3D surfaces. Explore calculus and convert units offline.

中文介绍可用：

> Visual Math（原 Visual Math Editor）帮助你在笔记正文中快速记录数学、化学和物理内容；Visual 模式零 LaTeX 基础即可上手，也可切换源码与双栏同步模式。在当前公式下方直接预览受支持的函数图像，无需重复输入；保存后公式与图像独立，修改公式后需明确重绘或编辑图像。内置化学式与可选配平建议、物理模板、元素信息、单位换算、实函数图像与复平面，以及本地自定义公式关键词。界面提供英语、简体中文和西班牙语，全部离线运行。公式保存为 LaTeX/Markdown，图像保存为可再次编辑的配置。开发者：[Oliver / oranipost](https://github.com/oranipost)。公开问题反馈请用 [GitHub Issues](https://github.com/oranipost/visual-math-editor/issues)；私下联系请发邮件至 [oranipost@outlook.com](mailto:oranipost@outlook.com)。

英文详细介绍可用：

> Visual Math (formerly Visual Math Editor) helps you take math, chemistry and physics notes quickly inside Obsidian. Visual mode provides Word-like fractions, roots, scripts, sums and integrals with no LaTeX knowledge required. Switch to LaTeX or synchronized Hybrid mode when useful. Preview a supported function directly below the current equation without entering it again. After saving, equation and graph blocks are independent; regenerate or explicitly edit the graph after changing the equation. Alternatively, use the advanced tools for a standalone function or Re/Im complex plane. Add chemistry notation, optional balancing suggestions, physics templates, element details and offline unit conversion. Save custom equation keywords to reuse your common formulas. Choose English, Simplified Chinese or Spanish. Everything runs locally, without accounts or runtime network requests. Formulas remain LaTeX/Markdown; editable graphs use a `vme-plot` block. The desktop main window is the current target; consult the test report for the exact environments checked. This is not a computer algebra system or a chemical structure drawing application.
>
> Developer: [Oliver / oranipost](https://github.com/oranipost). Report public issues on [GitHub Issues](https://github.com/oranipost/visual-math-editor/issues), or email [oranipost@outlook.com](mailto:oranipost@outlook.com) for private contact.

普通 GitHub 个人主页没有私信功能。Manifest 的 `authorUrl` 指向 GitHub；不要添加未定义的 email 字段，也不要将 `fundingUrl` 用作支持或联系链接。社区 Profile 可配置 Website 与 Social accounts；邮箱作为 README 和目录长介绍中的联系链接。

目录分类以表单的实际选项为准，优先选择数学／科学及符合已实现功能的选项。目录分类、GitHub topics 与本地公式关键词是不同机制；不要在 manifest 中添加未定义的 `tags` 或 `keywords` 字段。

以下是仓库索引使用的资料形状，方便核对一致性。**当前提交表单填仓库 URL 即可，不需要把这段 JSON 手动提交到官方仓库。**

```json
{
  "id": "visual-math-editor",
  "name": "Visual Math",
  "author": "Oliver",
  "description": "Write math, chemistry and physics notes visually without learning LaTeX. Plot functions, polar curves and 3D surfaces. Explore calculus and convert units offline.",
  "repo": "oranipost/visual-math-editor"
}
```

首次提交前，检查当时官方现有索引（9,111 条）和已移除插件列表，未发现这个 ID 或名称；这是提交前的历史核对，不表示当前目录仍无本项目条目。

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
- 目录桌面截图最多 5 张，每张 1200 × 800 像素且不超过 5 MB，格式为 JPEG、PNG 或 WebP。使用真实 Obsidian 测试库截图，必要时制作等比缩放或裁切副本，不放私人笔记。
- 两种手动安装方法都说明清楚：下载完整安装 ZIP，或者下载三个独立插件文件放入 `.obsidian/plugins/visual-math-editor/`；完成后在 Community plugins 启用。目录审核通过前不声称能在 Browse 中搜索到本项目。
- README 披露实际行为：无账户、无费用、无遥测、无运行时网络；只在用户明确插入/保存时修改当前笔记；草稿目前只暂存在内存，重启前要保存。
- 说明功能边界：复数是每行一个 `a+bi` 数值点；实函数有范围与采样限制；配平建议可选，不阻止保留原式；元素电子排布与壳层数据有来源与预测标记；没有通用符号求解、OCR 或分子结构绘图。
- 仓库公开源码、当前 GPL LICENSE、含完整 Obsidian 例外的 LICENSING.md、历史 MIT 声明，以及完整依赖、字体、mhchem 许可证与必要归属；随编译发行版提供完整对应源码与含许可证的安装 ZIP。
- 构建、逻辑测试、宽窄界面检查和实际 Obsidian 操作验证的结果写入 [TEST-REPORT.md](../TEST-REPORT.md)，不要把这些本地结果称为“官方审核通过”。
- 最终 Release tag、根目录 manifest、Release manifest 和构建产物一致；检查 GitHub Actions 成功，三个独立附件可下载。更新时同步 `versions.json`。

本地预审同时参考了[开发者政策](https://docs.obsidian.md/community-directory/developer-policies)和[官方仓库中的代码指南](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Releasing/Plugin%20guidelines.md)：避免 HTML 注入式构造、释放监听器与定时器、编辑活动笔记使用 Editor API、不要强占默认全局热键。官方扫描仍可能给出进一步修改要求。

## 后续维护

维护者应关注社区网站的检查结果、仓库 Issues 和联系邮箱。收到有效错误反馈后，先复现并修复，再发布增加版本号的 Release，不覆盖已发布版本的标签或程序附件。用户在 Obsidian 内手动检查并确认更新；手动安装的用户下载新版安装包覆盖插件分发文件，保留 `data.json` 和笔记。完整中英文说明见[更新机制](UPDATING.md)。未来增加移动端或更低 Obsidian 版本支持，应先完成对应原生环境测试，再更改兼容元数据。维护者无法继续支持时，按社区网站提供的归档或转移流程处理。
