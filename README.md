# 道渊 MVU 状态栏

面向 SillyTavern、酒馆助手（Tavern Helper）与 MVU 的 Vue 3 状态栏。一套 TypeScript/Vue/Pinia 源码分别构建为消息楼层 MVU 版、Shujuku 数据库版和酒馆助手悬浮版三个 JSON 产物。

## 功能概览

- 展示主角属性、气运、宗门、异常状态、储物袋与世界信息。
- 提供概览、功法、道侣、人物、灵宠、机遇、绝色榜、动向、玉简和舆图页签。
- 支持远程与工坊立绘、本地自定义图片、多图切换、宗门舆图及图片放大。
- 支持绝色榜帖子、回复生成、自定义 API 和人物世界书查询。
- 支持玉简联系人、历史、预设、世界书注入、流式生成、停止与重试。
- 使用状态栏主题内弹窗处理提醒、确认、输入和错误，不使用浏览器原生弹窗。
- 页签按首次访问挂载，图片库、工坊和公告在首屏后加载，减少消息楼层初始 DOM 和阻塞任务。

本仓库只维护酒馆内运行的状态栏前端，不定义角色卡的 MVU 变量规则、世界书内容或 Shujuku 插件行为。

## 三种产物

| 文件 | 构建命令 | 用途 | 主要依赖 |
| --- | --- | --- | --- |
| `dist/regex-mvu.json` | `pnpm build:mvu` | 消息楼层 MVU 状态栏 | Tavern Helper、MVU |
| `dist/regex-shujuku.json` | `pnpm build:shujuku` | Shujuku 数据库状态栏 | Tavern Helper、`AutoCardUpdaterAPI` |
| `dist/daoyuan-floating-mvu.json` | `pnpm build:floating-mvu` | 可拖动、缩放的悬浮状态栏 | Tavern Helper、MVU |

三个版本共享界面，但数据入口、存储、生命周期和清理方式不同，不能相互替代。构建时会临时生成 `dist/index.html` 供后处理和校验使用，校验成功后自动删除；`dist/` 最终只保留上面的三个 JSON。

### 导入

- MVU 版：将 `regex-mvu.json` 导入当前角色或聊天使用的正则配置，确认 Tavern Helper 与 MVU 已启用。
- Shujuku 版：将 `regex-shujuku.json` 导入对应正则配置，确认数据库插件已提供 `AutoCardUpdaterAPI`。
- 悬浮版：将 `daoyuan-floating-mvu.json` 导入酒馆助手角色脚本库，并手动启用新脚本。

消息楼层版优先读取承载当前 iframe 的消息楼层；悬浮版通过受控父子窗口桥跟随最新可用 MVU 楼层。悬浮窗会分别保存桌面、手机竖屏和手机横屏布局。

## 安装与本地预览

要求 Node.js 18+、pnpm 8+。

```bash
pnpm install
```

| 命令 | 地址/用途 |
| --- | --- |
| `pnpm dev` | `http://127.0.0.1:5173/`，独立 mock 状态栏 |
| `pnpm dev:iframe` | iframe 尺寸、滚动与响应式预览 |
| `pnpm dev:tavern` | `http://127.0.0.1:5174/tavern/`，本地聊天页模拟 |
| `pnpm kill 5173` | 释放指定开发端口；端口号可替换 |

开发环境使用 `src/adapters/mock.ts` 模拟宿主能力。它不会进入生产产物，本地页面正常也不代表真实 SillyTavern 已验收。

## 构建与检查

构建全部产物：

```bash
pnpm build:all
```

常用检查：

```bash
pnpm typecheck
pnpm validate:adapters
pnpm validate:images
pnpm validate:map
pnpm build:all
```

- `typecheck`检查 Vue、浏览器源码和 Node 构建配置的 TypeScript 类型。
- `validate:adapters`检查 Shujuku、悬浮桥、世界书接口降级和人物检索范围契约。
- `validate:images`检查图片 Schema、主题规则、缓存和偏好迁移。
- `validate:map`检查玄天界地域、势力、秘境和守护者入口的完整性，以及新增数据的坐标兜底。
- `build:all`生成并验证三个 JSON，包括正则多轮替换安全、内联脚本语法、桥接白名单和 teardown 标记；每个目标校验成功后会自动清理 `dist/` 中的中间文件与非交付文件。

