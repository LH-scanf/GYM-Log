# Plan 01 — Data Foundation

> 目标：把 `DATA_MODEL.md` 落为可测试、可迁移、可完整备份和恢复的本地数据层。  
> 完成本阶段后，GymLog 才拥有可信的“数据地基”。

## 1. 范围

本阶段实现：

```text
IndexedDB
  ↓
Dexie schema v1
  ↓
Repository
  ↓
事务 / 约束 / 索引
  ↓
Backup DTO + Validation
```

本阶段不做正式训练 UI。

---

## 2. 数据源原则

必须遵守：

> 原始训练记录是唯一权威数据。

因此不建立以下持久化表：

```text
PersonalRecord
MonthlyStats
ExerciseStats
HeatmapCache
Estimated1RMHistory
```

这些全部属于未来运行时派生数据。

允许存在内存缓存，但缓存可以随时删除和重建。

---

## 3. Task 01A — 定义 Domain Types

优先建立纯 TypeScript 类型，不依赖 Dexie。

核心实体：

```text
ExerciseFamily
Exercise
WorkoutSession
ExerciseBlock
ExerciseRecord
AppSettings
```

同时定义：

```text
FieldRequirement
LoadMode
Side
RecordSchema
```

关键规则：

### FieldRequirement

```text
DISABLED
OPTIONAL
REQUIRED
```

### LoadMode

```text
NONE
EXTERNAL
BODYWEIGHT_PLUS
ASSISTANCE
```

固定单位：

```text
load      kg
speed     km/h
duration  min
distance  km
reps      integer
incline   number
```

### 验收

类型可以完整表达：

- 卧推；
- 仰卧起坐（自重或 +5kg）；
- 反向山羊挺身；
- 辅助引体；
- 悬垂举腿；
- 爬坡；
- 快走。

---

## 4. Task 01B — Dexie Database v1

建立正式数据库类，例如：

```text
GymLogDatabase
```

表：

```text
exerciseFamilies
exercises
workoutSessions
exerciseBlocks
exerciseRecords
settings
```

索引至少覆盖：

```text
WorkoutSession.date
ExerciseBlock.sessionId
ExerciseBlock.exerciseId
[ExerciseBlock.sessionId + ExerciseBlock.order]
[ExerciseBlock.exerciseId + ExerciseBlock.sessionId]
ExerciseRecord.exerciseBlockId
[ExerciseRecord.exerciseBlockId + ExerciseRecord.order]
```

具体定义以 `DATA_MODEL.md` 为准。

### 约束

- `order` 只保证同父级内顺序；
- ID 使用稳定字符串 ID；
- 不以名称作为主键；
- Exercise 改名不改变 ID；
- 历史记录只通过 `exerciseId` 引用 Exercise。

---

## 5. Task 01C — Repository API

UI 不允许直接调用 Dexie table。

至少建立：

```text
ExerciseFamilyRepository
ExerciseRepository
WorkoutRepository
SettingsRepository
BackupRepository / BackupService
```

建议方法按业务语义，而不是简单复制 CRUD：

```text
createExercise()
renameExercise()
archiveExercise()
restoreExercise()
canHardDeleteExercise()

createWorkoutSession()
updateWorkoutTime()
addExerciseBlock()
removeExerciseBlock()
addExerciseRecord()
updateExerciseRecord()
removeExerciseRecord()
deleteWorkoutSession()

getWorkoutById()
listWorkoutSessionsByDateRange()
listExerciseHistory()
```

Repository 层负责保证跨表规则。

---

## 6. Task 01D — 级联删除与归档

### 删除 WorkoutSession

必须在单一事务内删除：

```text
WorkoutSession
  + ExerciseBlock[]
  + ExerciseRecord[]
```

禁止留下孤儿记录。

### 删除 ExerciseBlock

必须同时删除其 ExerciseRecord。

### Exercise

如果存在历史引用：

```text
禁止硬删除
允许 archived = true
```

只有完全没有历史引用时才允许 hard delete。

### ExerciseFamily

如果仍被 Exercise 引用，禁止硬删除。

---

## 7. Task 01E — Schema 驱动的数据验证

建立统一验证函数，例如：

```text
validateExerciseRecord(exercise, record)
```

必须能够验证：

- REQUIRED 字段存在；
- DISABLED 字段不能意外进入新记录；
- `reps` 为正整数；
- 数值字段为有限数值；
- 负荷语义与 LoadMode 一致；
- `BODYWEIGHT_PLUS` 的 `load = undefined/null` 合法；
- `ASSISTANCE` 必须按辅助重量语义保存；
- `side` 仅在动作启用时允许使用。

说明：

历史记录读取时应有兼容策略，不能因为后来 Exercise Schema 修改就让旧记录无法显示。

---

## 8. Task 01F — Workout 时间规则

