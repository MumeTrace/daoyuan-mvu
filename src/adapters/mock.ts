import type { MvuData } from "../types/stat-data";
import type { GenerateOptions, TavernEventHandler, VariableOption } from "../types/tavern";

// Typed SillyTavern/Tavern Helper/MVU host used only by the Vite development server.
window.waitGlobalInitialized = async function (name: string): Promise<void> {
  console.log(`[Mock] waitGlobalInitialized called for ${name}`);
  return Promise.resolve();
};

const events: Record<string, TavernEventHandler[]> = {};
window.eventOn = function (name: string, callback: TavernEventHandler) {
  if (!events[name]) events[name] = [];
  events[name].push(callback);
  return {
    stop() {
      events[name] = (events[name] || []).filter((item) => item !== callback);
    },
  };
};
window.eventOff = function (name: string, callback: TavernEventHandler): void {
  events[name] = (events[name] || []).filter((item) => item !== callback);
};
async function emitMockEvent(name: string, ...args: unknown[]): Promise<void> {
  if (events[name]) {
    await Promise.all(events[name].map((callback) => callback(...args)));
  }
}
window.eventEmit = emitMockEvent;

window.iframe_events = {
  GENERATION_STARTED: "js_generation_started",
  STREAM_TOKEN_RECEIVED_FULLY: "js_stream_token_received_fully",
  STREAM_TOKEN_RECEIVED_INCREMENTALLY: "js_stream_token_received_incrementally",
  GENERATION_ENDED: "js_generation_ended",
};
const mockGenerations = new Map<string, { stopped: boolean }>();

Reflect.set(window, "errorCatched", function (fn: (...args: unknown[]) => unknown) {
  return function (...args: unknown[]): unknown {
    try {
      return fn(...args);
    } catch (e) {
      console.error("[Mock] errorCatched:", e);
    }
  };
});

// 构造的假 MVU 数据，可在此处根据需要自由修改以测试不同UI状态
const mockMvuData: MvuData = {
  initialized_lorebooks: [],
  stat_data: {
    "主角": {
      "姓名": "林风",
      "性别": "男",
      "容貌": "俊朗",
      "身形": "修长",
      "衣着": "青衫",
      "生命": 100,
      "生命上限": 100,
      "精血": 100,
      "精血上限": 100,
      "灵力": 450,
      "灵力上限": 500,
      "修为": 990,
      "修为上限": 1000,
      "神识": 200,
      "神识上限": 200,
      "道心": 100,
      "道心上限": 100,
      "气运": {
        "天命之子": { "类型": "被动", "效果": "气运昌隆" }
      },
      "储物袋": {
        "灵石": { "描述": "修仙界通用货币", "数量": 100 }
      },
      "器物": {
        "青锋剑": { "等级": "玄阶", "类型": "剑", "描述": "青锋三尺" }
      },
      "功法": {
        "青木诀": { "类型": "心法", "描述": "青木宗入门心法" },
        "御剑术": { "类型": "法术", "描述": "基础御剑法术" }
      },
      "灵根": "天灵根",
      "宗门": "青云宗",
      "神念": "正常"
    },
    "道侣": {
      "柳如烟": { "亲密": 100, "境界": "金丹期", "种族": "人族", "desc": "青梅竹马" }
    },
    "绝色榜": {
      "瑶汐": {
        "排名": 1,
        "头衔": "九天之主",
        "仙姿": "容颜绝世，不可方物，自带九天玄气",
        "群芳谱": "万界美人榜榜首，传闻其一眸可令星辰黯淡",
        "性别": "女",
        "好感度": 100
      },
      "林雪": {
        "排名": 2,
        "头衔": "月宫之主",
        "仙姿": "清冷如霜，孤高清绝",
        "群芳谱": "世间难得的冰山美人，只可远观",
        "性别": "女"
      }
    },
    "人物": {
      "李长老": { "境界": "元婴期", "门派": "青云宗", "desc": "严厉的长老" }
    },
    "灵宠": {
      "小黑": { "种族": "墨麒麟", "境界": "筑基期", "desc": "幼年期神兽" }
    },
    "机遇": {
      "古洞府": { "状态": "未探索", "地点": "青云山", "描述": "隐约有灵光" }
    },
    "世界": {
      "当前时间": "午时",
      "当前地点": "青云宗",
      "遭遇冷却": 8,
      "动向": {
        "宗门大比": { "阶段": "承", "状态": "承", "地点": "演武场", "描述": "弟子云集" }
      }
    },
    "玉简": {
      "柳如烟": { "性别": "女", "关系": "道侣", "历史记录": {} }
    }
  }
};

window.getAllVariables = function (): MvuData {
  return mockMvuData;
};

window.getVariables = function (_option: VariableOption): MvuData {
  return structuredClone(mockMvuData);
};

