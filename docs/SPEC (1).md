# GymLog — 产品规格（SPEC）

> 状态：Draft v0.2  
> 依赖：`INTENT.md`  
> 目的：在进入实现计划前，明确 V1 的产品行为、数据语义、核心实体和验收边界。

---

## 1. 系统概览

GymLog 是一个单用户、Local-first 的健身记录 PWA。

V1 有四个一级模块：

- **训练**：按周查看训练历史 + 新建训练；
- **统计**：训练规律 + 单动作成长趋势；
- **动作**：管理动作族、动作和记录结构；
- **设置**：导入/导出以及基础设置。

V1 不需要登录、云同步和后端服务。

---

## 2. 核心领域模型

核心关系：

```text
ExerciseFamily（可选的动作族/组织父级）
        ↓
Exercise（真正可以记录训练的具体动作）
        ↓
ExerciseBlock（某次训练里出现的一段动作）
        ↓
ExerciseRecord（某一组 / 某一段有氧 / 一条记录）

WorkoutSession
        ↓
ExerciseBlock[]
```

### 2.1 ExerciseFamily（动作族）

动作族用于组织相关变式，但自己不能直接被加入训练。

例：

```text
高位下拉
├── 宽距正手高位下拉
├── 窄距正手高位下拉
└── 窄距反手高位下拉
```

```text
反向山羊
├── 反向山羊挺身
└── 反向山羊举手
```

动作不强制必须属于动作族。像 `绳索面拉` 这种独立动作，不需要为了形式专门创建一个只有一个子项的动作族。

建议字段：

```ts
ExerciseFamily {
  id: string
  name: string
  description?: string
  archived: boolean
  createdAt: string
  updatedAt: string
}
```

规则：

- 动作族不能直接作为训练动作选择；
- 动作族改名后，全局显示统一变化；
- 归档动作族不能删除其中的动作和历史记录；
- 没有任何依赖时可以硬删除，否则优先归档。

---

## 3. Exercise（动作）

Exercise 是真正可以记录的具体动作。

例如：

- 卧推；
- 宽距正手高位下拉；
- 正手侧平举；
- 反向山羊挺身；
- 反向山羊举手；
- 辅助引体向上；
- 爬坡。

建议字段：

```ts
Exercise {
  id: string
  name: string
  familyId?: string

  recordSchema: RecordSchema
  loadMode: LoadMode

  archived: boolean
  createdAt: string
  updatedAt: string
}
```

### 3.1 名称语义

历史记录只保存 `exerciseId`，不额外保存一份历史动作名称快照。

因此动作改名后，所有历史记录统一显示新名称。

这是明确的产品选择。为了减少未来改名，创建动作时应该提醒用户把动作变式命名清楚。

### 3.2 什么时候要拆成不同动作

只要变式会明显影响训练表现、导致历史数据不适合直接比较，就应拆成独立 Exercise。

应该拆分：

- 正手 / 反手；
- 宽距 / 窄距；
- 平板 / 上斜；
- 杠铃 / 哑铃；
- 机械结构明显不同的动作版本。

不应该为了单次状态拆动作，例如：

```text
今天肩膀不舒服
今天座椅高了一格
今天最后两次借力
```

这些属于 note。

左/右侧也不是动作变式，而是 Record 级字段。

---

## 4. RecordSchema（动作记录结构）

每个动作在创建/编辑时，要确定它允许记录哪些字段。

每个结构化字段有三种状态：

```ts
type FieldRequirement =
  | 'DISABLED'  // 不使用
  | 'OPTIONAL'  // 可选
  | 'REQUIRED'  // 必填
```

V1 建议结构：

```ts
RecordSchema {
  reps: FieldRequirement
  load: FieldRequirement
  duration: FieldRequirement
  distance: FieldRequirement
  speed: FieldRequirement
  incline: FieldRequirement
  side: FieldRequirement
}
```

`note` 永远可选，不需要放进 RecordSchema 开关。

### 4.1 V1 固定单位

V1 不做英制/公制切换，统一使用：

```text
load      kg
speed     km/h
duration  min
distance  km
incline   数值型坡度
reps      次数（整数）
```

需要支持合理的小数：

- 7.5 kg；
- 4.5 km/h；
- 3.25 km；
- 30.5 min（如有需要）。

`reps` 必须是非负整数。

### 4.2 Schema 示例

#### 卧推

```text
reps      REQUIRED
load      REQUIRED
其他字段   DISABLED
loadMode  EXTERNAL
```

