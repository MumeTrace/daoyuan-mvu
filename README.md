# 道渊 MVU 状态栏

面向 SillyTavern、酒馆助手（Tavern Helper）和 MVU 的 Vue 3 状态栏项目。源码使用 TypeScript、Vue 3、Pinia 与 Vite 维护，一套界面分别构建为消息楼层 MVU 版、Shujuku 数据库版和酒馆助手悬浮版三个独立 JSON 产物。

## 主要功能

- 展示主角状态、气运、宗门、异常状态、储物袋和当前世界信息。
- 提供概览、功法、道侣、人物、灵宠、机遇、绝色榜、动向、玉简和舆图十个页签。
- 读取人物立绘与宗门舆图，支持远程图库同步、本地缓存、自定义图片、图片放大与拖动查看。
- 提供绝色榜帖子、回复生成和自定义 API 设置。
- 提供玉简联系人、消息记录、预设、生成、停止、重试及世界书选择。
- 支持公告、成就提示、玖柒资料编辑、缺失立绘提醒以及统一的主题内弹窗。
- 接入道渊 Wiki 的 `daoyuan-applause` 点赞组件；外部脚本加载失败时不阻塞状态栏主体。
- 页签内容首次访问时才挂载，图片库和公告在首屏绘制后加载，减少每个消息楼层状态栏的初始 DOM 和启动开销。

## 项目边界与设计原则

这个仓库维护的是酒馆内运行的状态栏前端，不是独立的网站，也不负责定义 MVU 变量规则、角色卡世界书或 Shujuku 数据库插件本身。开发时遵守以下边界：

- SillyTavern、Tavern Helper、MVU、Shujuku 和道渊自身的兼容层分别处理，不能因为它们都可能出现在 `window` 上就混为一个 API。
- UI 组件只消费 Store；宿主全局访问集中在 `src/bridge/`、`src/compatibility-runtime.ts` 和构建脚本中。
- 消息楼层版以当前 iframe 所在楼层为数据拥有者；悬浮版才按其桥接规则跟随最新可用 MVU 楼层。
- 数据写回必须保留完整 `MvuData`，不能只把 `stat_data` 覆盖回去，否则会丢失 `initialized_lorebooks` 等 MVU 元数据。
- 三种产物拥有各自的启动、存储和清理路径，任何共享界面改动都必须同时考虑三种运行环境。
- `origin/` 是生成正则产物所使用的模板，`dist/` 是可重新生成的输出，`legacy/` 只保存历史对照资料。

## 界面模块与数据来源

| 界面 | 主要数据路径 | 说明 |
| --- | --- | --- |
| 顶部状态区 | `stat_data.主角`、`stat_data.世界` | 显示境界、数值条、气运、宗门、状态、时间和地点 |
| 概览 | `stat_data.主角.储物袋`、`stat_data.主角.器物` | 支持分类切换和条目操作 |
| 功法 | `stat_data.主角.功法` | 展示功法类型、等级、熟练度和描述 |
| 道侣 | `stat_data.道侣` | 人物卡、立绘、好感或亲密信息 |
| 人物 | `stat_data.人物` | NPC 卡片、立绘抽屉和人物编辑入口 |
| 灵宠 | `stat_data.灵宠` | 灵宠卡片及对应立绘 |
| 机遇 | `stat_data.机遇` | 任务状态、地点、目标和描述 |
| 绝色榜 | `stat_data.绝色榜` | 排名、角色资料、帖子、回复和回复 API 设置 |
| 动向 | `stat_data.世界.动向` | 世界事件列表；遭遇冷却读取 `stat_data.世界.遭遇冷却` |
| 玉简 | `stat_data.玉简` | 联系人和 `历史记录`，支持生成、停止、重试及世界书注入 |
| 舆图 | 图片库中的宗门 `map` 主题及内置地图数据 | 2D 节点、地点详情、宗门图和外部 3D 地图入口 |

数值条显示的是当前值相对上限的比例。源数据超过上限时，视觉比例和百分比最多显示为 100%，但不会反向修改原始变量。

## 三种构建产物