不要直接编辑 `dist/`。MVU 与 Shujuku 的 HTML 会写入正则 `replaceString`，其中的 `$1`、`$2`等字符可能被酒馆再次解释；悬浮版还会把页面、宿主桥和宠物资源序列化进脚本 JSON。这些步骤必须由构建脚本完成。

## 数据路径

### 两界 2D 舆图

玄天界采用五域连片的 SVG 分区地图；九天仙界依据世界书的五方天域独立设计，不复用玄天界轮廓：钧天居中交汇，青华在东以不周山脉为界，太白在西守御时空乱流海，玄冥在北体现永夜、弱水与白骨山脉，炎极在南体现三轮烈日与熔岩。祥云宫阙、仙林、剑峰等为轻量矢量地貌示意，不是新增可点击地点；边界形状、地标坐标和比例不代表世界书提供的精确地理。点击地域空白处查看介绍、地域图片及势力；点击宗门或势力标记直接打开详情。秘境标记保留原有说明与守护者入口。两界地域详情均使用弹窗，地域及宗门图片仍可点击放大，关闭子窗口会返回上一级。

- 支持鼠标拖动、滚轮缩放、手机双指缩放和复位。“全屏浏览”占满可访问的宿主浏览器窗口，不局限于状态栏或悬浮 iframe；竖屏默认聚焦中央区域，复位查看全图时窗口仍保持全屏。
- `src/bridge/overlay-host.ts` 统一管理地图和图片的跨窗口展示：通过 Vue Teleport 与 Shadow DOM 隔离样式，关闭后还原，不移动、重载或放大原 iframe。跨域宿主不可访问时退回最高可访问窗口，并在地图提示限制；不绕过浏览器安全策略。
- “地图索引”可搜索地图中的势力和秘境；隐藏秘境只影响显示，不删除数据。
- 地域与势力资料位于 `src/data/lore-xuantian.ts`、`lore-xianjie.ts`；两套版图与标记坐标位于 `src/components/map/atlas/` 的 `xuantian-atlas.ts`、`xianjie-atlas.ts`。`RealmAtlas.vue` 复用交互和绘制，`useAtlasViewport.ts` 独立处理拖动缩放，`atlas.css` 管理两界统一的视觉样式与移动布局；`AtlasRelief.vue` 和 `XianjieTerrain.vue` 只绘制不可交互的环境示意，不读取宿主数据。新增名称没有专用坐标时仍保留默认标记及索引入口，正式发布前应调整坐标以避免重叠。
- 地域图片优先读取当前图片库的同名舆图，缺失时使用原有地域图片；宗门沿用原图片库路径。地图底图使用 SVG，不依赖新的远程美术贴图，也不改写 MVU 或世界书。
- 秘境守护者按姓名复用人物立绘存储库，与地域、宗门的 `map` 图片分开。立绘完整显示、不裁切，点击复用现有全屏图片查看器，可拖动、缩放；点击姓名复用现有人物详情查询与剧透确认，关闭后返回守护者。保留符合主题的多图切换按钮，不附带抽屉、上传或点赞；缺图显示提示，少于两张时禁用切换。自定义图片优先级、当前主题和切图索引与人物页共享，图库更新后原位刷新。
- 中央神州标记依据世界书的相对方位排布：昆仑在蜀山以西、两者在洛阳以西；星道在符韵以北；青玉西南、南梁东南、桃花在万法以南、灵墟靠东。资料中的距离并不完全一致，因此不标注精确比例尺；天机阁注明游移、非固定驻地，标记仅作为资料入口。
- 两界标题、外框、按钮和地图详情采用仙界紫色 `--rare-text`，标题无渐变蒙版；内部保留各自的地理分区色。
- 首次默认展开玄天界、折叠仙界。两个标题右侧可独立切换，偏好经共享存储桥分别写入 `daoyuan_atlas_open_xuantian` / `daoyuan_atlas_open_xianjie`，不放进消息变量。换楼层、重建状态栏或刷新后恢复用户选择；当前位置变化不会自动打开或折叠地图。浏览器禁止持久存储时只能保留当前会话，写入失败会提示。
- 只读订阅 `stat_data.世界.当前地点`，格式清理和定位匹配位于 `atlas/location-match.ts`。容忍空格、全半角标点和常见分隔符，排除括号内的场景文字，按地图名称和明确地标别名匹配；优先标注已知宗门、秘境等具体点位，仅识别到地域时标注地域范围。未知、跨域冲突或歧义地点不显示 GPS，不推测坐标、不写回变量。
- 守护者使用世界书姓名作为人物立绘键：紫澪、绯萝、霜甄、月珑、虚渊、蜃娆、幽姬、辛绫、玄曦；种族或称号保留在说明中，不再当作图库姓名。
- 独立 2D 图片全图、3D 舆图及其性能提醒不受两界交互地图改版影响。

