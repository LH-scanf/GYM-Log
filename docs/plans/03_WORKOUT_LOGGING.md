# Plan 03 — Workout Logging

> 目标：在已经稳定的动作字典和数据层之上，完成 GymLog 最核心的“训练中记录”流程。  
> 本阶段结束后，用户可以创建一次训练、手动填写日期与进出时间、选择动作、按 Exercise Schema 快速录入多条 Record，并在 PWA 被刷新或回收后恢复未完成训练。

## 1. Goal

把“训练”Tab 从占位/入口页面升级为真正可用的训练记录工作区。

核心体验：

```text
新建训练
→ 日期 + 开始时间
→ 添加动作
→ Schema 驱动输入
→ 添加 / 删除 / 复制一组（或一段）
→ 数据持续保存到 IndexedDB
→ 手动填写结束时间
→ 完成训练
```

本阶段强调：

- 记录必须足够快；
- 不依赖后台计时器；
- 不等待训练结束才一次性保存；
- Exercise Schema 决定输入 UI；
- 原始 Workout 数据仍是唯一事实来源。

---

## 2. Entry Criteria

进入 Plan 03 前必须满足：

- Plan 00 — Project Bootstrap：`PASS`；
- Plan 01 — Data Foundation：`PASS`；
- Plan 02 — Exercise Management：`PASS`；
- Exercise / ExerciseFamily / RecordSchema / LoadMode 已可由用户真实维护；
- Workout Repository 与 Record Validation 可复用或在不改变数据模型原则的前提下扩展；
- 数据库 schema version 仍为 `1`；
- working tree clean，当前代码已与远端同步。

产品规则以 `../SPEC.md` 为准，数据规则以 `../DATA_MODEL.md` 为准，Agent 通用执行规则以仓库根目录 `AGENTS.md` 为准。

---

## 3. Scope

本阶段只完成训练中的记录流程：

```text
训练 Tab
├─ 新建训练
├─ 日期 / 开始时间
├─ 未完成训练恢复
├─ Exercise Picker
├─ ExerciseBlock
├─ Schema-driven Record Editor
├─ 添加 / 删除 Record
├─ 快速复制上一条 Record
├─ 删除当前 ExerciseBlock
├─ 上次表现查看
├─ 手动结束时间
└─ 持续本地保存
```

核心规则：

- 新建训练的 `date` 必填；
- 新建训练的 `startTime` 在 UI 中必填并由用户手动确认；
- `endTime` 在训练过程中允许为空；
- 不实现后台持续计时器；
- 可以提供“填入当前时间”快捷按钮，但本质仍是填写 `HH:mm`；
- 一个 WorkoutSession 可以包含多个 ExerciseBlock；
- 同一个 Exercise 可以在同一次 WorkoutSession 中出现多次；
- ExerciseBlock / ExerciseRecord 顺序按真实录入顺序持久化；
- archived Exercise 不出现在新训练选择器中；
- 已经存在于历史/当前训练中的 archived Exercise 仍必须可正常显示；
- Record 输入完全由当前 Exercise 的 `RecordSchema + LoadMode` 驱动；
- 不为了录入 UI 复制第二套业务 Schema。

---

## 4. Tasks

### 03A — Workout Start / Resume

- [ ] 将“训练”Tab升级为训练入口；
- [ ] 无正在编辑的训练时显示清晰的“新建训练”入口；
- [ ] 新建训练时填写 `date` 与 `startTime`；
- [ ] 日期默认今天，但用户可以修改；
- [ ] 开始时间由用户输入，可提供“现在”快捷填充；
- [ ] 创建后立即持久化 WorkoutSession，不等待训练结束；
- [ ] `endTime = null/undefined` 为合法状态；
- [ ] 重新加载 PWA 后，可以发现并继续未完成训练；
- [ ] 如果存在多个 `endTime` 为空的 Session，不擅自覆盖或合并，应允许用户明确选择继续哪一个或新建训练；
- [ ] 不新增后台计时器、倒计时或依赖页面常驻的运行时状态。

未完成训练的识别不得依赖新增 `isTraining` 字段；优先使用现有 WorkoutSession 数据与应用层查询规则。若确实发现必须改变核心数据模型，应暂停并人工确认。

### 03B — Exercise Picker / ExerciseBlock

