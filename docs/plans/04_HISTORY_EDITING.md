# Plan 04 — History & Editing

> 目标：把“训练”Tab升级为真正的训练首页，让用户按周查看历史训练、进入训练详情，并安全编辑或删除已经保存的训练。  
> 本阶段结束后，GymLog 的“记录 → 回看 → 修正”闭环完成。

## 1. Goal

Plan 04 的唯一核心目标：

> **让 WorkoutSession 从“训练中可记录”进一步变成“历史可浏览、详情可查看、错误可修正”。**

核心体验：

```text
训练首页
├─ 未完成训练 / 继续训练
├─ + 新建训练
│
├─ 本周
│   ├─ 9月15日 18:10–19:20  1h10min
│   └─ 9月13日 18:05–19:00  55min
│
├─ 上周
│   └─ ...
│
└─ 更早的周
    └─ ...

点击训练卡
→ 训练详情
→ 编辑
→ 修改日期 / 时间 / 动作 / Record / 顺序
→ 完成编辑

或者：
训练详情
→ 删除本次训练
→ 二次确认
→ 级联删除 Session / Block / Record
```

本阶段不做统计；只围绕原始历史训练数据工作。

---

## 2. Entry Criteria

进入 Plan 04 前必须满足：

- Plan 00 — Project Bootstrap：`PASS`；
- Plan 01 — Data Foundation：`PASS`；
- Plan 02 — Exercise Management：`PASS`；
- Plan 03 — Workout Logging：`PASS`；
- Plan 03 已提供可复用的：
  - WorkoutSession 创建/恢复；
  - Exercise Picker；
  - ExerciseBlock；
  - Schema-driven Record Editor；
  - Record 新增 / 修改 / 删除 / 复制；
  - Previous Performance；
  - Finish / Cancel；
- WorkoutSession / ExerciseBlock / ExerciseRecord 仍使用数据库 schema version `1`；
- 历史兼容规则以 `docs/DATA_MODEL.md` 9.5 为准；
- Agent 工作规则以仓库根目录 `AGENTS.md` 为准；
- Plan 04 开始时 working tree 应 clean，并与远端同步。

Plan 04 不得为了历史 UI 复制第二套 Workout 数据模型或第二套 RecordSchema。

---

## 3. Scope

本阶段只完成：

```text
训练 Tab
├─ History Home
│   ├─ 未完成训练入口
│   ├─ 新建训练
│   └─ 按周历史列表
│
├─ Workout Summary Card
│
├─ Workout Detail
│
├─ Historical Edit Mode
│   ├─ Session 字段
│   ├─ ExerciseBlock
│   ├─ ExerciseRecord
│   └─ 顺序调整
│
└─ Delete Workout
```

### 3.1 周分组规则

V1 使用**本地自然周，周一到周日**。

显示规则：

- 当前自然周：`本周`
- 上一个自然周：`上周`
- 更早的周：显示日期范围，例如 `9月1日–9月7日`
- 跨年时日期范围必须包含年份，避免歧义

`trainingWeek` 不入库。

不得为了显示周标题给 WorkoutSession 新增持久化周编号。

### 3.2 历史与未完成训练

`endTime` 为空的 WorkoutSession 仍然属于真实数据：

- 不伪造结束时间；
- 不伪造训练时长；
- 在训练首页提供明确的“未完成训练”状态；
- 可以继续进入 Plan 03 的训练工作区；
- 可以进入详情并补写结束时间；
- 多个未完成 Session 不得静默合并或覆盖。

---

## 4. Tasks

### 04A — History Query / Weekly Grouping

- [ ] 在 Application / Query 层提供训练历史查询能力；
- [ ] 按 `WorkoutSession.date` 倒序获取训练；
- [ ] 同一天存在多次训练时，使用开始时间 / createdAt 保持稳定倒序；
- [ ] 批量获得每次训练对应的 ExerciseBlock 与 Exercise 名称摘要；
- [ ] 避免 React 每次重渲染都做全库重复扫描；
- [ ] 按本地周一–周日分组；
- [ ] 当前周显示“本周”，上一周显示“上周”，更早显示日期范围；
- [ ] 不持久化派生周分组结果；
- [ ] archived Exercise 仍可通过历史引用正常解析名称；
- [ ] Exercise 改名后，历史摘要使用当前 Exercise 名称。

历史查询应该通过 Application / Repository / Query Service 完成，UI 不直接操作 Dexie Table。

### 04B — Training Home / History List

将“训练”Tab升级为默认训练首页。

