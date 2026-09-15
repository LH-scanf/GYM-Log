# Plan 05 — Statistics

> 目标：在 Plan 00–04 已稳定的原始训练数据之上，完成 GymLog V1 的统计首页与单动作统计页。
> 本阶段结束后，用户可以看到自己的训练频率、训练时长、年度训练热力图，并针对不同 Exercise / LoadMode 查看真正有意义的进步趋势。

## 1. Goal

Plan 05 的唯一核心目标：

> **从现有 WorkoutSession / ExerciseBlock / ExerciseRecord 实时派生统计，让用户回答“我有没有稳定训练？”以及“这个动作有没有进步？”**

核心路径：

```text
统计 Tab
├─ 今年训练次数 / 时长
├─ 本月训练次数 / 时长
├─ 年度训练热力图
└─ 动作统计入口
    ↓
Exercise Statistics
├─ EXTERNAL
├─ BODYWEIGHT_PLUS
├─ ASSISTANCE
├─ 纯次数
└─ 有氧
```

本阶段所有统计均为派生数据：

```text
Raw Workout Data
→ Statistics Query / Domain Calculation
→ UI
```

不得新增“PR 表”“统计表”“年度汇总表”等第二份权威数据。

---

## 2. Entry Criteria

进入 Plan 05 前必须满足：

- Plan 00 — Project Bootstrap：`PASS`；
- Plan 01 — Data Foundation：`PASS`；
- Plan 02 — Exercise Management：`PASS`；
- Plan 03 — Workout Logging：`PASS`；
- Plan 04 — History & Editing：`PASS`；
- WorkoutSession / ExerciseBlock / ExerciseRecord 已可稳定创建、编辑、重排和删除；
- 跨午夜训练时长已有统一计算规则；
- Exercise 的 `RecordSchema` / `LoadMode` 已稳定；
- 数据库 schema version 仍为 `1`；
- Agent 工作规则以根目录 `AGENTS.md` 为准；
- Plan 05 开始时 working tree 应 clean，并与远端同步。

统计规则以 `docs/SPEC.md` 第 13–16 节为主要依据。

---

## 3. Scope

本阶段完成：

```text
统计 Tab
├─ Overview
│   ├─ 今年训练次数
│   ├─ 今年训练时长
│   ├─ 本月训练次数
│   └─ 本月训练时长
│
├─ Year Heatmap
│   ├─ GitHub contribution 风格
│   └─ 点击日期查看当天训练
│
├─ Exercise Statistics Entry
│   ├─ 搜索 Exercise
│   └─ 进入单动作统计
│
└─ Exercise Statistics
    ├─ EXTERNAL
    ├─ BODYWEIGHT_PLUS
    ├─ ASSISTANCE
    ├─ Reps-only
    └─ Cardio
```

本阶段允许新增纯统计模块、Query Service 与图表组件。

如果需要图表库，可引入 `Recharts`；不得为了图表修改核心数据模型。

---

## 4. 统计语义

### 4.1 Workout 数量

V1 中：

```text
训练次数 = 查询时间范围内存在的 WorkoutSession 数量
```

- `endTime` 为空的 Session 仍是一条真实训练记录，计入训练次数；
- 被删除的 Session 不计入；
- 不额外引入 `completed` / `isValidWorkout` 等持久化字段。

### 4.2 Workout 时长

只有同时存在合法：

```text
startTime + endTime
```

的 Session 才计入训练时长。

- 普通训练直接计算分钟差；
- `endTime < startTime` 按现有规则解释为跨午夜；
- 缺少开始或结束时间的 Session 不贡献时长；
- 不把未知时长当成 0 分钟的“真实训练时长”显示；
- Overview 汇总值可以把可计算 Session 的时长相加。

### 4.3 热力图

V1 采用最小稳定语义：

```text
当天 0 次训练 → inactive
当天 >= 1 次训练 → active
```

暂不根据时长或训练次数做颜色深浅等级。

热力图按 WorkoutSession 的本地 `date` 聚合。

### 4.4 Exercise 训练次数

单动作统计中的：

```text
训练次数
```

表示包含该 `exerciseId` 的**不同 WorkoutSession 数量**。

同一个 Exercise 在同一个 Session 中出现多个 ExerciseBlock：

```text
训练次数仍只 +1
Record / Block 数据全部参与对应指标计算
```

### 4.5 Exercise 改名与归档

- 统计始终按 `exerciseId` 聚合；
- Exercise 改名后统计页显示当前名称；
- archived Exercise 的历史统计仍然可查看；
- 不复制历史动作名称快照。

---

## 5. Tasks

### 05A — Statistics Domain / Query Foundation

建立独立、可测试的统计计算层。

