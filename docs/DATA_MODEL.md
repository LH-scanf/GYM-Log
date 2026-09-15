# GymLog — 数据模型（DATA_MODEL）

> 状态：Draft v0.1  
> 依赖：`SPEC.md`、`ARCHITECTURE.md`  
> 目标：冻结 V1 原始数据模型、实体关系、约束、索引和备份结构。

---

## 1. 数据建模原则

1. **原始记录优先**：训练事实入库，统计结果不作为权威数据入库。
2. **ID 稳定**：核心实体使用 UUID 字符串。
3. **历史可读**：动作归档/改名不能破坏历史。
4. **顺序显式保存**：动作顺序和组顺序不能依赖 IndexedDB 返回顺序。
5. **Schema 可演进**：Exercise 的 Schema 变化不能使旧记录失效。
6. **单位固定**：kg、km/h、min、km。
7. **导入可事务恢复**：Backup 可以完整重建本地数据库。

---

## 2. 实体关系

```text
ExerciseFamily
      │ 0..1
      │
      ▼
Exercise
      │
      │ 1
      ▼
ExerciseBlock ◄──────── WorkoutSession
      │                    1
      │ 1                  │
      ▼                    │
ExerciseRecord             │
                           │
      WorkoutSession 1 ────┘ N ExerciseBlock
```

关系解释：

- 一个 Exercise 可以不属于任何 ExerciseFamily；
- 一个 ExerciseFamily 可以包含多个 Exercise；
- 一个 WorkoutSession 有多个 ExerciseBlock；
- ExerciseBlock 指向一个 Exercise；
- 一个 Exercise 在同一 WorkoutSession 中可以出现多个 ExerciseBlock；
- 一个 ExerciseBlock 有多个 ExerciseRecord。

---

## 3. 通用类型

```ts
type UUID = string

type ISODateTime = string      // ISO 8601

type LocalDate = string        // YYYY-MM-DD

type LocalTime = string        // HH:mm
```

### 3.1 FieldRequirement

```ts
type FieldRequirement =
  | 'DISABLED'
  | 'OPTIONAL'
  | 'REQUIRED'
```

### 3.2 LoadMode

```ts
type LoadMode =
  | 'NONE'
  | 'EXTERNAL'
  | 'BODYWEIGHT_PLUS'
  | 'ASSISTANCE'
```

### 3.3 Side

```ts
type Side =
  | 'LEFT'
  | 'RIGHT'
  | 'BOTH'
```

---

## 4. ExerciseFamily

```ts
interface ExerciseFamily {
  id: UUID
  name: string
  description?: string
  archived: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

约束：

- `name.trim()` 不能为空；
- 同名允许技术上存在，但 UI 必须警告；
- 如果仍有 Exercise 引用，不能硬删除；
- 归档不影响历史显示。

推荐索引：

```text
id (primary key)
name
archived
```

---

## 5. RecordSchema

```ts
interface RecordSchema {
  reps: FieldRequirement
  load: FieldRequirement
  duration: FieldRequirement
  distance: FieldRequirement
  speed: FieldRequirement
  incline: FieldRequirement
  side: FieldRequirement
}
```

合法性：

- 至少一个字段不是 `DISABLED`；
- `load === DISABLED` 时，`loadMode` 应为 `NONE`；
- `load !== DISABLED` 时，`loadMode` 必须不是 `NONE`；
- `side` 不参与数值统计，只用于区分同一动作的一次记录侧别。

---

## 6. Exercise

```ts
interface Exercise {
  id: UUID
  name: string
  familyId?: UUID

  recordSchema: RecordSchema
  loadMode: LoadMode