| 产物 | 构建命令 | 使用场景 | 运行时依赖 |
| --- | --- | --- | --- |
| `dist/regex-mvu.json` | `pnpm build:mvu` | 聊天消息楼层中的 MVU 状态栏 | 酒馆助手与 MVU |
| `dist/regex-shujuku.json` | `pnpm build:shujuku` | 使用 Shujuku/表格数据接口的状态栏 | 酒馆助手与 `AutoCardUpdaterAPI` |
| `dist/daoyuan-floating-mvu.json` | `pnpm build:floating-mvu` | 独立、可拖动缩放的悬浮状态栏 | 酒馆助手与 MVU |

三个产物共享 Vue 界面，但入口、数据桥和宿主生命周期彼此独立。不要用一个产物替代另一个，也不要直接手工修改 `dist/` 中的生成文件。

### 运行时能力差异

| 能力 | MVU 消息楼层版 | Shujuku 数据库版 | 悬浮版 |
| --- | --- | --- | --- |
| UI 载体 | 正则替换生成的消息 iframe | 正则替换生成的消息 iframe | 酒馆助手脚本创建的独立 iframe |
| 主数据读取 | 当前消息楼层的 `Mvu.getMvuData()` | `AutoCardUpdaterAPI` 表格转 `stat_data` | 最新可用 MVU 消息楼层 |
| 数据写入 | 当前消息楼层的 `Mvu.replaceMvuData()` | 类型化表格行/单元格写入 | 通过父窗口 MVU 代理写回目标楼层 |
| 状态刷新 | MVU 更新事件和项目手动更新事件 | 数据库订阅和项目手动更新事件 | MVU 更新事件经父子 iframe 桥转发 |
| 持久化 | 当前 iframe 可用的浏览器存储 | `DaoyuanStatusStorage` 隔离存储 | 父窗口存储桥与悬浮布局专用键 |
| 页面尺寸 | 由消息内容和 iframe 决定 | 由消息内容和 iframe 决定 | `ResizeObserver` 通知父窗口并受可拖动窗口约束 |
| 卸载清理 | `pagehide` 时卸载 Vue 和停止监听 | 同左，并停止数据库订阅 | 额外移除父窗口节点、事件、观察器和桥对象 |

### 必需和可选的宿主能力

| 宿主能力 | 用途 | 缺失时行为 |
| --- | --- | --- |
| `waitGlobalInitialized` | 等待异步注入的 MVU 全局 | 需要 MVU 的功能会报告能力缺失 |
| `Mvu.getMvuData` | 读取完整、带元数据的 MVU 对象 | MVU 版不能初始化真实数据 |
| `Mvu.replaceMvuData` | 写回当前消息楼层 | 修改、删除和玉简写入不可用 |
| `eventOn` / 返回值的 `stop()` | 监听变量和生成事件并可靠清理 | 尝试兼容 `eventOff`，否则只保留受控监听状态 |
| `eventEmit` | 广播项目手动更新 | 写入成功但即时刷新失败时记录警告 |
| `getCurrentMessageId` | 确定消息楼层写入 scope | 为避免写错楼层，MVU 修改会被取消 |
| `generate` | 使用酒馆模型生成玉简回复 | 可改用已配置的 OpenAI 兼容 API |
| `stopGenerationById` | 停止当前界面发起的生成 | 仅在宿主提供能力时停止酒馆生成 |
| 世界书相关 API | 读取和选择玉简生成上下文 | 世界书选择功能降级或提示不可用 |
| `getPersonaAvatarPath` | 当前用户头像 | 返回空值时使用界面回退表现 |
| `AutoCardUpdaterAPI` | Shujuku 表格读写 | Shujuku 版无法工作，不会回退为不安全的整对象写入 |

## 技术栈与环境

- Node.js 18 或更高版本
- pnpm 8 或更高版本
- Vue 3.5
- Pinia 3
- TypeScript 5.9
- Vite 5 与 `vite-plugin-singlefile`

安装依赖：

```bash
pnpm install
```

## 本地开发

### 独立状态栏预览

```bash
pnpm dev
```

默认从 `http://127.0.0.1:5173/` 打开状态栏。Vite 仅在开发模式注入 `src/adapters/mock.ts`，用于模拟 Tavern Helper 与 MVU 数据；mock 不会进入生产产物。

### iframe 尺寸预览