- [ ] 当前训练中提供“添加动作”入口；
- [ ] 使用移动端友好的 Dialog / Sheet / 页面选择 Exercise；
- [ ] 只显示 `archived = false` 的 Exercise；
- [ ] 支持按名称搜索；
- [ ] 按 ExerciseFamily 组织，`familyId = null` 显示为未分组；
- [ ] 选择 Exercise 后创建新的 ExerciseBlock，并追加到当前 Session 末尾；
- [ ] 同一个 Exercise 可以再次添加，形成新的 ExerciseBlock；
- [ ] 每个 Block 显示动作名称与当前 Schema 对应的输入区域；
- [ ] 支持删除当前训练中的 ExerciseBlock，并级联删除该 Block 的 Record；
- [ ] Block 删除属于当前训练编辑行为，不扩展为通用历史管理功能。

### 03C — Schema-driven Record Editor

Record Editor 必须由 `Exercise.recordSchema` 与 `Exercise.loadMode` 驱动生成。

V1 字段：

```text
load       kg
reps       次
 duration   min
 distance   km
 speed      km/h
 incline    坡度
 side       LEFT / RIGHT / BOTH
```

UI 中文语义示例：

```text
卧推
[ 40 ] kg × [ 8 ] 次

反向山羊挺身
[ 自重 ] × [ 20 ] 次
[ +5 ] kg × [ 10 ] 次

辅助引体向上
[ 50 ] kg辅助 × [ 10 ] 次

爬坡
坡度 [ 12 ]
速度 [ 5 ] km/h
时间 [ 40 ] min
```

要求：

- [ ] `DISABLED` 字段不显示；
- [ ] `REQUIRED` 字段在 Record 可提交/持久化前必须满足现有 Domain Validation；
- [ ] `OPTIONAL` 字段允许为空；
- [ ] `BODYWEIGHT_PLUS` 的空 load 表示“自重”，不能显示成 `0kg`；
- [ ] `ASSISTANCE` 在 UI 中明确表达“辅助重量”；
- [ ] reps 使用“次”，不能误写成“组”；
- [ ] 数值输入适配手机数字键盘；
- [ ] side 启用时提供明确的左 / 右 / 双侧选择；
- [ ] Schema 更新以后，新录入遵循当前 Schema；历史 Record 不被回写。

### 03D — Record Add / Copy / Delete

- [ ] 每个 ExerciseBlock 可以拥有多条 ExerciseRecord；
- [ ] 第一条 Record 提供清晰的空输入状态；
- [ ] “添加一组”用于力量/次数类记录；
- [ ] 对有氧/时长类记录可使用“添加一段”等更合适文案；
- [ ] 新增下一条 Record 时，默认复制上一条 Record 的可编辑训练字段，减少重复输入；
- [ ] 复制时生成新的 `id` 与 `order`，不能复用原 Record 身份；
- [ ] note 等非核心临时信息若存在，不应因复制产生意外语义；
- [ ] 支持删除某一条 Record；
- [ ] 删除后 Record order 保持稳定、连续且可排序；
- [ ] 不使用 `Map<exerciseId, records>`，所有数据继续通过 ExerciseBlock 组织。

典型目标交互：

```text
卧推
40kg × 8
40kg × 10
45kg × 6

[ + 添加一组 ]
```

新增一组后默认带出上一组数据，用户通常只需修改重量或次数中的一个值。

### 03E — Persistence / Recovery

本阶段不能采用“训练结束时才一次性保存”的模型。

- [ ] WorkoutSession 创建后立即写入 IndexedDB；
- [ ] ExerciseBlock 创建/删除后立即持久化；
- [ ] 合法 ExerciseRecord 创建后立即或短延迟持久化；
- [ ] 已存在合法 Record 的修改自动持久化；
- [ ] UI 的临时未完成输入不得绕过 Domain Validation 把非法 Record 写入数据库；
- [ ] 页面刷新后，已经合法保存的数据全部恢复；
- [ ] PWA 被系统回收后重新打开，可以继续未完成训练；
- [ ] 保存状态不依赖“最后点一次总保存按钮”。

如果一个新 Record 尚未满足 REQUIRED 字段，可以保留为 UI draft；在合法之前不写入正式 ExerciseRecord。不得为了保存半成品而放宽 Domain Validation。

