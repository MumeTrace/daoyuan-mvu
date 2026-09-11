import type { MapLore } from "./lore-xuantian";

export const xianjieLore: MapLore = {
        "center": {
            name: "钧天仙域",
            realm: "仙界之心",
            type: "human",
            desc: "此地仙气浓郁到凝为七彩祥云，宫阙浮空，金道横空，龙凤仙鹤往来其间。天地法则最为稳固清晰，甚至可显化为肉眼可见的符文锁链。核心基调：秩序、威严、天道至上。",
            factions: [
                {name: "天庭", type: "human", note: "明面上最高权力机构，执掌天规，统御万仙。重要地标：凌霄仙阙、天规神碑。"},
                {name: "云上瑶池", type: "neutral", note: "真正的顶层决策与至高战力所在之地。"}
            ],
            color: "--accent-gold",
            x: 50, y: 50
        },
        "north": {
            name: "玄冥仙域",
            realm: "幽冥轮回",
            type: "blood",
            desc: "无日月星辰，唯见幽蓝磷光与弱水河光。白骨山脉连绵，魂力、阴煞、死气弥漫。核心基调：死亡、轮回、无序。",
            factions: [
                {name: "阴煞宗", type: "demon", note: "明面上势力最强，驻地为灵冥渊。"},
                {name: "散仙秘境", type: "neutral", note: "大量散仙强者隐居的独立空间。"},
                {name: "地府入口", type: "neutral", note: "传说中掌管仙神魂灵轮回的神秘之地。"}
            ],
            color: "--accent-mana",
            x: 50, y: 15
        },
        "south": {
            name: "炎极仙域",
            realm: "不灭火海",
            type: "demon",
            desc: "天空悬有三轮烈日，大地之上仙火熔岩长流不息。空气中满是狂暴火元与硫磺气息。核心基调：混乱、力量、弱肉强食。",
            factions: [
                {name: "太古王族", type: "demon", note: "盘踞的核心浮空神都「太古神都」。"},
                {name: "极乐宗", type: "demon", note: "在火海幻境中开宗立派的顶级宗门，内有极乐玉溪。"}
            ],
            color: "--accent-blood",
            x: 50, y: 85
        },
        "east": {
            name: "青华仙域",
            realm: "万木之乡",
            type: "monster",
            desc: "域内尽是原始仙林与参天古木，更有建木、扶桑等开天神木，空气中充斥乙木灵气与生命气息。核心基调：原始、共存、血脉至上。",
            factions: [
                {name: "玉灵宫", type: "neutral", note: "顶级仙门之一，山门所在为玉灵仙山。"},
                {name: "万妖古界", type: "monster", note: "妖族的核心势力范围。"},
                {name: "先天仙灵域", type: "neutral", note: "先天仙灵的聚居地，传说中种植着无数仙药的万药仙圃亦在此。"}
            ],
            color: "--accent-san",
            x: 85, y: 50
        },
        "west": {
            name: "太白仙域",
            realm: "万剑之墟",
            type: "human",
            desc: "天地间充斥锋锐庚金之气。大地如铸，山峰如利剑倒插天穹。肃杀锐利，铁血不屈。核心基调：战斗、守护、以剑为尊。",
            factions: [
                {name: "剑修联盟", type: "human", note: "以剑为尊的主流联盟，强者当道。"},
                {name: "真灵世家", type: "monster", note: "真灵血脉世家，权势极重，祖地在真灵古穴。"},
                {name: "天庭前线", type: "human", note: "界碑古关由天庭重兵镇守，抵御时空乱流海。还有陨仙古战场，杀机与机缘并存。"}
            ],
            color: "#eccc68",
            x: 15, y: 50
        }
    };