- [x] 新增统计 Query / Application Service；
- [x] UI 不直接扫描 Dexie Table；
- [x] 统计计算尽可能使用纯函数；
- [x] 支持按日期范围查询 WorkoutSession；
- [x] 支持按 `exerciseId` 获取相关 Block / Record；
- [x] 同一个 Exercise 在一个 Session 中出现多次时正确合并；
- [x] archived Exercise 仍可统计；
- [x] Exercise 改名不影响历史聚合；
- [x] Workout / Record 编辑或删除后，下次统计查询立即反映最新原始数据；
- [x] 不持久化统计结果；
- [x] 不修改数据库 schema version。

可以使用 memoization / 轻量缓存优化一次页面生命周期内的重复计算，但缓存必须可丢弃，不能成为 Source of Truth。

### 05B — Statistics Overview

将“统计”Tab 从占位页升级为真实 Overview。

至少显示：

```text
今年训练次数
今年训练时长
本月训练次数
本月训练时长
```

要求：

- [ ] “今年”按当前本地自然年；
- [ ] “本月”按当前本地自然月；
- [ ] Session 数量按照 4.1 规则统计；
- [ ] 时长按照 4.2 规则统计；
- [ ] 跨午夜训练时长正确；
- [ ] 未填写结束时间的 Session 不污染时长；
- [ ] 无数据时显示 `0` / `0min` 等明确空值；
- [ ] 时长使用统一格式，例如 `12h 35min` / `45min`；
- [ ] 页面刷新后统计值与原始数据一致。

### 05C — Year Heatmap

实现 GitHub Contribution 风格年度训练日历。

- [ ] 默认展示当前年份；
- [ ] 至少允许切换到有数据的其他年份；
- [ ] 以“周”为列、星期为行组织日期格；
- [ ] 无训练日期 inactive；
- [ ] 有训练日期 active；
- [ ] 今天 / 未来日期语义明确，不将未来日期误显示为训练；
- [ ] 移动端允许合理横向浏览或自适应，不破坏页面宽度；
- [ ] 点击 active 日期可查看当天训练；
- [ ] 当天只有一条训练时可直接进入/提供进入 Workout Detail 的入口；
- [ ] 当天多条训练时显示该日 Session 列表，再进入详情；
- [ ] 日期聚合不新增数据库字段。

V1 不做：

```text
1 次训练 = 浅色
2 次训练 = 深色
时长越长 = 越深
```

只做 binary active / inactive。

### 05D — Exercise Statistics Entry

统计首页提供进入单动作统计的入口。

- [ ] 支持按 Exercise 名称搜索；
- [ ] Active Exercise 正常展示；
- [ ] archived Exercise 仍可被找到并查看历史统计；
- [ ] 可以使用 ExerciseFamily 做轻量分组，但不是强制；
- [ ] 点击 Exercise 进入独立统计页；
- [ ] 无历史记录的 Exercise 显示明确空状态；
- [ ] 不为了统计复制第二套 Exercise 类型。

### 05E — EXTERNAL + Reps Statistics

适用于：

```text
loadMode = EXTERNAL
且历史 Record 存在 load + reps
```

至少提供：

- [ ] 历史最高训练重量；
- [ ] 包含该动作的训练次数；
- [ ] 历史 Record 数；
- [ ] 估算 1RM；
- [ ] 估算 1RM 趋势；
- [ ] 最高训练重量趋势；
- [ ] 固定重量下最佳次数；
- [ ] 固定重量次数趋势。

#### 1RM

V1 使用 **Epley**：

```text
estimated1RM = load * (1 + reps / 30)
```

规则：

- 只对 `EXTERNAL` 且同时存在合法 `load > 0`、`reps > 0` 的 Record 计算；
- 每次 WorkoutSession 的 1RM 趋势点取该 Session 内该 Exercise 的**最高 estimated1RM**；
- 页面明确写“估算 1RM”，不能显示成真实测得 1RM；
- 结果属于派生数据，不入库；
- ASSISTANCE / Cardio / 不含 load+reps 的动作禁止套用该公式。

#### 最高重量趋势

每个 Session：

```text
point = 当次该 Exercise 的 max(load)
```

#### 固定重量次数

- 从历史 Record 的实际 `load` 值生成可选重量；
- 用户选择某重量，例如 `40kg`；
- 每个 Session 的趋势点取该重量下最大 `reps`；
- 不跨不同重量混合比较。

### 05F — BODYWEIGHT_PLUS Statistics

适用于：

```text
loadMode = BODYWEIGHT_PLUS
```

至少提供：

- [ ] 训练次数；
- [ ] 最大额外负重；
- [ ] 自重状态下最佳次数；
- [ ] 自重状态下次数趋势；
- [ ] 指定额外负重下最佳次数；
- [ ] 指定额外负重下次数趋势。

语义：

```text
load = undefined/null → 自重
load = 5              → 自重 +5kg
```

禁止把自重 Record 显示为 `0kg`。