```bash
pnpm dev:iframe
```

打开 `src/iframe-test.html`，用于检查桌面、平板、手机和可调整 iframe 容器中的尺寸、滚动与响应式布局。

### Tavern 聊天页模拟

```bash
pnpm dev:tavern
```

默认使用 `http://127.0.0.1:5174/tavern/`，将状态栏作为消息内容中的 iframe 挂载，用于检查高度同步、滚动、浮层和聊天页遮挡。该环境仍是本地模拟，不等同于真实 SillyTavern 验收。

如果端口被旧进程占用，可以运行：

```bash
pnpm kill 5173
pnpm kill 5174
```

## 构建

构建全部三个产物：

```bash
pnpm build:all
```

也可以分别构建：

```bash
pnpm build:mvu
pnpm build:shujuku
pnpm build:floating-mvu
```

构建过程会：

1. 将 Vue、TypeScript、CSS 和本地图片打包为单文件 HTML。
2. Shujuku 版在 Vue 应用之前注入 `src/shujuku-adapter.ts` 编译得到的 IIFE。
3. MVU 与 Shujuku 版把 HTML 安全写入各自正则 JSON 的 `replaceString`。
4. 悬浮版把单文件 HTML、宿主 API 桥、布局逻辑和悬浮宠物资源封装为酒馆助手脚本 JSON。
5. 校验 JSON、正则替换、多轮 `$1`/`$2` 替换安全、内联脚本语法、桥接能力和悬浮窗 teardown。

`dist/index.html` 是构建过程的中间单文件页面；最终交付物是上表中的三个 JSON 文件。

### 构建输入与输出对应关系

| BUILD_TARGET | 正则/脚本输入 | Vite 页面 | 后处理输出 |
| --- | --- | --- | --- |
| `mvu` | `origin/regex-mvu.json` | `dist/index.html` | `dist/regex-mvu.json` |
| `shujuku` | `origin/regex-shujuku.json` + `src/shujuku-adapter.ts` | `dist/index.html` | `dist/regex-shujuku.json` |
| `floating` | `src/assets/floating-pet/*.webp` + 悬浮桥 | `dist/index.html` | `dist/daoyuan-floating-mvu.json` |

主构建设置 `cssCodeSplit: false`、超大内联资源阈值和 `inlineDynamicImports: true`，确保状态栏 HTML 不依赖本地分块文件。外部的 `daoyuan-applause` CDN 仍保持为外链模块，并使用异步加载。

MVU 和 Shujuku 的 `replaceString` 会被酒馆正则系统再次处理，因此构建脚本会编码 `$1`、`$2`、`$&` 等替换敏感内容。验证脚本不仅解析 JSON，还会模拟多轮替换、提取最终 HTML，并编译内联 JavaScript。任何绕过后处理直接复制 HTML 的做法都可能在真实酒馆中破坏脚本。

悬浮版则把 HTML 序列化进角色脚本，并建立父页面与子 iframe 的能力白名单。新增宿主调用时，需要同时修改桥接白名单、类型声明和验证脚本，不能简单把整个宿主 `window` 暴露给 iframe。

## 检查命令

```bash
pnpm typecheck
pnpm validate:adapters
pnpm validate:images
pnpm build:all
```

| 命令 | 检查内容 |
| --- | --- |
| `pnpm typecheck` | Vue SFC、浏览器源码和 Node 配置的 TypeScript 类型 |
| `pnpm validate:adapters` | Shujuku 与悬浮桥的源码级契约 |
| `pnpm validate:images` | 图片结构、主题选择、偏好迁移和缓存行为 |
| `pnpm build:all` | 三个产物的完整构建及产物级校验 |

构建通过只代表打包和模拟校验通过。发布前仍需把三个 JSON 分别导入与其对应的真实酒馆环境，验证消息楼层、当前楼层变量、世界书、生成、图片、移动端布局和卸载清理。

## 导入方式

### MVU 消息楼层版

将 `dist/regex-mvu.json` 导入酒馆中当前角色或聊天所使用的正则配置，并确认酒馆助手与 MVU 已启用。状态栏优先读取承载当前 iframe 的消息楼层，而不是无条件读取最新楼层。

### Shujuku 数据库版