  archived: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

### 6.1 familyId

```text
null / undefined
```

表示独立动作。

如果存在，必须引用有效 ExerciseFamily。

### 6.2 改名

历史不保存 `exerciseName` 快照。

```text
ExerciseBlock.exerciseId
        ↓
Exercise.name
```

因此改名后全局统一变化。

### 6.3 删除

如果存在任何 ExerciseBlock 引用：

```text
禁止硬删除
允许 archived = true
```

推荐索引：

```text
id (primary key)
name
familyId
archived
```

---

## 7. WorkoutSession

```ts
interface WorkoutSession {
  id: UUID
  date: LocalDate
  startTime?: LocalTime
  endTime?: LocalTime
  note?: string

  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

约束：

- `date` 必须是合法本地日期；
- `startTime` / `endTime` 如果存在，必须是 `HH:mm`；
- `endTime` 可以为空；
- 训练时长不入库，实时计算；
- `trainingWeek` 不入库，若未来需要按日期/配置派生。

### 7.1 duration 派生

普通情况：

```text
end >= start
```

直接相减。

如果采用跨午夜支持：

```text
end < start
```

解释为次日结束。

推荐索引：

```text
id (primary key)
date
createdAt
```

---

## 8. ExerciseBlock

```ts
interface ExerciseBlock {
  id: UUID
  sessionId: UUID
  exerciseId: UUID
  order: number
  note?: string

  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

说明：

- `order` 是同一 WorkoutSession 中的动作顺序；
- 同一个 exerciseId 可以在同一 sessionId 下出现多次；
- 不使用 `(sessionId, exerciseId)` 唯一约束。

约束：

- sessionId 必须存在；
- exerciseId 必须存在；
- order 为非负整数；
- 同一 session 内 order 应保持稳定可排序。

推荐索引：

```text
id (primary key)
sessionId
exerciseId
[sessionId+order]
[exerciseId+sessionId]
```

---

## 9. ExerciseRecord

```ts
interface ExerciseRecord {
  id: UUID
  exerciseBlockId: UUID
  order: number

  reps?: number
  load?: number
  duration?: number
  distance?: number
  speed?: number
  incline?: number
  side?: Side

  note?: string

  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

### 9.1 字段语义

```text
reps      次数，整数
load      kg
duration  min
distance  km
speed     km/h
incline   坡度数值
side      LEFT / RIGHT / BOTH
```

### 9.2 数值约束

建议 V1：

```text
reps      >= 0 且为整数
load      >= 0
duration  > 0
distance  >= 0
speed     >= 0
incline   >= 0
```

实际 UI 可以根据体验限制小数位，但数据库字段本质均为 number。

### 9.3 BODYWEIGHT_PLUS

```text
load = undefined/null  => 自重
load = 5               => 自重 + 5kg
```

不存人体体重。

### 9.4 ASSISTANCE

```text
load = 50
```

表示器械提供 50kg 辅助。

统计模块不能把它解释成普通外部负重。

### 9.5 历史兼容

历史 Record 不保存 RecordSchema 副本。

查看历史时：

- 显示 Record 实际存在的字段；
- 不因为当前 Exercise Schema 改变而隐藏历史字段。

编辑历史时：

- 已存在字段按类型/范围校验；
- 新增字段遵循当前 Schema；
- 以后新增的 REQUIRED 字段不能强迫旧 Record 补写历史不存在的数据。

推荐索引：

```text
id (primary key)
exerciseBlockId
[exerciseBlockId+order]
```

---

## 10. Settings

V1 设置量较少，但建议从第一版就使用单独表，而不是散落 localStorage。

```ts
interface AppSettings {
  id: 'app'
  lastBackupAt?: ISODateTime
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

未来可以增加：

```text
heatmapMode
firstTrainingDate
uiPreferences
```

但 V1 不预先塞入未使用字段。

---

## 11. Dexie Schema 草案

```ts
class GymLogDB extends Dexie {
  exerciseFamilies!: Table<ExerciseFamily, string>
  exercises!: Table<Exercise, string>
  workoutSessions!: Table<WorkoutSession, string>
  exerciseBlocks!: Table<ExerciseBlock, string>
  exerciseRecords!: Table<ExerciseRecord, string>
  settings!: Table<AppSettings, string>
}
```

V1 索引草案：

```text
exerciseFamilies
  id, name, archived

exercises
  id, name, familyId, archived

workoutSessions
  id, date, createdAt

exerciseBlocks
  id, sessionId, exerciseId,
  [sessionId+order],
  [exerciseId+sessionId]

exerciseRecords
  id, exerciseBlockId,
  [exerciseBlockId+order]

settings
  id
```

最终 Dexie `stores()` 字符串在实施时确定，并由 migration 测试锁定。

---

## 12. 级联删除规则

### 12.1 删除 WorkoutSession

必须事务删除：

```text
WorkoutSession
  ↓
ExerciseBlock[]
  ↓
ExerciseRecord[]
```

顺序可以由 Repository 处理，但必须一个事务完成。

### 12.2 删除 ExerciseBlock

必须删除：

```text
ExerciseBlock
  ↓
该 Block 的 ExerciseRecord[]
```

### 12.3 删除 Exercise

如果被任何 ExerciseBlock 引用：

```text
禁止硬删除
```

只能归档。

### 12.4 删除 ExerciseFamily

如果有 Exercise 引用：

```text
禁止硬删除
```

用户可以先解除动作族关系或归档该 Family。

---

## 13. 顺序字段策略

`ExerciseBlock.order` 和 `ExerciseRecord.order` 显式保存。

V1 最简单策略：

```text
0, 1, 2, 3...
```

调整顺序时，对同一父级下相关实体重新编号。

个人数据规模小，无需提前设计 fractional indexing。

---

## 14. 查询模型

数据库实体不等于 UI DTO。

### 14.1 WorkoutDetail DTO

查询层可以组装：

```ts
interface WorkoutDetail {
  session: WorkoutSession
  blocks: Array<{
    block: ExerciseBlock
    exercise: Exercise
    family?: ExerciseFamily
    records: ExerciseRecord[]
  }>
}
```

### 14.2 ExerciseHistory DTO

```ts
interface ExerciseHistoryEntry {
  session: WorkoutSession
  block: ExerciseBlock
  records: ExerciseRecord[]
}
```

### 14.3 Statistics DTO

统计 DTO 不持久化，例如：

```ts
interface ExerciseStrengthStats {
  maxLoad?: number
  estimated1RM?: number
  trainingCount: number
  recordCount: number
}
```

---

## 15. JSON Backup v1

顶层结构：

```ts
interface GymLogBackupV1 {
  format: 'gymlog-backup'
  version: 1
  exportedAt: ISODateTime
  data: {
    exerciseFamilies: ExerciseFamily[]
    exercises: Exercise[]
    workoutSessions: WorkoutSession[]
    exerciseBlocks: ExerciseBlock[]
    exerciseRecords: ExerciseRecord[]
    settings: AppSettings[]
  }
}
```

示例：

```json
{
  "format": "gymlog-backup",
  "version": 1,
  "exportedAt": "2026-09-15T00:30:00.000Z",
  "data": {
    "exerciseFamilies": [],
    "exercises": [],
    "workoutSessions": [],
    "exerciseBlocks": [],
    "exerciseRecords": [],
    "settings": []
  }
}
```

---

## 16. Backup 导入完整性检查

导入前至少校验：

1. `format === 'gymlog-backup'`；
2. `version` 是支持的版本；
3. 所有 ID 唯一；
4. Exercise.familyId 引用存在；
5. ExerciseBlock.sessionId 引用存在；
6. ExerciseBlock.exerciseId 引用存在；
7. ExerciseRecord.exerciseBlockId 引用存在；
8. RecordSchema 合法；
9. LoadMode 与 load 字段启用状态合法；
10. 日期/时间格式合法；
11. 数值字段类型和基本范围合法。

全部通过后才允许进入 replace-all 事务。

---

## 17. 数据库版本与 Migration

从第一个正式数据库开始显式声明版本。

```text
DB Version 1
```

原则：

- 任何表结构/索引变化增加数据库版本；
- migration 必须可重复测试；
- 不允许通过清空用户数据库来“解决升级”；
- Backup `version` 与 IndexedDB schema version 是两个概念，不要求数字永远相同。

例如：

```text
Database schema version: 3
Backup format version:   1
```

完全合法。

---

## 18. 不入库的数据

以下均实时派生，不保存为权威字段：

```text
训练时长
本周训练次数
本月训练次数
今年训练次数
热力图
最高重量
最低辅助重量
PR
估算1RM
固定重量最佳次数
趋势折线
连续训练天数
训练第N周
```

如果未来为了性能建立缓存，缓存必须独立标识并可以完全重建。

---

## 19. 第一版统计查询需要的数据路径

### 19.1 年度热力图

```text
WorkoutSession
WHERE date in year
GROUP BY date
```

### 19.2 本月/今年训练次数

```text
WorkoutSession.date
```

### 19.3 训练时长

```text
WorkoutSession.startTime
WorkoutSession.endTime
```

### 19.4 单动作统计

```text
Exercise
  ↓ exerciseId
ExerciseBlock
  ↓ blockId
ExerciseRecord
  + WorkoutSession.date
```

不需要为了统计再保存 `exerciseId` 到 ExerciseRecord，避免重复源数据。

---

## 20. 一个完整真实示例

### 20.1 ExerciseFamily

```json
{
  "id": "family_reverse_hyper",
  "name": "反向山羊",
  "archived": false,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 20.2 Exercise

```json
{
  "id": "exercise_reverse_hyper_extension",
  "name": "反向山羊挺身",
  "familyId": "family_reverse_hyper",
  "recordSchema": {
    "reps": "REQUIRED",
    "load": "OPTIONAL",
    "duration": "DISABLED",
    "distance": "DISABLED",
    "speed": "DISABLED",
    "incline": "DISABLED",
    "side": "DISABLED"
  },
  "loadMode": "BODYWEIGHT_PLUS",
  "archived": false,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 20.3 WorkoutSession

```json
{
  "id": "session_2026_09_08",
  "date": "2026-09-08",
  "startTime": "18:10",
  "endTime": "19:14",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 20.4 ExerciseBlock

```json
{
  "id": "block_reverse_hyper_1",
  "sessionId": "session_2026_09_08",
  "exerciseId": "exercise_reverse_hyper_extension",
  "order": 1,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 20.5 ExerciseRecord

```json
[
  {
    "id": "record_1",
    "exerciseBlockId": "block_reverse_hyper_1",
    "order": 0,
    "reps": 20,
    "createdAt": "...",
    "updatedAt": "..."
  },
  {
    "id": "record_2",
    "exerciseBlockId": "block_reverse_hyper_1",
    "order": 1,
    "reps": 20,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

## 21. V1 数据模型冻结条件

在进入 `plans/01_DATA_FOUNDATION.md` 前，应确认：

- [ ] 核心五实体关系不再变化；
- [ ] RecordSchema 字段集合确认；
- [ ] LoadMode 四种语义确认；
- [ ] 单位确认；
- [ ] Exercise 改名/归档规则确认；
- [ ] 级联删除规则确认；
- [ ] 历史 Schema 兼容规则确认；
- [ ] Backup v1 顶层格式确认；
- [ ] 跨午夜规则确认；
- [ ] Settings V1 最小字段确认。