- [ ] 顶部保留容易触达的“新建训练”入口；
- [ ] 如果存在未完成训练，优先显示“未完成训练 / 继续训练”区域；
- [ ] 已完成与历史 Session 按周显示；
- [ ] 每个 Workout Card 整体可点击；
- [ ] 每张卡至少显示：
  - 日期；
  - 开始时间；
  - 结束时间；
  - 派生训练时长（仅时间完整时）；
  - 未填写结束时间状态；
  - 按真实 Block 顺序生成的动作名称摘要；
- [ ] 没有任何历史训练时显示明确空状态；
- [ ] 周内训练按时间倒序；
- [ ] 周分组按日期倒序；
- [ ] 长动作名不会破坏移动端布局。

推荐卡片语义：

```text
9月11日
18:17 – 19:46 · 1h29min

卧推 · 上斜卧推 · 双力臂 · 举腿 · 快走
```

未填写结束时间：

```text
9月9日
20:07 – --
未填写结束时间

直臂下压 · 坐姿划船 · 高位下拉 · ...
```

动作摘要可以在视觉上截断，但不得修改底层真实 Block 顺序。

### 04C — Workout Detail

点击 Workout Card 进入训练详情。

详情页至少显示：

- [ ] 日期；
- [ ] 开始时间；
- [ ] 结束时间；
- [ ] 实时派生训练时长；
- [ ] 如果结束时间为空，明确显示“未填写结束时间”；
- [ ] 按 `ExerciseBlock.order` 显示全部动作；
- [ ] 每个动作按 `ExerciseRecord.order` 显示全部原始 Record；
- [ ] BODYWEIGHT_PLUS 正确显示“自重 / +Nkg”；
- [ ] ASSISTANCE 正确显示“辅助重量”；
- [ ] 有氧字段按实际存在字段显示；
- [ ] side 按左 / 右 / 双侧显示；
- [ ] 历史 Record 显示**实际存在的字段**，不能因为 Exercise 当前 Schema 改变而隐藏历史数据；
- [ ] archived Exercise 仍正常显示；
- [ ] Exercise 改名后详情使用当前名称；
- [ ] 已存在的 session / block / record note 如果有，详情应可读展示；
- [ ] 提供“编辑”入口；
- [ ] 提供“删除本次训练”入口。

详情显示层应尽量复用统一 Record formatter，不在多个页面重复拼接训练语义。

### 04D — Historical Edit Mode

历史编辑尽量复用 Plan 03 的训练编辑组件，而不是创建另一套 Workout Editor。

编辑历史 Workout 时支持：

- [ ] 修改 `date`；
- [ ] 修改 `startTime`；
- [ ] 修改 `endTime`；
- [ ] `endTime` 允许清空；
- [ ] 已完成训练可以重新变为“未填写结束时间”状态；
- [ ] 未完成训练可以补写结束时间；
- [ ] 添加 ExerciseBlock；
- [ ] 删除 ExerciseBlock；
- [ ] 同一 Exercise 仍允许出现多次；
- [ ] 新增 ExerciseRecord；
- [ ] 编辑已有 ExerciseRecord；
- [ ] 删除 ExerciseRecord；
- [ ] 复制上一条 Record；
- [ ] 新增 Block / Record 时继续使用当前 Exercise 的 `RecordSchema + LoadMode`；
- [ ] 编辑过程使用现有 Repository / Application 层，不从 UI 直接操作 Dexie；
- [ ] 完成编辑后返回训练详情并显示最新数据。

历史编辑采用现有 Local-first 持久化方式。

不要求实现复杂“取消全部修改 / 回滚整个编辑会话”机制；破坏性操作通过确认保护。

### 04E — Historical Compatibility / Reorder

这一部分是 Plan 04 的关键数据保护要求。

#### 已有历史 Record

编辑历史 Record 时必须遵守 `DATA_MODEL.md` 的历史兼容规则：

- [ ] Record 已经存在的字段按字段自身类型 / 数值范围校验；
- [ ] 即使某字段已被当前 Exercise Schema 改成 `DISABLED`，历史中真实存在的该字段仍要显示并保留；
- [ ] 保存其他修改时不得静默删除 legacy 字段；
- [ ] 当前 Schema 后来新增的 REQUIRED 字段，不得强迫旧 Record 补写过去不存在的数据；
- [ ] 用户给旧 Record **新增新字段**时，新字段必须遵循当前 Schema；
- [ ] 修改 Exercise Schema 不得自动改写历史 Record。

示例：