V1 不把人体体重加入负重，也不计算“自重 + 人体体重”的总负荷。

### 05G — ASSISTANCE Statistics

适用于：

```text
loadMode = ASSISTANCE
```

至少提供：

- [ ] 训练次数；
- [ ] 历史最低辅助重量；
- [ ] 辅助重量趋势；
- [ ] 指定辅助重量下最佳次数；
- [ ] 指定辅助重量下次数趋势。

每个 Session 的辅助重量趋势点：

```text
point = 当次该 Exercise 使用过的最小 assistance load
```

UI 必须明确：

> **辅助重量下降通常表示进步。**

禁止：

- 把辅助重量上升显示成力量 PR；
- 对 ASSISTANCE 计算 Epley 1RM。

### 05H — Reps-only Statistics

适用于主要有效字段为 reps、且不属于 EXTERNAL / BODYWEIGHT_PLUS / ASSISTANCE 重量比较场景的 Exercise。

至少提供：

- [ ] 训练次数；
- [ ] 单条 Record 历史最高次数；
- [ ] 每次 Session 最佳次数趋势；
- [ ] 原始历史入口或可返回历史详情。

每个 Session：

```text
point = max(reps)
```

### 05I — Cardio Statistics

适用于 duration / distance / speed / incline 等有氧字段。

根据 Exercise 实际历史数据和当前 Schema 合理展示：

- [ ] 训练次数；
- [ ] 累计 duration；
- [ ] 单次 Session 最长 duration；
- [ ] duration 趋势；
- [ ] 如果存在 distance：累计距离 / 距离趋势；
- [ ] 如果存在 speed：速度趋势；
- [ ] 如果存在 incline：坡度趋势。

V1 聚合规则：

```text
Session duration point
= 该 Session 中该 Exercise 全部 Record.duration 之和

Session distance point
= 该 Session 中该 Exercise 全部 Record.distance 之和

Session speed point
= 该 Session 中该 Exercise 全部有效 speed 的最大值

Session incline point
= 该 Session 中该 Exercise 全部有效 incline 的最大值
```

如果某字段没有历史数据，不显示对应无意义图表。

V1 不强迫所有有氧动作共享同一套指标卡。

### 05J — Charts / Mobile UX

- [ ] 折线图按真实日期正序；
- [ ] 同一天多次 Session 时保持稳定时间顺序；
- [ ] 图表单位明确；
- [ ] 空数据 / 单点数据不会报错；
- [ ] 手机窄屏不产生整页横向滚动；
- [ ] 图表 Tooltip 在触屏上可使用；
- [ ] 固定重量选择器适合单手点击；
- [ ] 年度热力图在 iPhone PWA 中可浏览；
- [ ] archived 状态不影响历史图表读取；
- [ ] 统计页不阻塞训练主流程。

图表只负责展示统计模块返回的数据，不在组件内部重新实现统计公式。

---

## 6. Acceptance Criteria

Plan 05 完成时，用户必须能够：

1. 在“统计”Tab 看到今年训练次数；
2. 看到今年可计算训练总时长；
3. 看到本月训练次数；
4. 看到本月可计算训练总时长；
5. 未完成 Session 计入次数但不伪造时长；
6. 跨午夜 Workout 时长正确参与汇总；
7. 看到当前年份 GitHub 风格训练热力图；
8. 有训练日 active、无训练日 inactive；
9. 点击训练日查看当天 Session 并进入训练详情；
10. 搜索并打开任意 Active / Archived Exercise 的统计；
11. EXTERNAL 动作看到最高重量与训练次数；
12. EXTERNAL + reps 动作看到 Epley 估算 1RM 与趋势；
13. 可以选择固定重量查看最佳次数趋势；
14. BODYWEIGHT_PLUS 正确区分“自重”和“额外负重”；
15. ASSISTANCE 显示最低辅助重量，并明确“越低通常越强”；
16. ASSISTANCE 不计算 1RM；
17. 纯次数动作显示最佳次数趋势；
18. Cardio 显示累计时长、最长单次 Session 与相应趋势；
19. Exercise 改名后统计仍归属于同一个 exerciseId；
20. Exercise archived 后历史统计仍存在；
21. 修改或删除历史 Workout / Record 后统计重新查询即更新；
22. Statistics 不新增权威统计表，不修改数据库 schema v1；
23. 刷新 PWA 后统计与 IndexedDB 原始数据一致。

---

## 7. Required Test Scenarios

除 `AGENTS.md` 统一质量门禁外，本阶段至少覆盖：

### 7.1 Overview

准备：

```text
Session A  60min
Session B  23:20 → 00:35 = 75min
Session C  endTime missing
```

验证：

```text
训练次数 = 3
训练时长 = 135min
```

Session C 不贡献时长。

### 7.2 Heatmap

同一天创建两条 Session：