将 `dist/regex-shujuku.json` 导入对应正则配置。此版本会在页面头部优先安装 Shujuku 适配层，并等待 `AutoCardUpdaterAPI`，用于读取和写入表格数据。

### 酒馆助手悬浮版

将 `dist/daoyuan-floating-mvu.json` 导入酒馆助手角色脚本库，并手动启用新导入的脚本。悬浮版提供：

- 独立开关按钮；
- 窗口拖动与四角缩放；
- 桌面与移动端独立布局约束；
- 窗口、按钮位置和显示状态持久化；
- MVU 更新后的原窗口刷新；
- iframe 高度、宿主 API、事件与存储桥接；
- 页面卸载时移除监听、观察器和挂载节点。

## 生命周期与加载策略

状态栏会在每个命中的消息楼层中创建独立 Vue 应用，因此首屏工作会随状态栏实例数累积。当前加载顺序为：

1. 先挂载顶栏、状态区、导航和默认概览。
2. 其余页签第一次点击时创建，之后使用显示切换保留折叠、输入和滚动状态。
3. 图片库缓存解析、远程同步和公告请求安排到首次绘制后的浏览器空闲时间。
4. 如果用户先进入人物、道侣、灵宠、绝色榜、玉简或舆图，图片库立即加载，不继续等待空闲回调。
5. 如果用户主动打开公告，公告立即加载。
6. `daoyuan-applause` 以异步外部模块加载，不阻塞 Vue 主体。

因为 Vite 最终生成单文件，页签延迟挂载主要减少初始 DOM、组件副作用和布局计算，不会显著减少 JSON 下载大小或 JavaScript 解析体积。消息楼层版会在每个状态栏实例上获得这部分收益；悬浮版通常只有一个常驻实例，收益主要体现在首次打开。

浏览器不支持 `requestIdleCallback` 时会自动回退到定时器，非关键任务不会无限等待。所有延迟任务、事件监听和 Vue 应用都在页面卸载路径中清理。

## 数据与宿主边界

主数据流如下：

```text
Tavern Helper / MVU / Shujuku
            ↓
        src/bridge
            ↓
  useStatData / useMvuWrite
            ↓
        Pinia stores
            ↓
       Vue components
```

- `src/bridge/` 隔离 Tavern Helper、MVU、Shujuku、事件、DOM 与存储能力。
- `useStatData` 读取完整 `MvuData` 中的 `stat_data`，再分发给各业务 Store。
- MVU 写回使用明确的消息楼层 scope，并保留 `initialized_lorebooks` 等未知顶层元数据。
- `getAllVariables()` 只作为合并后的只读回退，不会把合并快照直接写回。
- `eventOn()` 返回的 `{ stop() }` 会在页面卸载时清理。
- 必须保留的宿主兼容导出集中在 `src/compatibility-runtime.ts` 和 `src/bridge/window-exports.ts`。
- Shujuku 版的数据库与存储兼容层位于 `src/shujuku-adapter.ts`。

### MVU 数据结构示例

状态栏允许各对象包含额外字段；下面只列出主要读取路径，不是用于限制角色卡变量的完整 Schema：

```yaml
initialized_lorebooks: []          # MVU 顶层元数据，写回时必须保留
stat_data:
  主角:
    姓名: 林风
    生命: 80
    生命上限: 100
    精血: 70
    精血上限: 100
    灵力: 450
    灵力上限: 500
    修为: 990
    修为上限: 1000
    神识: 200
    神识上限: 200
    道心: 100
    道心上限: 100
    气运: {}
    功法: {}
    储物袋: {}
    器物: {}
  道侣: {}
  人物: {}
  灵宠: {}
  机遇: {}
  绝色榜: {}
  玉简:
    某位联系人:
      历史记录: {}
  世界:
    当前时间: 午时
    当前地点: 玄天界
    遭遇冷却: 8
    动向: {}
```

重要规则：

- `Mvu.getMvuData()` 返回的是完整 `MvuData`，并不等于 `stat_data`。
- UI 展示允许字段缺失；Store 会把非对象或缺失分支归一化为空对象。
- `世界.动向` 是当前 UI 的标准动向路径；Shujuku 的独立“动向表”会适配到该路径。
- `世界.遭遇冷却` 为数字或数字字符串时显示为“数值 + 轮”；缺失或空值显示为 `—`。
- 人物列表以对象键作为稳定名称来源，字段中的 `姓名` 用于补充展示。
- 玉简历史位于 `玉简.<联系人>.历史记录`，发送、删除或重新生成后会重新读取并分发数据。