#### 仰卧起坐

```text
reps      REQUIRED
load      OPTIONAL
其他字段   DISABLED
loadMode  BODYWEIGHT_PLUS
```

#### 反向山羊挺身

```text
family    反向山羊
reps      REQUIRED
load      OPTIONAL
loadMode  BODYWEIGHT_PLUS
```

#### 辅助引体向上

```text
reps      REQUIRED
load      REQUIRED
loadMode  ASSISTANCE
```

#### 爬坡

```text
duration  REQUIRED
speed     OPTIONAL
incline   OPTIONAL
loadMode  NONE
```

#### 快走

```text
duration  REQUIRED
distance  OPTIONAL
speed     OPTIONAL
loadMode  NONE
```

---

## 5. LoadMode（重量语义）

`load` 不只是一个数字，还需要明确这个数字是什么意思。

```ts
type LoadMode =
  | 'NONE'
  | 'EXTERNAL'
  | 'BODYWEIGHT_PLUS'
  | 'ASSISTANCE'
```

### 5.1 NONE

动作不使用重量作为有效指标。

例如：

- 普通有氧；
- 只记录次数且不需要负重的动作。

### 5.2 EXTERNAL

输入重量就是主要外部阻力。

例如：

- 卧推；
- 哑铃推肩；
- 高位下拉；
- 坐姿划船；
- 绳索面拉。

一般情况下，在次数可比时，重量增加意味着能力提升。

### 5.3 BODYWEIGHT_PLUS

动作本身以自重为主，`load` 只记录额外负重。

例如：

- 仰卧起坐；
- 山羊挺身；
- 双杠臂屈伸；
- 后续可能加入负重的悬垂举腿。

语义：

```text
load = null  => 自重
load = 5     => 自重 + 5kg
```

V1 不把人体体重计入 load。

### 5.4 ASSISTANCE

`load` 表示器械提供的辅助重量，而不是阻力重量。

例如辅助引体向上。

一般情况下，在次数可比时：

**辅助重量越小，能力越强。**

统计逻辑禁止把辅助重量上升直接判定为“力量 PR”。

---

## 6. WorkoutSession（一次训练）

WorkoutSession 表示一次健身房训练。

建议字段：

```ts
WorkoutSession {
  id: string
  date: string               // 本地 YYYY-MM-DD
  startTime?: string         // 本地 HH:mm
  endTime?: string           // 本地 HH:mm
  note?: string

  createdAt: string
  updatedAt: string
}
```

规则：

- `date` 必填；
- 开始时间由用户手动输入；
- 结束时间由用户手动输入；
- 可以提供“填入当前时间”快捷按钮；
- 不依赖后台计时器；
- 结束时间可以暂时为空；
- 开始和结束时间同时存在时，训练时长实时计算；
- 历史训练允许修改日期、开始时间、结束时间；
- 删除整次训练必须二次确认。

### 6.1 跨午夜训练

是否允许 `endTime < startTime` 并自动理解为跨天，目前暂不拍板。

这个问题进入 Plan/实现阶段再决定：

- 支持跨午夜；或
- V1 暂时禁止，并明确提示。

---

## 7. ExerciseBlock（一次训练中的动作块）

一次 WorkoutSession 包含按顺序排列的多个 ExerciseBlock。

建议字段：

```ts
ExerciseBlock {
  id: string
  sessionId: string
  exerciseId: string
  order: number
  note?: string
}
```

规则：

- 同一个 Exercise 在一次训练中允许出现多次；
- 保留用户实际训练顺序；
- 支持调整动作顺序；
- 删除动作块时会删除其中的 ExerciseRecord，具体撤销/确认交互后续确定；
- 允许动作级 note。

不能用 `Map<exerciseId, ...>` 存一次训练里的动作，因为同一个动作可能出现两次。

---

## 8. ExerciseRecord（单条训练记录）

ExerciseRecord 是统一记录单元，可以表示力量训练的一组，也可以表示有氧的一段。

建议字段：

```ts
ExerciseRecord {
  id: string
  exerciseBlockId: string
  order: number

  reps?: number
  load?: number
  duration?: number
  distance?: number
  speed?: number
  incline?: number
  side?: 'LEFT' | 'RIGHT' | 'BOTH'

  note?: string
}
```

规则：

- 创建/编辑时按照 Exercise 当前 RecordSchema 校验；
- REQUIRED 字段必须存在；
- DISABLED 字段正常 UI 不允许录入；
- OPTIONAL 字段可以为空；
- Exercise Schema 后续变化时，旧历史记录仍然合法；
- 修改 Schema 不得自动改写历史原始数据；
- Record 顺序稳定且允许调整。

