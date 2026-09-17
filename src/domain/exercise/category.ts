import type { ExerciseCategory } from './types'

type Rule = { pattern: RegExp; category: ExerciseCategory }

/**
 * 按动作名称关键词启发式归类。顺序敏感：先命中的规则胜出。
 * 用于一次性补全历史动作的 category，也在新建/编辑动作时给未显式指定
 * category 的动作一个合理默认；匹配不上返回 OTHER（不丢数据，可手动调）。
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
