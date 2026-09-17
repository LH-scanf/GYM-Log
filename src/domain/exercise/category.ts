import type { ExerciseCategory } from './types'

/**
 * 正式动作库的精确名称 → category 映射（Source of Truth）。
 * 这 41 个动作的分类是人工确认的最终值，不依赖关键词推断；
 * 用于一次性修正已有数据（覆盖当前可能的错误分类）。
 */
export const officialExerciseCategories: Readonly<Record<string, ExerciseCategory>> = {
  // 胸
  正常卧推: 'CHEST',
  哑铃卧推: 'CHEST',
  史密斯上斜卧推: 'CHEST',
  蝴蝶机夹胸: 'CHEST',
  器械坐姿推胸: 'CHEST',
  俯卧撑: 'CHEST',
  双力臂: 'CHEST',
  // 背
  '坐姿划船（窄距正手）': 'BACK',
  '坐姿划船（窄距反手）': 'BACK',
  '坐姿划船（宽距正手）': 'BACK',
  '坐姿划船（宽距反手）': 'BACK',
  '坐姿器械划船（分边）': 'BACK',
  趴姿拉背: 'BACK',
  '高位下拉（宽距）': 'BACK',
  '高位下拉（窄距）': 'BACK',
  直臂下压: 'BACK',
  引体向上: 'BACK',
  // 肩
  反向蝴蝶机: 'SHOULDERS',
  坐姿器械推肩: 'SHOULDERS',
  坐姿哑铃推肩: 'SHOULDERS',
  '侧平举（正手）': 'SHOULDERS',
  '侧平举（反手）': 'SHOULDERS',
  龙门架侧平举: 'SHOULDERS',
  '龙门架 Y 字侧平举': 'SHOULDERS',
  龙门架农夫侧拉: 'SHOULDERS',
  前平举: 'SHOULDERS',
  绳索面拉: 'SHOULDERS',
  // 手臂
  二头弯举: 'ARMS',
  // 腿
  深蹲: 'LEGS',
  坐姿夹腿: 'LEGS',
  坐姿开腿: 'LEGS',
  坐姿抬腿: 'LEGS',
  坐姿压腿: 'LEGS',
  提踵: 'LEGS',
  // 腹/核心
  仰卧起坐: 'CORE',
  躺姿举腿: 'CORE',
  悬垂举腿: 'CORE',
  正向山羊挺身: 'CORE',
  反向山羊挺身: 'CORE',
  反向山羊举手: 'CORE',
  // 有氧
  爬坡: 'CARDIO',
  // OTHER 当前无
}

type Rule = { pattern: RegExp; category: ExerciseCategory }

/**
 * 按动作名称关键词启发式归类。顺序敏感：先命中的规则胜出。
 * 仅作为新建动作的初始建议，以及未知旧动作（不在正式库中、且 category
 * 缺失）的兜底；**不是**正式动作分类的 Source of Truth。
 */
const categoryRules: Rule[] = [
  // 有氧（含「划船机」器械有氧，须在「背」的「划船」之前命中）
  {
    pattern: /跑|跳绳|跳|骑|单车|划船机|登山|波比|椭圆|游泳|爬坡|快走|有氧|间歇|冲刺/,
    category: 'CARDIO',
  },
  // 胸：卧推 / 推举(胸) / 飞鸟 / 夹胸 / 俯卧撑
  {
    pattern: /卧推|推胸|胸推|飞鸟|夹胸|俯卧撑|双杠臂屈伸.*胸|上斜|下斜/,
    category: 'CHEST',
  },
  // 背：划船 / 下拉 / 引体 / 硬拉 / 挺身 / 面拉
  {
    pattern: /划船|下拉|引体|硬拉|挺身|山羊|面拉|背阔|坐姿拉|直臂|耸肩|反向飞鸟/,
    category: 'BACK',
  },
  // 肩：推举(肩) / 平举 / 侧平举 / 前平举 / 直立划船
  { pattern: /推举|平举|侧平|前平|直立划船|肩推|阿诺德/, category: 'SHOULDERS' },
  // 手臂：弯举 / 臂屈伸 / 二头 / 三头 / 前臂 / 握力
  {
    pattern: /弯举|臂屈伸|二头|三头|肱二|肱三|前臂|握力|牧师|锤式|绳索下压|窄距卧推/,
    category: 'ARMS',
  },
  // 腿：深蹲 / 腿举 / 腿屈伸 / 腿弯举 / 箭步 / 提踵 / 臀桥 / 髋
  {
    pattern:
      /深蹲|蹲|腿举|腿屈伸|腿弯举|腿推|箭步|弓步|提踵|小腿|臀桥|臀推|髋|腿外展|腿内收|保加利亚/,
    category: 'LEGS',
  },
  // 腹/核心：卷腹 / 举腿 / 平板 / 俄罗斯转体 / 核心
  { pattern: /卷腹|举腿|平板|俄罗斯|转体|核心|腹肌|悬垂|侧腹/, category: 'CORE' },
]

/** 根据动作名称推断 category；无法判断返回 OTHER。 */
export function inferCategory(name: string): ExerciseCategory {
  const normalized = name.toLocaleLowerCase()
  for (const rule of categoryRules) {
    if (rule.pattern.test(normalized)) {
      return rule.category
    }
  }
  return 'OTHER'
}