### 8.1 左右侧语义

`side` 是 Record 级数据，而不是动作变式。

例：

```text
单臂绳索侧平举
LEFT   5kg × 10
RIGHT  5kg × 9
```

正手/反手如果会明显影响动作表现，仍然拆成不同 Exercise。

---

## 9. 动作生命周期与数据完整性

### 9.1 改名

Exercise 改名后，所有历史记录统一显示新名称，因为历史只引用 Exercise ID。

### 9.2 归档

已经存在历史记录的动作，默认只能归档，不应该直接删除。

归档后的动作：

- 历史训练仍正常显示；
- 仍参与统计；
- 新增训练的动作列表默认隐藏；
- 可以恢复。

### 9.3 硬删除

只有完全没有历史引用的 Exercise 才允许硬删除。

ExerciseFamily 同理。

### 9.4 Schema 修改

RecordSchema 修改只影响未来录入/编辑校验，不修改旧的原始记录。

例如某动作一开始只记录次数，后来开启“可选负重”，旧的纯次数历史仍然有效。

---

## 10. 首页 / 训练历史

`训练` 是默认首页。

### 10.1 页面结构

训练按周分组，并按时间倒序显示。

示例：

```text
本周
  9月14日  18:12–19:31  1h19min
  卧推 · 上斜卧推 · 举腿 · 爬坡

  9月12日  18:06–19:15  1h09min
  高位下拉 · 坐姿划船 · 面拉

上周
  9月11日  18:17–19:46  1h29min
  卧推 · 上斜卧推 · 双力臂 · 举腿 · 快走

  9月9日   20:07–--
  未填写结束时间
```

要求：

- 最新周在最上面；
- 同一周内最新训练在最上面；
- 整张训练卡都可以点击；
- 点击进入训练详情；
- 训练详情可以编辑；
- 未填写结束时间时必须明确显示，不能伪造时长；
- “新建训练”始终容易触达。

后续可选增强：

- 在“本周/上周”旁显示“训练第 N 周”。

---

## 11. 新建训练流程

### 11.1 创建 Session

字段：

```text
日期       必填，默认今天
开始时间   手动输入，可提供“当前时间”快捷填充
```

创建后进入训练编辑器。

### 11.2 添加动作

打开动作选择弹窗。

支持：

- 搜索动作名称；
- 最近使用动作；
- 全部未归档动作；
- 可选按动作族分组；
- 已归档动作默认隐藏。

选择动作后立即创建 ExerciseBlock，并根据 RecordSchema 生成输入 UI。

### 11.3 记录训练

普通力量动作：

```text
卧推

[40] kg × [8] 次
[40] kg × [10] 次
[45] kg × [5] 次

[ + 添加一组 ]
```

新增一条 Record 时，默认复制上一条的已有值，尤其是重量/次数，减少输入。

自重 + 可选负重：

```text
反向山羊挺身

自重 × 20
自重 × 20
+5kg × 10

[ + 添加一组 ]
```

有氧：

```text
爬坡

坡度     [12]
速度     [5] km/h
时间     [40] min

[ + 添加一段 ]
```

### 11.4 训练编辑能力

训练编辑器必须支持：

- 新增记录；
- 删除记录；
- 修改任意字段；
- 添加动作；
- 删除动作块；
- 调整动作顺序；
- 修改训练日期/开始时间/结束时间；
- 结束时间为空也可以保存。

### 11.5 “上次表现”快捷入口

每个 ExerciseBlock 都应该提供查看该动作**上一次训练表现**的快捷入口。

例如：

```text
卧推                         上次 >
```

点开后展示上一次出现该 Exercise 的日期和全部原始记录，尽量不跳出当前训练流程。

这是高优先级功能。

---

## 12. 训练详情页

已保存训练的详情页显示：

- 日期；
- 开始时间；
- 结束时间；
- 实时计算出的训练时长；
- 按顺序显示全部动作；
- 每个动作下的全部原始记录；
- note（如果有）。

操作：

- 编辑；
- 删除本次训练。

编辑时尽量复用“新建训练”的同一套组件。

---

## 13. 统计计算原则

所有统计都从原始训练数据实时计算。

可以做 memo/cache，但缓存必须可以随时丢弃。

### 13.1 性能要求

这是个人数据集，即使持续记录多年，规模也可控。

常用索引应支持：