```text
旧记录：
悬垂举腿
reps = 12

后来 Schema 改为：
reps REQUIRED
load OPTIONAL

编辑旧记录时：
12 次仍然合法
不要求补 load
```

另一个例子：

```text
旧记录真实包含 speed
后来当前 Schema 已不再记录 speed

历史详情仍显示 speed
修改 reps / duration 时不得把旧 speed 静默删除
```

#### 顺序调整

- [ ] 支持调整 ExerciseBlock 顺序；
- [ ] 支持调整同一 Block 内 ExerciseRecord 顺序；
- [ ] V1 使用简单明确的移动方式即可，例如“上移 / 下移”；
- [ ] 不要求引入 Drag & Drop 依赖；
- [ ] 调整后同一父级下 `order` 重新归一为连续的 `0..n-1`；
- [ ] 顺序更新应该通过 Application / Repository 完成，并有测试保护。

### 04F — Delete Workout

历史详情允许删除整次 WorkoutSession。

- [ ] 删除前必须二次确认；
- [ ] 确认文案明确说明会删除本次训练及其中全部动作记录；
- [ ] 通过 Plan 01 已有事务级级联删除：
  - WorkoutSession
  - ExerciseBlock[]
  - ExerciseRecord[]
- [ ] 删除失败时不能留下半残数据；
- [ ] 删除 Workout 不删除 Exercise / ExerciseFamily；
- [ ] 删除完成后返回训练首页；
- [ ] 列表立即反映删除结果；
- [ ] 不实现回收站 / 撤销删除。

Plan 03 的“放弃当前训练”和 Plan 04 的“删除历史训练”可以复用底层删除能力，但产品入口语义应清晰区分。

### 04G — Navigation / Mobile UX

- [ ] 训练首页 → 详情 → 编辑 → 详情 → 首页 的返回路径稳定；
- [ ] 未完成训练可以从首页继续进入训练工作区；
- [ ] 新建训练入口始终容易触达；
- [ ] 编辑页不因底部导航 / safe-area 遮挡最后一条 Record；
- [ ] 训练卡在窄屏下无横向滚动；
- [ ] 删除等危险操作与普通操作有足够视觉区分；
- [ ] 长列表滚动稳定；
- [ ] 返回上一页不丢失已经合法持久化的修改；
- [ ] 浏览历史时不会误进入“当前训练计时器”之类不存在的状态。

---

## 5. Acceptance Criteria

Plan 04 完成时，用户必须能够：

1. 打开“训练”Tab看到按周分组的训练历史；
2. 当前周显示“本周”，上一周显示“上周”；
3. 更早训练按自然周日期范围显示；
4. 同一周内最新训练排在最上面；
5. 训练卡显示日期、时间、派生时长和动作摘要；
6. 未填写 `endTime` 的训练明确显示“未填写结束时间”，不伪造时长；
7. 从首页继续任意未完成训练；
8. 点击训练卡进入完整训练详情；
9. 在详情中看到全部 ExerciseBlock / ExerciseRecord 原始数据；
10. archived / renamed Exercise 的历史仍然正确显示；
11. 编辑历史训练的日期、开始时间、结束时间；
12. 在历史训练中新增 / 删除动作；
13. 在历史训练中新增 / 编辑 / 删除 / 复制 Record；
14. 同一个 Exercise 在历史 Session 中仍可以出现多个 Block；
15. 调整 ExerciseBlock 顺序并持久化；
16. 调整 ExerciseRecord 顺序并持久化；
17. 编辑旧 Record 时不因当前 Schema 改变而丢失历史字段；
18. 当前 Schema 新增 REQUIRED 字段不会强迫旧 Record 补历史数据；
19. 删除整次训练需要二次确认；
20. 删除整次训练后 Session / Block / Record 全部被事务级删除；
21. 删除训练不会删除 Exercise；
22. 刷新页面后历史列表、详情与编辑结果仍然正确；
23. 全过程数据库 schema version 保持 `1`，除非发现真实上游阻塞并人工批准变更。

---

## 6. Required Test Scenarios

除 `AGENTS.md` 统一质量门禁外，本阶段必须至少覆盖：

### 6.1 Weekly History

准备训练：

```text
本周：
9月15日
9月13日

上周：
9月11日
9月9日
```

验证：

- 本周 / 上周分组正确；
- 周内倒序正确；
- 周间倒序正确；
- 不写入 trainingWeek。

### 6.2 Completed Workout Card

```text
2026-09-11
18:17–19:46
```

验证：

```text
duration = 89min
```

并显示动作摘要。