```text
2026-09-15 x2
```

验证：

- 9/15 只有一个 active 日期格；
- 点击后能看到两条 Session；
- 不把训练次数写入 Calendar 数据表。

### 7.3 EXTERNAL — 卧推

历史：

```text
30kg × 12
35kg × 12
40kg × 8
45kg × 4
40kg × 10
```

验证：

- max load = 45kg；
- Epley 对每条合法 Record 计算正确；
- Session 趋势取当次最高 estimated1RM；
- 40kg 固定重量最佳 reps = 10；
- 40kg 趋势不混入 35kg / 45kg。

### 7.4 BODYWEIGHT_PLUS — 反向山羊

历史：

```text
自重 × 20
自重 × 22
+5kg × 10
+5kg × 12
```

验证：

- 自重最佳 = 22；
- 最大额外负重 = 5kg；
- +5kg 最佳 reps = 12；
- `null load` 不显示成 0kg。

### 7.5 ASSISTANCE — 辅助引体

历史：

```text
55kg辅助 × 10
50kg辅助 × 8
45kg辅助 × 6
```

验证：

- minimum assistance = 45kg；
- 趋势方向语义正确；
- 不生成 1RM；
- 不把 55kg 当作比 45kg 更强。

### 7.6 Reps-only

历史：

```text
12
15
13
```

验证：

- single record max = 15；
- 每次 Session best reps 趋势正确。

### 7.7 Cardio — 爬坡

历史包含：

```text
坡度 12
速度 5
时间 40min
```

以及多段 Record。

验证：

- total duration 正确；
- per-session duration sum 正确；
- longest session 正确；
- speed / incline trend 按 V1 聚合规则正确。

### 7.8 Rename / Archive

同一 exerciseId：

- 改名；
- 归档。

验证：

- 统计历史不丢失；
- UI 使用当前 Exercise 名称；
- archived Exercise 仍可进入统计页。

### 7.9 Recalculation After Editing

先产生统计结果，再：

- 修改 Record；
- 删除 Record；
- 删除 Workout。

验证重新查询后：

- max / count / trend 立即变化；
- 无陈旧持久化统计。

### 7.10 Mobile E2E

至少覆盖：

```text
打开统计 Tab
→ 查看 Overview
→ 查看年度热力图
→ 点击一个训练日期
→ 进入 Workout Detail
→ 返回统计
→ 搜索“卧推”
→ 打开卧推统计
→ 切换 1RM / 最高重量 / 固定重量次数
→ 刷新
→ 页面仍正常
```

原 Plan 00–04 的 Unit / Integration / E2E 必须继续通过。

---

## 8. Out of Scope

Plan 05 明确不做：

- “最近进步”智能识别算法；
- AI 训练建议；
- 自动推荐下次重量 / 次数；
- 训练容量（Volume）作为全局核心指标；
- 跨 Exercise 比较总重量；
- 人体体重历史；
- BODYWEIGHT_PLUS 总系统重量估算；
- RPE / RIR；
- 心率；
- Apple Health / Health Connect；
- 云数据库；
- 多设备同步；
- OneDrive Sync；
- 分享统计图片；
- 社交排行榜；
- 自定义统计公式；
- 持久化 PR 表；
- 持久化 1RM；
- 持久化 Heatmap；
- 新数据库表；
- Plan 06 的 JSON Import / Export UI。

当前真机发现的通用 UI / 交互问题，可以单独修复；除非直接阻塞统计功能，否则不要借 Plan 05 扩大为全站 UI 重构。

---

## 9. Checklist

- [x] 05A — Statistics Domain / Query Foundation
- [x] 05B — Statistics Overview
- [x] 05C — Year Heatmap
- [x] 05D — Exercise Statistics Entry
- [x] 05E — EXTERNAL + Reps Statistics
- [x] 05F — BODYWEIGHT_PLUS Statistics
- [x] 05G — ASSISTANCE Statistics
- [x] 05H — Reps-only Statistics
- [x] 05I — Cardio Statistics
- [x] 05J — Charts / Mobile UX
- [x] Acceptance Criteria 全部满足
- [x] Required Test Scenarios 完成
- [x] Plan 00–04 Regression 全部通过
- [x] 数据库 schema version 仍为 `1`

通用测试、自审、文档同步、Commit、Push 与停止规则统一遵循根目录 `AGENTS.md`。

---

## 10. Next Stage

Plan 05 完成并经过人工验收后，理论上进入：

```text
Plan 06 — Import / Export
```

Plan 06 负责把 Plan 01 已存在的 Backup 能力正式暴露给用户：

- JSON Export；
- JSON Import；
- 导入前校验；
- 数据摘要；
- replace-all 原子恢复；
- lastBackupAt；
- 真实设备备份 / 恢复验收。

Plan 05 不提前实现 Plan 06。