- 按 Session 日期查询；
- 按 Session ID 查询；
- 按 Exercise ID 查询；
- 按 ExerciseBlock ID 查询。

实现上禁止每次 React 组件重渲染都全库扫描。应该按查询范围计算，并根据数据版本/依赖做 memoization 或轻量缓存。

---

## 14. 统计首页

统计首页主要回答：**“我有没有稳定训练？”**

V1 至少显示：

```text
今年训练次数
今年训练时长
本月训练次数
本月训练时长
```

### 14.1 年度训练热力图

提供 GitHub Contribution 风格年度日历/热力图。

V1 最低语义：

```text
无训练 = 空格
有训练 = 激活格
```

后续可以按当天总训练时长增加颜色深浅等级。

点击有记录的日期，可以预览或进入当天训练。

### 14.2 最近进步

可以提供一个紧凑区域显示最近的明显变化，例如：

```text
卧推
最高训练重量 40kg -> 45kg

辅助引体向上
辅助重量 55kg -> 50kg
```

“最近进步”的精确识别算法可以后补，不阻塞 V1 基础统计。

---

## 15. 单动作统计页

每个 Exercise 根据 LoadMode 和 RecordSchema 展示不同统计。

### 15.1 EXTERNAL + reps

建议指标：

- 历史最高训练重量；
- 固定重量下的最佳次数；
- 估算 1RM；
- 包含该动作的训练次数；
- 历史总 Record 数；
- 原始训练历史。

建议趋势切换：

```text
力量水平（估算1RM）
最高训练重量
固定重量次数
```

折线图必须按真实时间顺序绘制。

### 15.2 BODYWEIGHT_PLUS

建议指标：

- 最大额外负重；
- 自重状态下最佳次数；
- 指定额外负重下最佳次数；
- 训练次数；
- 历史记录。

`load = null` 在 UI 显示为“自重”。

### 15.3 ASSISTANCE

建议指标：

- 历史最低辅助重量；
- 指定辅助重量下最佳次数；
- 辅助重量趋势；
- 训练次数；
- 历史记录。

UI 必须明确：**辅助重量下降通常表示进步。**

### 15.4 纯次数动作

建议指标：

- 单条 Record 最高次数；
- 每次训练最佳次数趋势；
- 训练次数；
- 历史记录。

### 15.5 有氧

根据启用字段统计：

- 累计时长；
- 单次最长时长；
- 时长趋势；
- 如果启用 speed，则速度趋势；
- 如果启用 incline，则坡度趋势；
- 如果启用 distance，则距离趋势；
- 训练次数。

V1 不强行让所有动作共享同一种图表。

---

## 16. 估算 1RM

估算 1RM 属于派生数据，不入库。

计算公式必须集中在一个统计模块里，后续更换算法不需要迁移历史数据。

V1 最终用 Epley 还是其他标准公式，在 Plan/实现阶段确认，并写入测试。

1RM 只对合适的外部负重力量动作计算，禁止无脑应用于：

- ASSISTANCE；
- 有氧；
- 与力量不相关的任意 Schema。

---

## 17. 动作管理 UI

`动作` 页面用于管理 ExerciseFamily 和 Exercise。

### 17.1 新建动作

字段：

```text
名称                必填
动作族              可选

次数                DISABLED / OPTIONAL / REQUIRED
重量                DISABLED / OPTIONAL / REQUIRED
时间                DISABLED / OPTIONAL / REQUIRED
距离                DISABLED / OPTIONAL / REQUIRED
速度                DISABLED / OPTIONAL / REQUIRED
坡度                DISABLED / OPTIONAL / REQUIRED
左右侧              DISABLED / OPTIONAL / REQUIRED

重量语义            NONE / EXTERNAL / BODYWEIGHT_PLUS / ASSISTANCE
```

校验规则：

- load 为 DISABLED 时，loadMode 通常应该是 NONE；
- load 被启用时，loadMode 必须有明确非 NONE 语义；
- 至少启用一个记录字段；
- 动作名称不能为空；
- 出现重复名称时要警告，不能静默创建两个难以区分的动作。

### 17.2 编辑动作

允许：

- 改名；
- 修改所属动作族；
- 修改 RecordSchema；
- 修改 LoadMode（如果已有历史必须给出提醒）；
- 归档 / 取消归档。

任何修改都不能自动改写旧 ExerciseRecord 原始值。

---

## 18. 导入 / 导出

JSON 是标准备份和迁移格式。

### 18.1 导出