### 6.3 Incomplete Workout

```text
2026-09-09
20:07
endTime = undefined
```

验证：

- 显示“未填写结束时间”；
- 不显示虚假 duration；
- 可以继续训练或进入编辑补写结束时间。

### 6.4 Cross-midnight

```text
23:20 → 00:35
```

详情和历史卡均显示：

```text
75min
```

### 6.5 Exercise Rename / Archive

历史 Block 引用同一个 exerciseId。

验证：

- Exercise 改名后历史显示新名称；
- Exercise archived 后历史仍可查看；
- 不复制历史名称快照。

### 6.6 Historical Schema Compatibility

建立旧 Record：

```text
reps = 12
```

然后把 Exercise 当前 Schema 改成：

```text
reps REQUIRED
load OPTIONAL
```

验证：

- 旧 Record 仍可进入编辑；
- 不强制补 `load`；
- 修改 reps 后可保存。

再建立历史 legacy 字段场景：

- 当前 Schema 已 DISABLED 某字段；
- 旧 Record 仍真实存在该字段；

验证修改其他字段后 legacy 字段仍保留。

### 6.7 Historical Editing

对一条已完成 Workout：

- 修改日期；
- 修改 startTime / endTime；
- 添加 ExerciseBlock；
- 同一 Exercise 再次添加；
- 删除一个 Block；
- 新增 Record；
- 编辑 Record；
- 复制 Record；
- 删除 Record；

刷新后全部持久化正确。

### 6.8 Reorder

Workout：

```text
卧推
举腿
爬坡
```

调整为：

```text
卧推
爬坡
举腿
```

验证 order：

```text
0, 1, 2
```

同样测试 Record 顺序调整。

### 6.9 Delete Workout Cascade

建立：

```text
1 WorkoutSession
3 ExerciseBlock
多条 ExerciseRecord
```

删除 Workout。

验证：

- Session 不存在；
- 所属 Block 全不存在；
- 所属 Record 全不存在；
- Exercise 仍存在；
- 事务失败时不产生半删除状态。

### 6.10 Mobile E2E

至少完成一个真实移动端路径：

```text
通过 Plan 03 创建并完成一条训练
→ 回到训练首页
→ 在“本周”看到训练
→ 点击进入详情
→ 进入编辑
→ 修改结束时间或一条 Record
→ 调整一个动作顺序
→ 完成编辑
→ 刷新
→ 修改仍存在
→ 删除训练
→ 二次确认
→ 返回首页
→ 训练卡消失
```

原 Plan 00–03 的既有 E2E / Unit / Integration 测试必须继续通过。

---

## 7. Out of Scope

Plan 04 明确不做：

- 年度训练热力图；
- 今年 / 本月训练次数与时长；
- PR / 1RM / 最大重量；
- 单动作成长折线图；
- 最近进步算法；
- 历史按动作搜索；
- 历史高级筛选；
- 日历视图；
- “训练第 N 周”持久化；
- Workout Template；
- 复制整次训练；
- 回收站 / Undo Delete；
- JSON Import / Export UI；
- OneDrive / 云同步；
- 后端服务；
- 新的数据库表；
- 为统计预存派生结果。

已有 note 在详情中可以显示；如果 Plan 03 尚未提供 note 创建/编辑 UI，本阶段不为了 note 单独扩展复杂编辑器。

---

## 8. Checklist

- [x] 04A — History Query / Weekly Grouping
- [x] 04B — Training Home / History List
- [x] 04C — Workout Detail
- [x] 04D — Historical Edit Mode
- [x] 04E — Historical Compatibility / Reorder
- [x] 04F — Delete Workout
- [x] 04G — Navigation / Mobile UX
- [x] Acceptance Criteria 全部满足
- [x] Required Test Scenarios 完成
- [x] Plan 00–03 Regression 全部通过
- [x] 数据库 schema version 仍为 `1`（若无人工批准的变更）

通用测试、自审、文档同步、Commit、Push 与停止规则统一遵循仓库根目录 `AGENTS.md`。

---

## 9. Next Stage

Plan 04 完成并经过人工验收后，理论上进入：

```text
Plan 05 — Statistics
```

Plan 05 才开始实现：

- 今年 / 本月训练次数；
- 训练时长；
- GitHub Contribution 风格年度训练热力图；
- 单 Exercise 趋势；
- 最大重量；
- 固定重量最佳次数；
- 估算 1RM；
- ASSISTANCE / 纯次数 / 有氧对应统计。

Plan 04 不提前实现这些内容。