### MVU 读取与刷新顺序

1. Vue 挂载后，`createStatDataController()` 启动数据控制器。
2. 优先识别 Shujuku 适配层；否则等待 `window.Mvu`。
3. 消息楼层版通过 `getCurrentMessageId()` 获取当前 iframe 所在楼层。
4. 从明确的 `{ type: "message", message_id }` scope 读取完整 MVU 对象。
5. 提取 `stat_data`，分别分发给主角、人物、灵宠、机遇、动向、绝色榜和玉简 Store。
6. 监听 MVU 更新完成事件、Shujuku 数据变更或 `daoyuan_mvu_manual_updated`，按来源重新读取。
7. `pagehide` 时停止所有事件句柄并卸载 Vue。

### 安全写回流程

MVU 版修改数据时不会构造一个新的裸 `stat_data`：

1. 获取当前消息楼层 ID；无法确定时拒绝写入。
2. 读取该 scope 的完整 `MvuData`。
3. 只修改目标字段，同时保留未知顶层字段。
4. 等待 `Mvu.replaceMvuData()` 完成。
5. 发出项目手动更新事件，让当前界面和悬浮桥刷新。

Shujuku 版不会复用 MVU 的整对象写回。它会把路径解析为已声明的表格行，再调用 `updateRow`、`updateCell`、`insertRow` 或 `deleteRow`。无法映射的路径会明确报错，避免把合并数据错误覆盖进数据库。

### Shujuku 表格映射

| 状态栏路径 | 表名 | 主键列 |
| --- | --- | --- |
| `主角` | `主角属性表` | `角色名 = 主角` |
| `人物.<姓名>` | `NPC表` | `姓名` |
| `道侣.<姓名>` | `道侣表` | `姓名` |
| `灵宠.<姓名>` | `灵宠表` | `姓名` |
| `机遇.<任务名>` | `机遇表` | `任务名` |
| `绝色榜.<姓名>` | `绝色榜表` | `仙子姓名` |
| `玉简.<姓名>` | `玉简好友表` | `好友姓名` |
| `世界.动向.<名称>` | `动向表` | `动向名` |

`世界状态表` 中旧的动向对象只用于兼容读取；存在独立“动向表”时，以独立表为详细事件数据源。

## 远程资源与安全边界

运行时可能访问：

- 道渊仓库的 `images.json` 与 `notice.json`；
- 道渊 Wiki 和 `daoyuan-applause` CDN；
- 舆图、角色立绘和玖柒图片地址；
- 用户在绝色榜或玉简设置中填写的自定义 API。

远程图片和网页链接会经过 URL 类型限制。公告 HTML 只按道渊公告的受控格式进行白名单清理，不应被当作通用 HTML/XSS 清理器。自定义 API 密钥保存在当前产物可用的本地存储中，请只在可信设备和可信服务地址上使用。

图片库初始化、公告请求与点赞脚本均不会阻塞首屏主体。用户主动进入依赖图片的页签或打开公告时，会立即触发对应加载。

### 图片库格式与选择

远程图片库地址定义在 `src/features/image-library/constants.ts`。解析器要求 `schemaVersion` 与当前支持版本一致，并要求实体位于 `data.entities`：

~~~json
{
  "schemaVersion": 2,
  "data": {
    "entities": {
      "角色或宗门名": {
        "type": "character",
        "images": [
          {
            "url": "https://example.com/portrait.webp",
            "theme": "default",
            "tags": ["示例"]
          }
        ]
      }
    }
  }
}
~~~