完整导出至少包括：

- Schema/格式版本；
- 导出时间；
- ExerciseFamily；
- Exercise；
- WorkoutSession；
- ExerciseBlock；
- ExerciseRecord；
- 恢复数据库所必需的相关设置。

建议顶层结构：

```json
{
  "format": "gymlog-backup",
  "version": 1,
  "exportedAt": "2026-09-14T...",
  "data": {
    "exerciseFamilies": [],
    "exercises": [],
    "workoutSessions": [],
    "exerciseBlocks": [],
    "exerciseRecords": [],
    "settings": {}
  }
}
```

### 18.2 导入

导入必须：

1. 校验文件格式和版本；
2. 校验实体引用完整性；
3. 在覆盖数据前展示摘要；
4. 导入失败时不能留下半套损坏数据；
5. V1 优先采用 **replace-all（整库替换）**，因为这是自用单用户软件。

复杂 merge/conflict 可以后置。

### 18.3 历史文本记录

V1 不实现自由文本解析。

旧训练记录可以由外部转换为标准 JSON 后导入。

---

## 19. 本地存储

V1 推荐结构：

```text
PWA
 ↓
IndexedDB
 ↓
Repository / Data Access Layer
 ↓
Statistics Query
```

要求：

- PWA 安装/缓存完成后，核心功能离线可用；
- IndexedDB 访问统一封装在数据层；
- UI 组件不能到处直接写 IndexedDB；
- 从第一个正式版本开始就有 Schema Version / Migration；
- 为常用查询建立索引。

建议索引：

```text
WorkoutSession.date
ExerciseBlock.sessionId
ExerciseBlock.exerciseId
ExerciseRecord.exerciseBlockId
```

---

## 20. 导航

V1 推荐底部导航：

```text
训练 | 统计 | 动作 | 设置
```

Mobile-first 是参考体验。

桌面/响应式版本可以放宽布局，但不改变信息架构。

---

## 21. V1 非目标

除非后续明确改 Scope，否则 V1 不包含：

- 社交 Feed；
- 好友/关注；
- 训练视频；
- 教练课程；
- 饮食记录；
- 热量统计；
- Apple Health；
- 可穿戴设备；
- 自动到店打卡；
- 云账号；
- 多用户；
- AI 自动生成训练计划；
- 自由文本自然语言训练导入。

---

## 22. V1 验收标准

以下全部成立时，V1 功能层面可以认为完成：

1. 可以创建、编辑、归档 ExerciseFamily 和 Exercise；
2. Exercise 创建支持 REQUIRED / OPTIONAL / DISABLED；
3. 支持 NONE / EXTERNAL / BODYWEIGHT_PLUS / ASSISTANCE 四种 LoadMode；
4. 可以创建带日期和手动时间的 WorkoutSession；
5. 结束时间为空也可以保存；
6. 一次训练可以按顺序添加多个 ExerciseBlock；
7. 同一个 Exercise 可以在同一训练中出现两次；
8. 可以新增、编辑、删除、调整 ExerciseRecord；
9. 新增下一组时可以高效复制上一组数据；
10. 训练过程中可以快速查看该动作“上次表现”；
11. 首页按周显示训练历史，并可以进入可编辑详情；
12. Exercise 改名后历史统一显示新名字；
13. 有历史引用的动作采用归档而不是破坏性删除；
14. 统计页显示今年/本月训练次数与训练时长；
15. 有年度训练热力图；
16. 单动作统计根据 Schema / LoadMode 正确变化；
17. 派生统计全部从原始记录计算，不作为权威数据保存；
18. 可以导出完整带版本号的 JSON；
19. 可以安全导入合法备份，不产生半套损坏数据；
20. 训练记录、历史查看、统计等核心能力离线可用。

---

## 23. 进入 Plan 前仍需决定的问题

下面这些问题先不写死在产品意图里，进入架构/实现计划时再决定：

- 最终前端技术栈与组件库；
- IndexedDB wrapper/library；
- 统计缓存 / memoization 策略；
- 估算 1RM 的最终公式；
- 年度热力图颜色深浅规则；
- V1 是否支持跨午夜训练；
- replace-all 导入事务实现细节；
- 数据库 migration/versioning 实现方式；
- 测试层级与 Release Gate；
- PWA 安装与更新策略；
- “训练第 N 周”是否进入 V1。

这些问题应该在后续 `ARCHITECTURE.md`、`DATA_MODEL.md` 和 `plans/` 中解决，而不是改变上面的核心产品语义。
