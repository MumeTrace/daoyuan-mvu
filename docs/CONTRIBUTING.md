# 道渊 MVU 协作开发与提交规范

本文面向向本仓库提交代码的协作者，规定源码边界、酒馆宿主兼容要求、验证流程、Git 提交和 Pull Request 说明。目标是让修改在普通 MVU、Shujuku 和酒馆助手悬浮版三个环境中保持一致，而不只是让本地 Vite 页面能够运行。

## 1. 开始之前

开发环境：

- Node.js 18 或更高版本；
- pnpm 8 或更高版本；
- 用于最终验收的 SillyTavern、酒馆助手和 MVU 环境；
- 修改 Shujuku 时，还需要提供 `AutoCardUpdaterAPI` 的对应插件环境。

首次安装：

```bash
pnpm install
```

提交修改前，应先阅读根目录 `README.md`、`src/types/` 中的本地宿主声明、相关 `src/bridge/` 实现以及相关构建和验证脚本。

不要从旧截图、历史 JSON、mock 或方案文档推断 Tavern Helper/MVU API。项目本地类型与实际宿主行为优先。

## 2. 分支与修改范围

- 一个分支只处理一个能够清楚描述的主题。
- 功能修复建议使用 `fix/<主题>`，新增建议使用 `feat/<主题>`，结构重构建议使用 `refactor/<主题>`。
- 不要在功能 PR 中夹带无关格式化、依赖升级或大范围重命名。
- 不要覆盖其他协作者未提交的工作区修改。
- 不要使用 `git reset --hard`、无说明的强制推送或破坏共享历史。
- 大型重构先创建 Draft PR，完成完整验证后再转为正式评审。

## 3. 三种产物必须同时考虑

| 目标 | 构建命令 | 最终文件 |
| --- | --- | --- |
| MVU | `pnpm build:mvu` | `dist/regex-mvu.json` |
| Shujuku | `pnpm build:shujuku` | `dist/regex-shujuku.json` |
| 悬浮窗 | `pnpm build:floating-mvu` | `dist/daoyuan-floating-mvu.json` |

共享 UI、桥接、存储、图片、弹窗或样式发生变化时，必须运行 `pnpm build:all`。不要因为一个版本可以打开，就断定另外两个版本兼容。

`dist/index.html` 是构建中间文件。所有生成文件都必须由脚本产生，不允许直接手工修改 `replaceString` 或悬浮 JSON 中的内联代码。

## 4. 模块边界

- Vue 组件负责展示和用户交互，不直接散落读取 `window.*`。
- Pinia Store 负责可观察状态、派生数据和领域操作。
- `src/composables/` 负责可复用的交互流程，例如生成、MVU 写入、世界书和立绘。
- `src/bridge/` 负责 Tavern Helper、MVU、Shujuku、事件、DOM 和存储边界。
- `src/features/` 负责不依赖具体页面布局的图片库和立绘领域逻辑。
- `src/compatibility-runtime.ts` 只保留宿主或旧调用方确实需要的兼容导出。
- `scripts/` 负责构建包装和产物校验，不承载页面业务逻辑。

新增跨层调用时，应从组件到 Store/Composable，再进入 Bridge；不要让组件直接判断不同宿主版本。

## 5. TypeScript 与 Vue 规范

- 新增浏览器源码使用 TypeScript；Vue 组件使用 `<script setup lang="ts">`。
- 不使用无理由的 `any`；宿主返回值先声明为 `unknown`，完成结构检查后再缩窄。
- 对象字段缺失必须有回退，不假设角色卡一定提供完整数据。
- 异步宿主调用、网络请求和持久化写入必须 `await`，并向界面返回成功或失败。
- 组件卸载时停止 watcher、事件句柄、观察器、定时器和外部 DOM。
- 列表使用稳定业务键；临时输入行使用单调 ID，不使用会变化的数组内容作为键。
- 业务状态放在 Store，不把状态藏在全局变量或组件外的可变单例中。
- 样式优先复用 `src/styles/variables.css` 的主题变量，避免新增与全局主题冲突的硬编码颜色。