- 图片只接受 `http:`、`https:` 或受支持的 `data:image/` 地址。
- 每张图片必须具有非空 `theme`；不支持的实体类型或 Schema 会拒绝整份远程数据。
- 成功解析的数据写入 `daoyuan_images_cache_v2`，后续优先从缓存启动。
- 用户选择的角色主题、索引和自定义图片引用写入 `daoyuan_portrait_preferences_v2`。
- 本地上传的 base64 图片本体写入 IndexedDB 数据库 `daoyuan_status_assets` 的 `portrait_images` 对象仓库。
- 偏好数据仅保存 `idb:daoyuan-portrait:` 引用，避免大图片占满 localStorage。
- IndexedDB 不可用时保留兼容回退；持久化失败不会被当作保存成功。
- 旧偏好迁移遇到存储配额不足时，会先删除可重新下载的 `daoyuan_images_cache_v2` 再重试。
- 只有新偏好与迁移版本都写入成功后才删除旧键；失败时旧数据继续保留。
- 旧版普通、女性和特殊立绘键只在一次性迁移时读取，迁移完成后记录版本。
- `special` 等主题规则由立绘领域模块处理，不能在卡片组件中临时改写。
- 宗门舆图从 `type: "sect"` 实体中选择 `theme: "map"` 的图片。

### 玉简与绝色榜生成

玉简回复有两条生成路径：

1. 未配置自定义 API 时，调用 Tavern Helper `generate()`，订阅当前生成 ID 的流式事件，并在完成或异常后清理监听。
2. 同时配置基础 URL 和模型后，调用 OpenAI 兼容的 `/chat/completions`；支持 SSE 流式响应和普通 JSON 响应。

玉简设置中的“获取模型”会访问同一基础 URL 下的 `/models`。停止生成时，自定义 API 使用 `AbortController`，酒馆生成使用 `stopGenerationById()`；最终文本还会经过角色名和包裹符号清理后才写入历史。

世界书选择、生成预设和自定义提示均按本地存储保存。绝色榜回复拥有独立的 API 设置与预设，不与玉简设置共用，避免修改一处影响另一处。

### 本地存储键

| 键 | 内容 |
| --- | --- |
| `daoyuan_bar_collapsed` | 整个状态栏折叠状态 |
| `daoyuan_btns_collapsed` | 顶部按钮区折叠状态 |
| `jiuqi_story_seen_<主角名>` | 当前主角是否已看过玖柒首次提示 |
| `daoyuan_images_cache_v2` | 校验后的远程图片库缓存 |
| `daoyuan_portrait_preferences_v2` | 角色立绘主题、索引和图片引用，不保存 IndexedDB 中的图片本体 |
| `daoyuan_portrait_preferences_migration_version` | 旧立绘偏好迁移版本 |
| `daoyuan_notice_read_version` | 已读版本公告 |
| `daoyuan_notice_read_portrait_update` | 已读立绘更新公告 |
| `daoyuan_beauty_forum_settings` | 绝色榜回复 API 设置 |
| `daoyuan_beauty_forum_presets` | 绝色榜回复预设 |
| `daoyuan_wx_settings` | 玉简生成设置 |
| `daoyuan_wx_presets` | 玉简生成预设 |
| `daoyuan_wx_lore_selected` | 每位玉简联系人的世界书选择 |
| `daoyuan_wx_read_states` | 玉简会话已读状态 |
| `dy_collapse` | 卡片和分组折叠状态 |
| `dy_map3d_warned` | 3D 舆图性能提醒是否不再显示 |

普通 MVU 版使用当前页面可用的浏览器存储；Shujuku 版优先使用 `DaoyuanStatusStorage`；悬浮版通过父页面桥接存储，并另外维护悬浮窗口布局键。不要在不同产物之间假设这些存储天然共享。

本地图片本体不在上表的键值存储中，而位于 IndexedDB 的 `daoyuan_status_assets/portrait_images`。保存、删除、重置和旧数据迁移会同步维护引用与实际图片记录。

## 源码结构

