export interface MapFaction {
  name: string;
  type: "human" | "demon" | "monster" | "neutral" | string;
  note?: string;
}

export interface MapLocation {
  name: string;
  realm: string;
  type: string;
  desc: string;
  factions: MapFaction[];
  color: string;
  x: number;
  y: number;
}

export type MapLore = Record<string, MapLocation>;

export const xuantianLore: MapLore = {
        "center": {
            name: "中央神州",
            realm: "人族疆域",
            type: "human",
            desc: "人族文明的核心，边长三千亿里正方形。宫阙浮空，金道横空，秩序森严。这里是舞台的中心，宗门林立，王朝更迭。",
            factions: [
                {name: "大周仙朝", type: "human", note: "神都洛阳。皇族姬氏底蕴深厚，十万元婴神策军，掌控四成灵石矿。"},
                {name: "南梁古国", type: "human", note: "中州东南部凡人王朝，受合欢宗与湮丹宗共控，种植紫灵米，表面繁华奢靡，暗藏斩仙盟反抗势力。"},
                {name: "蜀山剑门", type: "human", note: "西部蜀山群峰。天下剑修朝圣地，万剑归宗大阵。"},
                {name: "昆仑道门", type: "human", note: "极西昆仑神山。历史悠久的道门正宗，讲究清静无为。"},
                {name: "桃花宗", type: "human", note: "中央神州情道宗门，以情入道，结三生之缘，与合欢宗为绝对死敌。"},
                {name: "万法宗", type: "human", note: "东南方半空万法天仪。海纳百川，解析万法本源。"},
                {name: "合欢宗", type: "neutral", note: "明线百花谷，暗线极极宫。采补炉鼎的邪派。"},
                {name: "天机阁", type: "neutral", note: "总阁蜃楼飞阁游移不定。贩卖情报，推演因果。"},
                {name: "星道宗", type: "neutral", note: "极北三十亿里高空摘星悬岛。融合星道智道，推演天机。"},
                {name: "湮丹宗", type: "neutral", note: "南部杏临谷。以天地灵物入药，丹道通神。"},
                {name: "灵墟宗", type: "neutral", note: "东部无尽山脉边缘灵兽原。借妖兽气血反哺己身。"},
                {name: "青玉宗", type: "neutral", note: "西南部青音湖湖心岛。以音入道，只收女弟子。"},
                {name: "符韵门", type: "neutral", note: "北部云符山。虚空成符，斗法狂掷符箓。"},
                {name: "阵天宗", type: "neutral", note: "中部千阵岭迷雾石林。借天地大势，困杀万物。"}
            ],
            color: "--accent-gold",
            x: 50, y: 50
        },
        "north": {
            name: "北冥雪原",
            realm: "北冥禁地",
            type: "demon",
            desc: "终年被冰雪覆盖的北方冻土，东西跨度三千五百亿里。无日月星辰，唯见幽蓝磷光。阴冷死寂。",
            factions: [
                {name: "广寒宫", type: "neutral", note: "深处广寒玉宫。修太阴之道，断绝凡尘情爱，只收女弟子。"},
                {name: "蛟龙一族", type: "monster", note: "北冥之下黑渊。吞噬掠夺，提纯真龙血脉。"}
            ],
            color: "--accent-mana",
            x: 50, y: 15
        },
        "south": {
            name: "南离火洲",
            realm: "混乱魔域",
            type: "demon",
            desc: "火山密布，东西跨度四千亿里。空气中满是硫磺气息，混乱与杀伐并存，弱肉强食。",
            factions: [
                {name: "太阳神宫", type: "human", note: "万丈火山之巅太阳火殿。崇拜太阳之力，体修至尊。"},
                {name: "尸魔宗", type: "demon", note: "与中央神州交界处葬仙坡。炼化尸身，腐朽中求永生。"},
                {name: "黑金阁", type: "demon", note: "无固定驻地地下黑市，统辖暗杀走私与情报渗透，重弱肉强食执掌地下混乱。"},
                {name: "万魂殿", type: "demon", note: "阴风山脉万鬼窟。抽魂炼魄，炼化怨鬼壮大神识。"}
            ],
            color: "--accent-blood",
            x: 50, y: 85
        },
        "east": {
            name: "东极青木域",
            realm: "万妖森林",
            type: "monster",
            desc: "古木参天，南北跨度四千五百亿里的妖族世居之地。多方势力维持着微妙的平衡。",
            factions: [
                {name: "神猿族", type: "monster", note: "西部万妖山脉。力量至上，以力破法。"},
                {name: "九尾天狐族", type: "monster", note: "东部沂云森林。修习幻术法则，操纵神魂欲念。"},
                {name: "五色孔雀族", type: "monster", note: "南部落凤坡五色谷。提纯五行血脉，衍化五色神光。"},
                {name: "柳蛇族", type: "monster", note: "北部碧玉温泉。雌尊雄卑，交配繁衍。"}
            ],
            color: "--accent-san",
            x: 85, y: 50
        },
        "west": {
            name: "西漠佛国",
            realm: "佛修净土",
            type: "human",
            desc: "广袤的西部沙漠，南北跨度三千五百亿里。佛光普照，致力于普度众生与镇压妖魔。",
            factions: [
                {name: "大雷音寺", type: "human", note: "须弥山须弥金顶。度化众生，镇压邪魔，修罗汉金身。"}
            ],
            color: "#eccc68",
            x: 15, y: 50
        },
        "special_east": {
            name: "蓬莱仙岛",
            realm: "上古秘境",
            type: "neutral",
            desc: "【极东尽头归墟之眼深处】每六十年现世三十天的上古仙界碎片。核心物品：澪之果。",
            factions: [
                {name: "冥煞玄蛇", type: "monster", note: "守护者。"}
            ],
            color: "--rare-text",
            x: 92, y: 50
        },
        "s_youlin": {
            name: "幽林血沼",
            realm: "低阶秘境",
            type: "blood",
            desc: "【南离火洲十万大山古战场外围】炼气期修士试炼场与坟场。核心物品：蒲灵果、玉髓芝。",
            factions: [
                {name: "嗜血鬼藤", type: "monster", note: "守护者。"}
            ],
            color: "--accent-blood",
            x: 35, y: 75
        },
        "s_gengjin": {
            name: "庚金剑冢",
            realm: "低阶秘境",
            type: "human",
            desc: "【西漠佛国叹息沙海地下千丈】上古剑宗遗址，充满庚金剑气。进入限制：元婴以下。核心物品：金灵玉髓。",
            factions: [
                {name: "残缺剑傀", type: "monster", note: "守护者。"}
            ],
            color: "#eccc68",
            x: 25, y: 35
        },
        "s_liuli": {
            name: "琉璃净月宫",
            realm: "高阶秘境",
            type: "neutral",
            desc: "【北冥雪原北冥黑渊极境海眼】中古大能折叠行宫，极寒幻境。进入限制：化神以下。核心物品：九曲灵参、造化青莲莲子。",
            factions: [
                {name: "霜骨冰蛟", type: "monster", note: "守护者。"}
            ],
            color: "--accent-mana",
            x: 35, y: 15
        },
        "s_wuxing": {
            name: "五行碎层",
            realm: "高阶绝地",
            type: "neutral",
            desc: "【中央神州天陨坑上空万丈虚空夹缝】不稳定空间裂缝，存在法则碾压。进入限制：炼虚以下。核心物品：五行灵髓、虚空花。",
            factions: [
                {name: "亚种虚空兽", type: "monster", note: "守护者。"}
            ],
            color: "--rare-text",
            x: 65, y: 35
        },
        "s_shahai": {
            name: "无垠沙海镜像",
            realm: "大能禁区",
            type: "neutral",
            desc: "【依附西漠佛国叹息沙海背面】高维镜像空间，方向与因果皆反。进入限制：合体以下。核心物品：空灵晶液。",
            factions: [
                {name: "蜃灵皇残魂", type: "monster", note: "守护者。"}
            ],
            color: "--rare-text",
            x: 10, y: 70
        },
        "s_yunsheng": {
            name: "陨圣乱墟",
            realm: "大能禁区",
            type: "demon",
            desc: "【东极青木域极东九天罡风层深处】远古大能战场残块。进入限制：大乘以下。核心物品：三元归一果。",
            factions: [
                {name: "怨念尸魔", type: "demon", note: "守护者。"}
            ],
            color: "--accent-blood",
            x: 85, y: 15
        },
        "s_huangquan": {
            name: "黄泉冥河引",
            realm: "大能禁区",
            type: "demon",
            desc: "【南离火洲阴冥河死脉尽头】阴阳交汇处，生人禁区。核心物品：九转还魂草根须。",
            factions: [
                {name: "渡魂诡灵", type: "demon", note: "守护者。"}
            ],
            color: "--accent-blood",
            x: 65, y: 90
        },
        "s_tianyuan": {
            name: "天渊起源地",
            realm: "世界本源",
            type: "neutral",
            desc: "【玄天界界壁护罩最深层夹缝】天道直辖，大乘期伐天之地。核心物品：玄黄之气。",
            factions: [
                {name: "天道灾兽化身", type: "neutral", note: "守护者。"}
            ],
            color: "--accent-gold",
            x: 50, y: 5
        }
    };
