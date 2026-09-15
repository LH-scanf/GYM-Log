# Plan 02 — Exercise Management

> 目标：在 Plan 01 数据基础之上完成 GymLog 的“动作字典”。  
> 本阶段结束后，用户可以创建、组织、编辑、归档和恢复 Exercise；仍不能创建正式训练记录。

## 1. Entry Criteria

进入 Plan 02 前：

- Plan 00、Plan 01 已完成并人工验收；
- Data Foundation 的 Domain / Repository / Validation 可直接复用；
- 项目文档已纳入 Git，working tree clean；
- 当前数据库仍为 schema v1。

产品规则以 `../SPEC.md` 为准，数据规则以 `../DATA_MODEL.md` 为准，统一 Agent 工作方式以根目录 `AGENTS.md` 为准。

---

## 2. Scope

本阶段只完成：

```text
动作 Tab
├─ Exercise 列表 / 搜索
├─ ExerciseFamily 最小管理
├─ 新建 Exercise
├─ 编辑 Exercise
├─ RecordSchema / LoadMode 配置
└─ Archive / Restore / Delete Protection
```

核心原则：

- `ExerciseFamily` 只是组织层；
- `Exercise.familyId` 可为空；
- 表现不可直接比较的变式拆成独立 Exercise；
- Schema 使用 `DISABLED / OPTIONAL / REQUIRED`；
- LoadMode 使用 `NONE / EXTERNAL / BODYWEIGHT_PLUS / ASSISTANCE`；
- Exercise 改名保持同一个 ID；
- Schema 修改不迁移历史 Record；
- 有历史引用的 Exercise 禁止 hard delete；
- 非空 Family 禁止 hard delete；
- 同名允许存在，但 UI 给出非阻塞警告。

---

## 3. Tasks

### 02A — Exercise List

- [ ] 将“动作”Tab 从占位页升级为正式列表；
- [ ] 默认只显示 `archived = false` 的 Exercise；
- [ ] 按 Family 分组；`familyId = null` 进入“未分组”；
- [ ] 支持按 Exercise 名称搜索；合理时同时匹配 Family 名称；
- [ ] 显示由 `RecordSchema + LoadMode` 推导的简洁摘要；
- [ ] 提供空状态、新建入口、已归档入口；
- [ ] 刷新后数据仍从真实 IndexedDB 恢复。

摘要示例：

```text
卧推              重量 · 次数
辅助引体向上      辅助重量 · 次数
爬坡              坡度 · 速度 · 时间
```

摘要不能额外持久化。

### 02B — ExerciseFamily

- [ ] 创建 Family；
- [ ] 改名 Family；
- [ ] 在 Exercise 编辑器中选择 Family / 未分组；
- [ ] 支持从 Exercise 表单快速新建 Family；
- [ ] 只允许删除空 Family；
- [ ] 同名 Family 给出非阻塞警告，不自动合并。

Family V1 只需要 `name`；不做复杂管理后台。

### 02C — Exercise Create / Edit

表单至少支持：

```text
name
familyId?
recordSchema
loadMode
```

- [ ] name `trim()` 后不能为空；
- [ ] 创建和编辑复用同一套 Domain 约束；
- [ ] 改名保持 `exerciseId` 不变；
- [ ] 可以在 Family 间移动，也可以变为未分组；
- [ ] 同名 Exercise 只警告，不禁止保存；
- [ ] UI 不直接调用 Dexie Table。

### 02D — RecordSchema / LoadMode Editor

UI 中文语义：

```text
DISABLED → 不记录
OPTIONAL → 可选
REQUIRED → 必填
```

支持字段：

```text
load
reps
duration
distance
speed
incline
side
```

规则：

- [ ] 至少一个记录字段启用；
- [ ] `load = DISABLED` 时隐藏重量类型，并保持 `loadMode = NONE`；
- [ ] `load != DISABLED` 时可选：普通负重 / 自重+额外负重 / 辅助重量；
- [ ] 保存必须经过 Plan 01 的 Domain Validation；
- [ ] 修改 Schema 只影响后续录入，不修改旧 ExerciseRecord。

### 02E — Archive / Restore / Delete

- [ ] Exercise 可归档；
- [ ] 归档后默认列表隐藏，历史引用保持有效；
- [ ] 已归档页面可以恢复；
- [ ] 无历史引用的 Exercise 允许永久删除；
- [ ] 有 ExerciseBlock 历史引用时永久删除必须失败，并引导用户归档；
- [ ] 删除/归档等危险操作有明确确认和用户可理解的错误信息。

### 02F — Mobile-first UX