```text
data/                         点赞角色登记等随项目维护的数据
docs/                         外部组件接入说明
legacy/shujuku/               不参与构建的旧版 Shujuku 对照资料
origin/                       MVU 与 Shujuku 正则 JSON 模板
scripts/                      构建后处理、产物校验、提取和端口工具
src/
  adapters/                   仅开发环境使用的宿主 mock
  assets/floating-pet/        悬浮按钮宠物动画资源
  bridge/                     Tavern Helper、MVU、Shujuku、事件与存储桥
  components/                 Vue 布局、页签、卡片、地图、弹窗与共享组件
  composables/                MVU 写入、生成、世界书、搜索、立绘等组合逻辑
  data/                       内置舆图与地点数据
  features/                   图片库与立绘规则等独立领域模块
  services/                   状态栏内服务
  stores/                     Pinia 状态层
  styles/                     主题变量、布局、组件和响应式样式
  types/                      宿主 API、MVU 和业务数据类型
  compatibility-runtime.ts    受控的宿主兼容导出
  core-ui.ts                  Vue 应用挂载与卸载
  main.ts                     应用入口及非关键加载调度
  shujuku-adapter.ts          Shujuku 提前注入适配器
tavern/                       本地 Tavern 聊天页模拟环境
vite.config.ts                主构建与三目标配置
vite.iframe.config.ts         iframe 预览配置
vite.mock-plugin.ts           开发 mock 注入插件
```

生产界面的浏览器源码已迁移为 TypeScript。仓库中仍保留的 JavaScript 只承担 Node.js 构建/校验脚本，以及 `tavern/main.js` 的本地聊天页模拟交互；后者不会被打入三个酒馆 JSON 产物。`src/shujuku-adapter.ts` 属于正式运行时，已经使用 TypeScript。

### 历史 Shujuku 资料

`legacy/shujuku/` 中的三个文件未被当前源码或构建脚本引用，只用于历史对照：

| 文件 | 用途 |
| --- | --- |
| [regex-道渊状态栏-shujuku多功能版1_4_8.json](./legacy/shujuku/regex-道渊状态栏-shujuku多功能版1_4_8.json) | 旧版可导入 Shujuku 正则成品 |
| [TavernDB_template_青云(1).json](<./legacy/shujuku/TavernDB_template_青云(1).json>) | 青云主题的 TavernDB 示例表格数据 |
| [temp_shujuku.html](./legacy/shujuku/temp_shujuku.html) | 旧版 Shujuku 正则中提取或导出的单文件 HTML |

它们不是当前构建输入，也不是当前发布产物。当前模板只认 `origin/regex-mvu.json` 与 `origin/regex-shujuku.json`，当前成品只认 `dist/` 下的三个 JSON。

### 关键模块职责

| 模块 | 职责 |
| --- | --- |
| `src/main.ts` | 启动应用，并把图片库初始化调度到首屏之后 |
| `src/core-ui.ts` | 创建 Vue 应用、安装 Pinia，并在 `pagehide` 时卸载 |
| `src/runtime-state.ts` | 启动和停止 MVU/Shujuku 数据控制器 |
| `src/composables/useStatData.ts` | 选择数据源、读取当前 scope、监听更新并向 Store 分发 |
| `src/composables/useMvuWrite.ts` | MVU 完整对象写回及 Shujuku 类型化字段写入 |
| `src/composables/useChatGenerate.ts` | 玉简的酒馆生成、自定义 API、流式更新和停止 |
| `src/bridge/tavern-api.ts` | 消息、变量、生成、人物头像等 Tavern Helper 能力 |
| `src/bridge/mvu-bridge.ts` | MVU 就绪等待、读取、写回和更新事件解析 |
| `src/bridge/event-bus.ts` | 把宿主事件监听统一包装为可停止句柄 |
| `src/bridge/shujuku-api.ts` | Vue 层调用 Shujuku 适配器的类型化入口 |
| `src/bridge/storage-runtime.ts` | 在 Shujuku 存储与浏览器存储之间选择可用实现 |
| `src/compatibility-runtime.ts` | 仅向宿主和旧调用者暴露必要兼容函数 |
| `src/features/image-library/` | 图片请求、Schema 校验、缓存、状态和选择器 |
| `src/features/portraits/` | 立绘主题规则、偏好与旧数据迁移 |
| `src/features/portraits/local-images.ts` | IndexedDB 本地立绘写入、引用解析和无用图片清理 |
| `scripts/build-post.js` | 把单文件 HTML 写入 MVU/Shujuku 正则 JSON |
| `scripts/build-floating-mvu.js` | 生成悬浮窗宿主脚本、子 iframe 桥和宠物资源 |
| `scripts/validate-build.js` | 模拟正则替换并验证内联脚本和 Shujuku 契约 |
| `scripts/validate-floating-mvu.js` | 验证悬浮 JSON、桥接白名单、布局与 teardown 标记 |