`WorkoutSession` 至少保存：

```text
date
startTime?
endTime?
```

时间由用户手动输入。

规则：

- startTime 可以缺失；
- endTime 可以缺失；
- 未填写 endTime 的训练仍是合法数据；
- 跨午夜时，如果 `endTime < startTime`，按次日结束解释；
- 训练时长是派生值，不作为权威字段保存。

需要纯函数：

```text
calculateWorkoutDuration()
```

并覆盖单元测试。

---

## 9. Task 01G — Settings v1

V1 Settings 保持极小。

建议只保存当前真正有持久化意义的字段：

```text
id = "app"
lastBackupAt?
```

如果后续 UI 需要新的设置，再通过数据库 migration 增加。

不要为了“以后可能会用”提前塞大量配置。

---

## 10. Task 01H — JSON Backup v1

建立独立 Backup DTO，不能直接把 Dexie 内部对象随手 `JSON.stringify` 当正式格式。

顶层格式：

```text
version
exportedAt
data
  exerciseFamilies
  exercises
  workoutSessions
  exerciseBlocks
  exerciseRecords
  settings
```

目标：

> 一个 JSON 文件可以完整重建同一份 GymLog 原始数据。

### 导出要求

- 保留稳定 ID；
- 保留顺序；
- 保留归档状态；
- 不导出运行时统计缓存；
- JSON 可读且有版本号。

---

## 11. Task 01I — Backup 导入验证

导入前必须先完整验证，不允许边解析边破坏当前数据库。

至少检查：

- Backup version 支持；
- 顶层结构完整；
- ID 唯一；
- 所有外键可解析；
- ExerciseBlock 的 sessionId / exerciseId 存在；
- ExerciseRecord 的 exerciseBlockId 存在；
- Record 字段类型合法；
- Settings 合法。

非法备份：

```text
直接拒绝
当前数据库保持不变
```

---

## 12. Task 01J — 原子恢复

导入采用事务式 replace：

```text
解析 JSON
  ↓
完整验证
  ↓
开始事务
  ↓
清空旧业务数据
  ↓
写入 Backup 数据
  ↓
提交
```

中途失败必须 rollback。

禁止出现：

```text
旧数据删了一半
新数据导入了一半
```

这种状态。

---

## 13. Task 01K — Migration 骨架

即使 v1 只有一个数据库版本，也从第一版建立迁移意识。

要求：

- Dexie schema version 显式声明；
- 数据库版本和 Backup format version 分离；
- 后续增加字段时通过 upgrade/migration；
- 禁止通过删除数据库解决正式版本升级。

至少加入一份测试，证明 migration 测试基础设施可以运行。

---

## 14. Task 01L — 数据层测试

必须覆盖的测试：

### Exercise

- 新建；
- 改名后历史引用仍有效；
- 有历史记录时不能 hard delete；
- archive / restore。

### Workout

- 创建 Session；
- start/end 可缺失；
- 同一 Exercise 可以出现两个 Block；
- Record 顺序稳定；
- 删除 Block 会删除 Record；
- 删除 Session 无孤儿数据。

### RecordSchema

- REQUIRED；
- OPTIONAL；
- DISABLED；
- EXTERNAL；
- BODYWEIGHT_PLUS；
- ASSISTANCE。

### Time

- 普通训练时长；
- endTime 缺失；
- 跨午夜。

### Backup

- 导出 -> 清库 -> 导入 -> 数据完全等价；
- 非法外键备份拒绝；
- 不支持版本拒绝；
- 导入失败不破坏现有数据。

---

## 15. 建议的 Fixture

测试不要只用 `foo/bar`。

至少包含真实场景 fixture：

```text
卧推
40kg × 8
40kg × 10
45kg × 4

反向山羊挺身
自重 × 20
+5kg × 10

辅助引体向上
50kg辅助 × 10
45kg辅助 × 8

爬坡
坡度12 / 5km/h / 40min
```

这样数据模型一旦表达不自然，测试阶段就能暴露。

---

## 16. 明确不做

01 阶段不实现：

- 正式动作管理 UI；
- 正式训练录入 UI；
- 图表；
- 1RM 展示；
- Heatmap；
- CSV；
- OneDrive；
- 云同步；
- 登录系统。

---

## 17. 完成门禁

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

并满足：

- [ ] 六张表 schema v1 工作；
- [ ] Repository 不泄漏 Dexie 到 UI；
- [ ] 真实动作场景均可表达；
- [ ] 级联删除正确；
- [ ] 归档规则正确；
- [ ] Workout 时间规则正确；
- [ ] Backup v1 可以无损 round-trip；
- [ ] 非法导入不会破坏当前数据库；
- [ ] 数据层测试通过；
- [ ] 刷新页面后数据库内容仍存在。

完成后才进入 `02_EXERCISE_MANAGEMENT.md`。