- [ ] 窄屏无横向滚动；
- [ ] 触控区域符合现有规范；
- [ ] 表单、Dialog/Sheet 不超出 viewport；
- [ ] iPhone safe-area 与底部导航不遮挡内容；
- [ ] 长动作名可正常显示；
- [ ] Loading / Empty / Error State 完整。

本阶段不追求复杂视觉系统；延续 Plan 00 已有风格即可。

---

## 4. Acceptance Criteria

Plan 02 完成时，用户必须能够：

1. 在“动作”Tab 查看真实动作数据；
2. 创建 Family：例如“反向山羊”；
3. 创建独立 Exercise：例如“反向山羊挺身 / 反向山羊举手”；
4. 创建未分组 Exercise：例如“卧推”；
5. 为 Exercise 配置正确 RecordSchema 与 LoadMode；
6. 编辑名称、Family、Schema，且 Exercise ID 保持稳定；
7. 修改 Schema 后已有历史 Record 完全不变；
8. 归档动作后默认列表隐藏，并可恢复；
9. 有历史记录的动作无法永久删除；
10. 非空 Family 无法永久删除；
11. 刷新或重启 PWA 后数据仍然存在。

数据库 schema version 应继续保持 `1`；若实现确实需要 migration，必须暂停并人工确认，而不是自行升级。

---

## 5. Required Test Scenarios

至少覆盖以下真实场景。

### 卧推

```text
family: none
load: REQUIRED
reps: REQUIRED
loadMode: EXTERNAL
```

验证创建、刷新恢复、改名 ID 不变。

### 反向山羊

```text
Family: 反向山羊
Exercise: 反向山羊挺身
Exercise: 反向山羊举手
```

验证同族不同 Exercise ID。

`反向山羊挺身`：

```text
load: OPTIONAL
reps: REQUIRED
loadMode: BODYWEIGHT_PLUS
```

### 高位下拉变式

分别创建：

```text
宽距正手高位下拉
窄距正手高位下拉
窄距反手高位下拉
```

验证它们是独立 Exercise，而不是 Record 标签。

### 辅助引体向上

```text
load: REQUIRED
reps: REQUIRED
loadMode: ASSISTANCE
```

### 爬坡

```text
duration: REQUIRED
incline: OPTIONAL
speed: OPTIONAL
load: DISABLED
loadMode: NONE
```

### 历史保护

构造：

```text
Exercise
→ WorkoutSession
→ ExerciseBlock
→ ExerciseRecord
```

然后验证：

- Exercise 改名后 ID 与历史引用不变；
- Schema 修改不改旧 Record；
- hard delete 失败；
- archive 成功；
- restore 成功。

### Family 删除保护

Family 仍有 Exercise 时删除失败；子 Exercise 移走后才允许删除。

### E2E

至少覆盖一条移动端完整路径：

```text
动作 Tab
→ 新建 Family“反向山羊”
→ 新建“反向山羊挺身”
→ reps REQUIRED + load OPTIONAL + BODYWEIGHT_PLUS
→ 保存
→ 列表可见
→ 刷新仍存在
→ 编辑改名
→ 保存
→ 新名称可见
```

并覆盖至少一个 archive → restore 路径。

---

## 6. Out of Scope

Plan 02 不实现：

- WorkoutSession 创建；
- 日期 / 开始时间训练表单；
- ExerciseRecord 训练录入；
- 添加/复制一组；
- 上一次训练表现；
- Workout 历史与编辑；
- Statistics / PR / 1RM / 热力图；
- JSON Import / Export UI；
- 云同步 / OneDrive / 后端；
- 预置大型动作库；
- 动作图片、视频、肌肉图、教学；
- AI 推荐；
- 拖拽排序。

本阶段只回答：

> “我的动作有哪些，以及每个动作以后应该记录什么？”

---

## 7. Checklist

- [ ] 02A Exercise List
- [ ] 02B ExerciseFamily
- [ ] 02C Exercise Create / Edit
- [ ] 02D RecordSchema / LoadMode Editor
- [ ] 02E Archive / Restore / Delete Protection
- [ ] 02F Mobile-first UX
- [ ] Acceptance Criteria 全部满足
- [ ] Required Test Scenarios 全部通过

通用测试门禁、自审、文档同步、Commit、Push 与最终报告规则统一由根目录 `AGENTS.md` 执行。

---

## 8. Next Stage

Plan 02 完成并人工验收后，才开始编写并审核：

```text
03_WORKOUT_LOGGING.md
```

Plan 02 内不得提前实现 Workout Logging。