定位需求参考了 [DaoYuan-Phone 的地图服务](https://github.com/linxin1925/DaoYuan-Phone/blob/main/app/src/services/mapService.ts) 中按世界地点匹配已有节点的思路；本项目自行实现适用于两界 SVG 点位、优先具体地点及冲突拒绝的解析，不引入该仓库的运行代码或依赖。

可选浏览器回归：启动开发服务后执行 `node scripts/validate-world-map-browser.mjs`，需要本机可用的 Playwright。可通过 `MAP_TEST_URL` 指定服务地址，`PLAYWRIGHT_MODULE` 指定已安装模块入口，`CHROME_PATH` 指定浏览器程序。测试覆盖所有地图入口、嵌套弹窗、拖拽与手机双指缩放；外部图片使用模拟响应，不代表真实酒馆或远程图片服务已验收。

跨窗口回归使用 `node scripts/validate-overlay-host-browser.mjs`，环境变量同上。将状态栏嵌入受裁切的小 iframe，在桌面和手机视口验证地图、图片占满外层窗口，原 iframe 不变，立绘完整显示、宿主拖拽、人物详情往返和关闭清理正常。该模拟宿主检查不能代替实际酒馆及真机验收。

主要界面读取以下 MVU 路径：

| 界面 | 数据路径 |
| --- | --- |
| 顶部状态 | `stat_data.主角`、`stat_data.世界` |
| 功法 | `stat_data.主角.功法` |
| 道侣、人物、灵宠 | `stat_data.道侣`、`stat_data.人物`、`stat_data.灵宠` |
| 机遇 | `stat_data.机遇` |
| 绝色榜 | `stat_data.绝色榜` |
| 动向 | `stat_data.世界.动向`、`stat_data.世界.遭遇冷却` |
| 玉简 | `stat_data.玉简`及各联系人的`历史记录` |

最小示例：

```yaml
initialized_lorebooks: []
stat_data:
  主角:
    姓名: 林风
    生命: 80
    生命上限: 100
    灵力: 450
    灵力上限: 500
    功法: {}
    储物袋: {}
  道侣: {}
  人物: {}
  灵宠: {}
  机遇: {}
  绝色榜: {}
  玉简: {}
  世界:
    当前时间: 午时
    当前地点: 玄天界
    遭遇冷却: 8
    动向: {}
```

数值条按“当前值/上限”计算，视觉比例和提示最多显示 100%，不会修改超过上限的原始变量。`世界.遭遇冷却`缺失时显示 `—`。

### MVU 与 Shujuku 写回

MVU 版读取并写回完整 `MvuData`，只修改目标路径，保留 `initialized_lorebooks`等未知顶层字段。`getAllVariables()`仅用作合并后的只读回退，不会把合并快照整体写回。

Shujuku 版通过 `src/shujuku-adapter.ts`把界面路径映射为表格、主键和字段操作，优先使用单元格或行级写入，不回退为不安全的整份 `stat_data`覆盖。无法确认消息楼层或数据库目标时，写入会被拒绝并显示错误。

Shujuku 的世界状态表支持`遭遇冷却`、`遭遇冷却轮数`和`冷却轮数`三个表头。新建数据库可直接使用仓库模板；已有数据库需要自行补充其中一个表头及对应整数列，状态栏不会擅自修改用户数据库结构。

## 图片、立绘与工坊

主图片库使用 `images.json`的 `data.entities`，立绘抽屉名称、图标、顺序和别名由 `portrait-drawers.json`决定。`special`主题仍要求角色好感或亲密大于 90。

已安装扩展通过可选的 `DaoyuanWorkshopAPI`接入：

- `getImages()`提供工坊图片快照，并与主图片库按实体、URL 和主题去重合并。
- `getEntry()`提供当前安装且启用的扩展条目范围；世界书正文仍通过 Tavern Helper 接口读取。
- 工坊未安装、尚未初始化、超时或返回无效数据时，状态栏继续使用主图片库和本卡世界书。

图片与偏好分开保存：

- 远程主图库缓存：`daoyuan_images_cache_v2`。
- 工坊图片快照：`daoyuan_workshop_images_cache_v1`。
- 抽屉配置缓存：`daoyuan_portrait_drawers_cache_v1`。
- 角色主题、索引和自定义引用：`daoyuan_portrait_preferences_v2`。
- 本地图片本体：IndexedDB `daoyuan_status_assets/portrait_images`。

偏好中只保存 `idb:daoyuan-portrait:`引用，避免大图片占满 localStorage。同步图库或工坊快照不会覆盖用户主题、切图索引和自定义图片；迁移失败时旧数据继续保留。

## 人物与世界书查询

绝色榜人物检索先查询主图片库、工坊 `getImages()` 快照和用户自定义立绘；命中后立即显示，工坊图片后台到达时会原位更新当前查询。只有图片与自定义立绘均未命中时，才使用世界书人物识别兜底。

人物详情和绝色榜兜底检索只在以下世界书范围读取：

1. 当前角色绑定的本卡主世界书；
2. 当前角色附加世界书中，与已安装工坊 `getEntry()`索引主键精确匹配的条目。

`getEntry()`只负责给出当前角色关联、已安装并启用的工坊条目及其主键，不直接提供世界书正文；状态栏通过 Tavern Helper 读取当前角色的附加世界书，再保留主键精确命中的正文。其他角色、其他普通世界书和未命中的附加条目不会进入搜索。

本卡与已获工坊索引授权的世界书条目使用同一套人物识别：

- MVU 已知人物与工坊 `kind=character`项目可直接确认。
- 只存在于世界书的人物可通过条目主体的`姓名、名字、角色名、人物姓名`识别。
- 支持普通字段、Markdown、括号字段、同一行字段和竖向表格形式。
- 独立人物小节需要人物标题和至少一个人物属性，才会作为嵌套人物档案。
- `宗门长老姓名`等复合标签或正文中顺带提到的人名不会直接进入人物搜索。
- 从已有人物卡点击详情时保留精确条目别名兜底，以兼容没有结构的纯文本设定。

该逻辑不使用 AI 猜测语义，也不会修改世界书原文。无法从字段、条目别名或已知人物索引确认主体的纯散文，可能不会进入人物检索。

## 玉简与绝色榜生成

玉简未配置自定义 API 时调用 Tavern Helper `generate()`；配置基础 URL、模型和密钥后调用 OpenAI 兼容的 `/chat/completions`。两条路径都支持流式显示、停止、错误反馈和重试，自定义 API 还可从 `/models`读取模型列表。

玉简与绝色榜分别保存生成设置和预设，互不覆盖。API Key 只保存在当前可用的浏览器/宿主存储中，不应写入源码、日志、Issue 或 PR。

## 加载与生命周期

1. 先挂载顶栏、状态区、导航和默认概览。
2. 复杂页签首次访问时挂载，之后保留折叠、输入和滚动状态。
3. 图片库、工坊和公告在首次绘制后加载；用户主动进入相关功能时立即加载。
4. 外部点赞组件异步加载，失败时不阻塞状态栏主体。
5. 页面卸载时停止事件句柄、观察器、定时器、Vue 应用和外部挂载节点。

延迟挂载主要减少初始 DOM、组件副作用和布局计算；由于最终是单文件产物，它不会明显缩小 JSON 或 JavaScript 体积。

## 源码结构

```text
data/                         项目数据
docs/                         外部组件和协作说明
legacy/shujuku/               不参与构建的历史对照资料
origin/                       MVU 与 Shujuku 正则模板
scripts/                      构建、后处理与产物校验
src/
  adapters/                   开发环境宿主 mock
  assets/floating-pet/        悬浮按钮宠物资源
  bridge/                     Tavern Helper、MVU、Shujuku、事件与存储边界
  components/                 Vue 页面、卡片、弹窗和共享组件
  composables/                写入、生成、搜索和交互流程
  features/                   图片库、立绘和人物世界书领域模块
  stores/                     Pinia 状态层
  styles/                     主题、布局和响应式样式
  types/                      宿主与业务类型
  compatibility-runtime.ts    必要的宿主兼容导出
  core-ui.ts                  Vue 挂载与卸载
  main.ts                     应用入口与延迟加载调度
  shujuku-adapter.ts          Shujuku 提前注入适配器
tavern/                       本地聊天页模拟环境
```

生产浏览器源码已迁移为 TypeScript。仓库中的 JavaScript 只用于 Node.js 构建/校验和本地聊天页模拟，不会作为旧业务模块进入三个 JSON。

`legacy/shujuku/`仅保存旧版正则、TavernDB 示例和提取的 HTML，当前源码和构建脚本不引用这些文件。

## 开发与提交

协作者请阅读 [协作开发与提交规范](./docs/CONTRIBUTING.md)。其中集中说明模块边界、宿主 API、MVU/Shujuku 写回、图片与存储、UI、性能、验证、Git 和 Pull Request 要求，README 不再重复这些细则。

修改原则：

- 改源文件，不手工修改生成产物。
- Vue 组件不直接散落读取 `window.*`；宿主能力通过 `src/bridge/`进入。
- 共享 UI、桥接、存储或生命周期变化后运行 `pnpm build:all`。
- 本地预览、自动构建和真实酒馆验收分别记录，不能互相替代。

## 发布前检查

- `pnpm typecheck`、相关专项验证和 `pnpm build:all`全部通过。
- 三个 JSON 均为本次源码生成，能够被对应酒馆环境导入。
- 分别检查 MVU 当前楼层、Shujuku 表格写入和悬浮窗桥接/清理。
- 检查桌面与移动端滚动、弹窗、立绘、世界书、生成停止及网络失败降级。
- PR 明确列出自动检查、真实酒馆已验证内容、未验证内容和回退方式。

构建成功只证明打包与模拟校验通过。只有三个产物在真实 SillyTavern/Tavern Helper 环境完成对应检查后，才能称为宿主验收通过。

## 常见问题

### 本地页面没有真实变量

`pnpm dev`使用 mock 数据。真实变量只能在安装了对应脚本与接口的 SillyTavern 环境中读取。

### 悬浮版导入后没有出现

酒馆助手通常默认禁用新导入的角色脚本。请先手动启用，再检查 MVU 与 Tavern Helper 能力。

### 公告、立绘、工坊或点赞不可用

检查网络、内容安全策略和对应可选 API。远程服务失败不应阻止基础状态栏显示。

### 构建后修改没有生效

重新构建并重新导入对应 JSON。`dist/index.html` 只是构建期间的临时文件，成功构建后不会保留。

## 相关文档

- [协作开发与提交规范](./docs/CONTRIBUTING.md)
- [daoyuan-applause 接入说明](./docs/daoyuan-applause.md)

## 许可证

本项目使用 [MIT License](./LICENSE)。
