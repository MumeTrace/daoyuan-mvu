export interface DataRecord {
  [key: string]: unknown;
}

export type NamedRecord<T extends DataRecord = DataRecord> = Record<string, T>;

export interface CharacterData extends DataRecord {
  姓名?: string;
  性别?: string;
  种族?: string;
  境界?: string;
  门派?: string;
  宗门?: string;
  关系?: string;
  好感度?: number | string;
  亲密?: number | string;
  desc?: string;
}

export interface SkillData extends DataRecord {
  type?: string;
  desc?: string;
  等级?: string | number;
  熟练度?: string | number;
}

export interface InventoryItemData extends DataRecord {
  数量?: string | number;
  品质?: string;
  desc?: string;
}

export interface QuestData extends DataRecord {
  状态?: string;
  地点?: string;
  desc?: string;
}

export interface BeautyRankData extends CharacterData {
  排名?: string | number;
  头衔?: string;
  仙姿?: string;
  群芳谱?: string;
}

export interface JadeMessageData extends DataRecord {
  发送者?: string;
  内容?: string;
  时间?: string;
}

export interface JadeContactData extends CharacterData {
  历史记录?: Record<string, JadeMessageData>;
}

export interface HeroData extends DataRecord {
  姓名?: string;
  性别?: string;
  容貌?: string;
  身形?: string;
  衣着?: string;
  生命?: number | string;
  生命上限?: number | string;
  精血?: number | string;
  精血上限?: number | string;
  灵力?: number | string;
  灵力上限?: number | string;
  修为?: number | string;
  修为上限?: number | string;
  神识?: number | string;
  神识上限?: number | string;
  道心?: number | string;
  道心上限?: number | string;
  功法?: NamedRecord<SkillData>;
  储物袋?: NamedRecord<InventoryItemData>;
  器物?: NamedRecord<InventoryItemData>;
  气运?: NamedRecord | string;
  炼丹?: NamedRecord;
  炼器?: NamedRecord;
}

export interface WorldData extends DataRecord {
  当前时间?: string;
  当前地点?: string;
  遭遇冷却?: number | string;
  动向?: NamedRecord;
}

export interface StatData extends DataRecord {
  主角?: HeroData;
  道侣?: NamedRecord<CharacterData>;
  人物?: NamedRecord<CharacterData>;
  灵宠?: NamedRecord<CharacterData>;
  机遇?: NamedRecord<QuestData>;
  世界?: WorldData;
  绝色榜?: NamedRecord<BeautyRankData>;
  玉简?: NamedRecord<JadeContactData>;
}

export interface MvuData extends DataRecord {
  stat_data?: StatData;
}