## 6. Tavern Helper 与 MVU 规范

- 页面楼层数据使用 `getCurrentMessageId()`，不要无条件读取 `latest`。
- `Mvu.getMvuData()` 返回完整 `MvuData`；写回时必须保留未知顶层字段。
- `getAllVariables()` 是合并后的只读视图，不能直接整体写回某个 scope。
- `generate()` 可能返回字符串或工具调用结果，调用者必须缩窄返回类型。
- `getPersonaAvatarPath()` 可能返回 `null`，界面必须提供回退。
- `eventOn()` 的主要清理方式是返回值中的 `stop()`，不能假定所有版本都有 `eventOff()`。
- 新增可选能力时先进行 capability 探测；缺失能力应显示项目内错误，不能让页面静默失效。

## 7. MVU 写入规范

写入前必须确定数据属于哪个消息楼层。标准顺序是：

1. 取得当前 iframe 的消息 ID。
2. 使用明确的 message scope 读取完整 `MvuData`。
3. 只修改目标路径。
4. 等待 `replaceMvuData()` 完成。
5. 通知状态栏刷新。

如果无法确定楼层，必须拒绝写入。不得为了“能保存”而回退到最新消息、全局变量或合并变量快照。

## 8. Shujuku 适配规范

- Shujuku 适配器必须在 Vue 应用之前注入。
- 新的写入路径必须在 `resolvePath()` 中声明表名、主键列和主键值。
- 能用 `updateCell` 或 `updateRow` 时，不得回退为整个 `stat_data` 覆盖。
- 删除受保护的主角行必须被拒绝。
- 玉简消息通过专用读取、追加和删除方法维护历史结构。
- 存储失败必须向调用者抛出，不能先更新内存后吞掉持久化错误。
- 修改适配器后同时更新本地类型、源码级验证和两个相关构建产物。

## 9. 图片与本地存储规范

- 远程图片库必须经过 Schema、实体类型、URL 和主题校验。
- 抽屉名称、图标、顺序和别名必须读取并校验远程 `portrait-drawers.json`；不得在组件或 Store 中为远程主题另写一套显示映射。
- 角色主题选择、索引和图片引用存入 `daoyuan_portrait_preferences_v2`。
- 本地上传的 base64 图片本体存入 IndexedDB 数据库 `daoyuan_status_assets`。
- 偏好中只保存 `idb:daoyuan-portrait:` 引用，避免占满 localStorage。
- IndexedDB 不可用时可以保留兼容数据，但必须报告持久化失败风险。
- 迁移写入遇到配额错误时，可以先清除可重新下载的图片库缓存，再重试一次。
- 只有新偏好和迁移版本都确认写入后，才能删除旧立绘键。
- 删除或重置自定义立绘后，应清理 IndexedDB 中不再使用的图片记录。
- `special` 主题仍需满足好感或亲密大于 90 的业务规则。

## 10. UI、主题和可访问性规范

- 保持黑金主题变量和现有视觉语言，警告与危险操作使用红色语义。
- 禁止使用浏览器原生 `alert`、`confirm` 或 `prompt` 作为正式交互。
- 弹窗必须支持明确标题、取消和确认操作，并避免内容超出 iframe 后无法关闭。
- 长人物列表、绝色榜、玉简消息、公告和设置表单必须能够纵向滚动。
- 不使用突兀的系统滚动条样式；桌面与移动端分别检查滚动容器。
- 可点击整行时不要额外放置没有必要的展开三角。
- 按钮应有 `type="button"`、可理解的文本或 `aria-label`，禁用状态必须可见。
- 异步保存和生成期间禁用重复提交，并给出加载、成功或失败反馈。
- 状态栏折叠、页签切换和悬浮窗拖动不能破坏当前输入及滚动位置。

## 11. 网络与安全规范