window.getCurrentMessageId = function (): number {
  return 42;
};

window.getLastMessageId = function (): number {
  return 42;
};

window.getChatMessages = function () {
  return [{ message_id: 42, name: "system", mes: "这是一条测试玉简消息" }];
};

window.generate = async function (options: GenerateOptions): Promise<string> {
  console.log("[Mock] generate", options);
  const id = options?.generation_id || `mock-${Date.now()}`;
  const state = { stopped: false };
  mockGenerations.set(id, state);
  const reply = "这是一条模拟生成回复";
  let full = "";
  try {
    await emitMockEvent(window.iframe_events?.GENERATION_STARTED ?? "js_generation_started", id);
    for (const token of ["这是一条", "模拟", "生成回复"]) {
      await new Promise<void>((resolve) => setTimeout(resolve, 180));
      if (state.stopped) throw new DOMException("Mock generation stopped", "AbortError");
      full += token;
      if (options?.should_stream) {
        await emitMockEvent(window.iframe_events?.STREAM_TOKEN_RECEIVED_INCREMENTALLY ?? "js_stream_token_received_incrementally", token, id);
        await emitMockEvent(window.iframe_events?.STREAM_TOKEN_RECEIVED_FULLY ?? "js_stream_token_received_fully", full, id);
      }
    }
    await emitMockEvent(window.iframe_events?.GENERATION_ENDED ?? "js_generation_ended", reply, id);
    return reply;
  } finally {
    mockGenerations.delete(id);
  }
};

window.stopGenerationById = function (generationId: string): boolean {
  const state = mockGenerations.get(generationId);
  if (!state) return false;
  state.stopped = true;
  return true;
};

window.getPersonaAvatarPath = function (): null {
  return null;
};

window.getOrCreateChatLorebook = async function (): Promise<string> {
  return "模拟聊天世界书";
};

window.getCurrentCharPrimaryLorebook = async function (): Promise<string> {
  return "模拟角色世界书";
};

window.getCharLorebooks = function (options = {}) {
  if (options.type === "primary") return ["模拟角色世界书"];
  if (options.type === "additional") return ["模拟附加世界书"];
  return ["模拟角色世界书", "模拟附加世界书"];
};

window.getCharWorldbookNames = function () {
  return { primary: "模拟角色世界书", additional: ["模拟工坊扩展世界书"] };
};

window.getWorldbook = async function (name: string) {
  if (name === "模拟角色世界书") {
    return [
      {
        uid: 1,
        name: "柳如烟",
        enabled: true,
        strategy: { keys: ["柳如烟"] },
        content: "姓名：柳如烟\n身份：青梅竹马\n性格：温柔坚定",
      },
    ];
  }
  if (name === "模拟工坊扩展世界书") {
    return [
      {
        uid: 2,
        name: "姬紫月",
        enabled: true,
        strategy: { keys: ["姬紫月", "永宁公主"] },
        content: "姓名：姬紫月\n身份：永宁公主\n能力：紫色帝气",
      },
      {
        uid: 3,
        name: "不属于工坊的附加条目",
        enabled: true,
        strategy: { keys: ["无关人物"] },
        content: "这条内容不应进入受限人物检索范围。",
      },
    ];
  }
  return [];
};

window.DaoyuanWorkshopAPI = {
  async getEntry() {
    return {
      schemaVersion: 1,
      data: {
        revision: 1,
        workshopOrigin: "https://workshop.example.invalid",
        entries: [
          {
            packageId: "mock-character-pack",
            packageDisplayName: "模拟人物扩展",
            version: "1.0.0",
            entryId: "ji-zi-yue",
            kind: "character",
            displayName: "姬紫月",
            primaryKeys: ["姬紫月", "永宁公主"],
          },
        ],
      },
    };
  },
};

window.getLorebookEntries = async function () {
  return [
    {
      uid: 1,
      comment: "模拟词条",
      key: ["模拟"],
      content: "用于本地验证桥接层的模拟世界书内容。",
    },
  ];
};

// 模拟 MVU 核心对象
window.Mvu = {
  events: {
    VARIABLE_UPDATE_ENDED: 'VARIABLE_UPDATE_ENDED'
  },
  getMvuData: function (options: VariableOption): MvuData {
    console.log('[Mock] Mvu.getMvuData', options);
    return structuredClone(mockMvuData); // 深度克隆，避免直接修改引用
  },
  replaceMvuData: async function (fullData: MvuData, options: VariableOption): Promise<void> {
    console.log('[Mock] Mvu.replaceMvuData', fullData, options);
    const previous = structuredClone(mockMvuData);
    Object.assign(mockMvuData, fullData);
    await emitMockEvent("VARIABLE_UPDATE_ENDED", mockMvuData, previous);
  }
};