### 03F — Previous Performance

每个 ExerciseBlock 提供轻量的“上次”入口，用于训练中快速查看该 Exercise 最近一次历史表现。

- [ ] 根据 `exerciseId` 查询当前 Session 之前最近一次包含该 Exercise 的 ExerciseBlock；
- [ ] 显示该 Block 的原始 Record；
- [ ] 按 Record 实际存在的字段展示，不根据当前 Schema 擅自隐藏历史字段；
- [ ] 没有历史记录时给出明确空状态；
- [ ] 本功能只做“上次表现查看”，不实现统计、PR、趋势或建议。

示例：

```text
上次 · 9月11日
30kg × 12
35kg × 12
40kg × 8
45kg × 4
40kg × 6
```

### 03G — Finish Workout

- [ ] 当前训练页面提供“完成训练”入口；
- [ ] 完成时由用户手动填写 `endTime`；
- [ ] 可提供“现在”快捷填充；
- [ ] 不从页面运行时长反推出结束时间；
- [ ] 保存后通过现有时间规则实时派生训练时长；
- [ ] 支持跨午夜，例如 `23:20 → 00:35 = 75min`；
- [ ] 完成训练不写入冗余 duration 字段；
- [ ] 完成后退出编辑态，并显示最小成功反馈 / 返回训练入口；
- [ ] 本阶段不实现按周历史列表，那属于 Plan 04。

当前 Session 在结束前允许 `endTime` 为空。用户关闭页面、返回首页或稍后补结束时间，都不能导致已记录数据丢失。

### 03H — Cancel Current Draft

为避免误创建空训练产生垃圾 Session，本阶段允许取消当前正在编辑的训练：

- [ ] 提供“放弃本次训练”操作；
- [ ] 有内容时必须二次确认；
- [ ] 删除当前 Session 时按已有 Repository 规则级联删除 Block / Record；
- [ ] 该能力只针对当前训练工作区，不扩展为任意历史训练删除入口；
- [ ] 历史训练删除仍留给 Plan 04。

### 03I — Mobile-first UX

- [ ] 单手操作下核心输入易于点击；
- [ ] 数字输入框不会因为窄屏挤压导致横向滚动；
- [ ] 底部导航与 safe-area 不遮挡最后一组或完成按钮；
- [ ] Exercise Picker 在手机键盘弹出时仍可搜索与选择；
- [ ] 长动作名正常换行/截断，不破坏记录输入；
- [ ] 删除按钮与“添加一组”不会过度拥挤；
- [ ] 输入字段空态、错误态、保存态清晰；
- [ ] 不引入复杂桌面优先布局。

核心 UX 原则：

> 创建动作可以复杂，但训练中的一次记录必须尽量少操作。

---

## 5. Acceptance Criteria

Plan 03 完成时，用户必须能够：

1. 在“训练”Tab 新建 WorkoutSession；
2. 手动设置日期和开始时间；
3. 添加任意未归档 Exercise；
4. 同一 Exercise 在同一次 Session 中添加两次且互不覆盖；
5. 根据不同 RecordSchema 得到不同输入 UI；
6. 录入卧推 `40kg × 8 / 40kg × 10 / 45kg × 6`；
7. 录入反向山羊 `自重 × 20 / +5kg × 10`；
8. 录入辅助引体的辅助重量与次数；
9. 录入爬坡 `坡度12 / 速度5 / 40min`；
10. 添加下一组时快速复用上一组数据；
11. 删除某组或当前 ExerciseBlock；
12. 刷新页面后已经合法保存的数据不丢失；
13. 关闭/重新打开 PWA 后可以恢复未完成 Session；
14. 查看一个动作的最近一次历史表现；
15. 手动填写结束时间并完成训练；
16. 跨午夜时长正确；
17. 放弃当前训练时正确级联删除；
18. 全过程不依赖后台计时器；
19. 数据库 schema version 仍保持 `1`。

若实现确实要求改变数据库 schema / 核心 Domain Model，必须暂停并人工确认，不能自行升级。

---

## 6. Required Test Scenarios

至少覆盖以下真实训练场景。

### 场景 A — 9月11日卧推

```text
日期：9月11日
开始：18:17

卧推
30kg × 12
35kg × 12
40kg × 8
45kg × 4
40kg × 6
```