- 图片地址使用图片 URL 校验，外部页面使用网页 URL 校验。
- 只允许明确需要的 `http:`、`https:` 或受控 `data:image/`。
- 公告清理器只用于道渊公告白名单格式，不得宣传为通用 XSS 防护。
- 外部链接使用 `noopener,noreferrer`。
- 不向日志、提交、Issue 或 PR 写入 API Key、令牌、Cookie 或个人会话信息。
- 自定义 API 必须明确请求路径、错误状态和返回结构；不能把任意对象当作文本。
- 外部 CDN 或远程资源失败不能阻止状态栏基础界面加载。

## 12. 生命周期与性能规范

- 顶栏、状态区、导航和默认概览应优先显示。
- 复杂页签可以首次访问时挂载，但再次切换要保留组件状态。
- 图片库、公告和预加载等非关键任务放在首次绘制之后。
- 用户主动进入相关功能时立即加载，不能继续等待空闲回调。
- 不在每次响应式更新中重复注册宿主监听或创建全局 DOM。
- 对外部 iframe、Teleport、观察器和定时器提供幂等 teardown。
- 优化必须记录改善对象：DOM 数量、布局计算、网络阻塞或重复宿主调用；不能只凭打包成功判断性能改善。

## 13. 提交前验证

按改动范围运行最小但完整的检查：

```bash
pnpm typecheck
pnpm validate:adapters
pnpm validate:images
pnpm build:all
git diff --check
```

| 改动范围 | 必须执行 |
| --- | --- |
| TypeScript、Vue 或 Store | `pnpm typecheck` |
| 图片 Schema、主题、偏好或迁移 | `pnpm validate:images` + `pnpm build:all` |
| MVU/Shujuku/悬浮桥 | `pnpm validate:adapters` + `pnpm build:all` |
| 正则包装、内联脚本、`srcdoc` | `pnpm build:all` |
| 共享 UI、样式、生命周期 | `pnpm build:all` + 本地 iframe/Tavern 模拟 |
| 发布候选 | 上述全部检查 + 三种真实酒馆导入 |

构建成功只代表产物能够生成并通过模拟校验，不代表真实宿主验收成功。PR 必须分别说明自动检查、本地模拟和真实酒馆检查的结果。

## 14. Git 提交规范

提交标题建议使用以下前缀：

- `feat:` 新功能；
- `fix:` 缺陷修复；
- `refactor:` 不以新增功能变化为目的的结构调整；
- `perf:` 性能优化；
- `docs:` 仅文档；
- `build:` 构建或依赖；
- `test:` 验证逻辑。

标题应说明结果，例如：

```text
refactor: 使用 Vue 3、TypeScript 和 Pinia 重构状态栏
fix: 将本地立绘迁移到 IndexedDB
```

提交前使用 `git diff --cached` 检查暂存内容，确认没有密钥、临时文件、无关格式化和遗漏的新文件。

## 15. Pull Request 规范

大型改动使用 Draft PR。标题和正文应使用清晰的中文，并至少包含：

1. 背景与修改目的；
2. 主要功能与架构变化；
3. 三种构建产物的兼容情况；
4. MVU、Tavern Helper、Shujuku 和悬浮桥相关改动；
5. 数据迁移、存储或安全影响；
6. 已运行的命令及结果；
7. 已完成与尚未完成的真实酒馆检查；
8. 风险、回退办法和希望审查者重点查看的文件。

不要只写“重构”或“修复若干问题”。如果视觉或交互发生变化，应附带前后截图；如果没有刻意改变外观，也要明确说明保持兼容是目标而不是绝对保证。

## 16. 禁止事项

- 不提交 API Key、登录令牌、Cookie 或真实用户数据。
- 不把 mock 行为写成宿主正式契约。
- 不直接写回 `getAllVariables()` 的合并结果。
- 不在无法确定消息楼层时修改 MVU 数据。
- 不吞掉存储、网络和宿主写入错误后假装成功。
- 不删除兼容导出，除非三个产物和真实宿主均确认无调用者。
- 不只构建一个产物后声明整个项目完成。
- 不用本地预览替代真实 SillyTavern 验收。
- 不在仓库中添加阶段报告、一次性测试页面或临时工作目录。