## 开发约定

准备向仓库提交代码的协作者，请先阅读 [协作开发与提交规范](./docs/CONTRIBUTING.md)。其中包含分支范围、宿主 API、MVU 写回、Shujuku、IndexedDB、本地验证和 Pull Request 要求。

1. 修改 `src/` 中的源文件，不直接编辑 `dist/`。
2. 新业务代码通过 `src/bridge/` 访问宿主，不随意新增 `window.*` 依赖。
3. 变量写入必须确定拥有者 scope，保留完整 MVU 顶层结构。
4. 三种产物的桥接、存储和生命周期不能相互合并。
5. 修改正则包装、内联脚本、`srcdoc` 或悬浮桥后必须运行 `pnpm build:all`。
6. 修改图片规则后同时运行 `pnpm validate:images`。
7. 本地预览、构建校验和真实酒馆验收应分别记录，不能互相替代。

从旧 MVU JSON 提取源码的命令仍保留：

```bash
pnpm extract
```

强制提取会覆盖 `src/` 中的文件，仅在明确确认可覆盖时使用：

```bash
pnpm extract -- --force
```

## 发布与验收清单

### 源码检查

- 确认没有把 mock、临时 HTML 或本地调试地址写入生产入口。
- 确认新增宿主调用经过 bridge，并对缺失能力给出可理解的错误。
- 确认所有 `eventOn`、DOM 监听、定时器、`ResizeObserver` 和外部挂载点都有 teardown。
- 确认远程图片和链接经过对应 URL 校验，公告只使用受控白名单 HTML。
- 确认桌面端和移动端布局分别检查，长列表及弹窗内容能够纵向滚动。

### 构建检查

1. 运行 `pnpm typecheck`。
2. 图片或主题规则有变化时运行 `pnpm validate:images`。
3. 运行 `pnpm build:all`，不能只构建当前正在预览的一个版本。
4. 确认 `dist/regex-mvu.json`、`dist/regex-shujuku.json` 和 `dist/daoyuan-floating-mvu.json` 都是本次生成时间。
5. 确认三个 JSON 均可解析，验证脚本没有替换安全、脚本编译或桥接缺失错误。

### 真实酒馆检查

- MVU 版：在包含多条历史状态栏的聊天中确认每个 iframe 读取自身楼层，修改不会写到最新楼层。
- Shujuku 版：分别验证读取、字段更新、插入、删除、玉简历史和动向表刷新。
- 悬浮版：验证首次打开、关闭、拖动、缩放、刷新、切换聊天、移动端边界和脚本停用后的清理。
- 三个版本均检查公告、远程图库、缺失立绘、自定义图片、世界书、生成停止及主题内弹窗。
- 检查网络失败、缺少可选 API 和空数据时，基础状态栏仍能显示且不会出现浏览器原生弹窗。

只有真实 SillyTavern/Tavern Helper 环境完成上述检查后，才能把构建结果称为宿主验收通过。

## 常见问题

### 页面能打开，但没有真实变量

`pnpm dev` 使用的是 mock 数据。真实数据只能在安装了对应脚本与接口的 SillyTavern 环境中读取。

### Shujuku 版启动失败

确认 `AutoCardUpdaterAPI` 已加载，并使用 `regex-shujuku.json`，不要误用普通 MVU 版。

### 悬浮版导入后没有出现

酒馆助手通常会禁用新导入的角色脚本。请先手动启用脚本，再检查 MVU 和酒馆助手 API 是否可用。

### 公告、立绘或点赞不可用

检查网络、内容安全策略和远程服务状态。远程资源失败不应阻止状态栏的基础数据与导航显示。

### 构建后修改没有生效

重新运行对应构建命令并重新导入生成的 JSON；不要只修改或导入 `dist/index.html`。

## 外部组件说明

`data/applause-character-registry.json` 与 `daoyuan-applause` 由道渊 Wiki 提供，本项目负责状态栏接入。详细接口与事件见 [docs/daoyuan-applause.md](./docs/daoyuan-applause.md)。

## 许可证

本项目使用 [MIT License](./LICENSE)。