验证：

- Session / Block / Record 顺序正确；
- 新增下一组可复制上一组；
- 刷新后数据完整恢复。

### 场景 B — BODYWEIGHT_PLUS

```text
反向山羊挺身
自重 × 20
自重 × 20
+5kg × 10
```

验证：

- 自重记录不写入伪造的 `load = 0`；
- `+5kg` 正确保存为额外负重。

### 场景 C — ASSISTANCE

```text
辅助引体向上
50kg辅助 × 10
50kg辅助 × 8
45kg辅助 × 7
```

验证 UI 语义与数据语义不被普通负重混淆。

### 场景 D — Cardio

```text
爬坡
坡度 12
速度 5km/h
时间 40min
```

验证 Schema-driven UI 不出现 reps / load。

### 场景 E — 纯次数

```text
悬垂举腿
10
12
10
```

验证只有 reps 的 Exercise 可以自然记录。

### 场景 F — 同动作重复出现

同一 Session 中：

```text
卧推 Block A
...
其他动作
...
卧推 Block B
```

两个 Block 必须独立存在、顺序正确、Record 不互相覆盖。

### 场景 G — 未完成训练恢复

```text
WorkoutSession.endTime = null
```

在已有合法 Record 后刷新 / 重新加载应用：

- Session 仍存在；
- Block / Record 完整；
- 可以继续录入；
- 不自动填结束时间。

### 场景 H — Previous Performance

准备两次不同日期的卧推记录。

在较新的 Session 录入卧推时，“上次”应展示最近一次更早的卧推 Block，而不是当前 Block，也不能跨 Exercise 混淆。

### 场景 I — Finish / Midnight

```text
startTime = 23:20
endTime   = 00:35
```

验证完成训练后派生时长为 75min，数据库不保存冗余 duration。

### 场景 J — Cancel Draft

建立：

```text
Session
→ Block
→ Record
```

执行“放弃本次训练”后，三层数据全部正确删除且不存在 dangling foreign key。

### E2E

至少覆盖一条 Mobile Chromium 完整路径：

```text
训练 Tab
→ 新建训练
→ 日期 + 开始时间
→ 添加卧推
→ 40 × 8
→ 添加一组并修改为 40 × 10
→ 添加一组并修改为 45 × 6
→ 刷新页面
→ 数据仍存在
→ 填写结束时间
→ 完成训练
```

再覆盖至少一个不同 Schema：

```text
反向山羊挺身（BODYWEIGHT_PLUS）
或
爬坡（duration + incline + speed）
```

E2E 必须有可重复的 IndexedDB 初始化/清理策略，不能依赖人工清浏览器数据。

---

## 7. Out of Scope

Plan 03 不实现：

- 首页按本周 / 上周分组的历史训练列表；
- 任意历史 WorkoutSession 的完整编辑页面；
- 任意历史 WorkoutSession 删除；
- 日历历史导航；
- 年度训练热力图；
- 本月 / 今年训练次数；
- PR / 最大重量 / 1RM；
- 固定重量次数趋势；
- 图表；
- AI 训练建议；
- Rest Timer / 组间计时；
- 后台持续健身计时器；
- 训练模板；
- 拖拽动作排序；
- JSON Import / Export 正式 UI；
- OneDrive / 云同步 / 后端。

本阶段只回答：

> “我现在正在健身，怎样最快、最可靠地把这一次训练记录下来？”

---

## 8. Checklist

- [x] 03A Workout Start / Resume
- [x] 03B Exercise Picker / ExerciseBlock
- [x] 03C Schema-driven Record Editor
- [x] 03D Record Add / Copy / Delete
- [x] 03E Persistence / Recovery
- [x] 03F Previous Performance
- [x] 03G Finish Workout
- [x] 03H Cancel Current Draft
- [x] 03I Mobile-first UX
- [x] Acceptance Criteria 全部满足
- [x] Required Test Scenarios 全部通过

通用质量门禁、自审、文档同步、Commit、Push 与最终报告规则统一由根目录 `AGENTS.md` 执行。

---

## 9. Next Stage

Plan 03 完成并经过人工验收后，才开始编写并审核：

```text
Plan 04 — History & Editing
```

Plan 03 不提前实现 Plan 04。
