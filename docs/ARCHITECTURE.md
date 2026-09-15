# GymLog — 系统架构（ARCHITECTURE）

> 状态：Draft v0.1  
> 依赖：`INTENT.md`、`SPEC.md`  
> 目标：把已确认的产品规则映射成可实现、可测试、可长期演进的技术结构。

---

## 1. 架构目标

GymLog V1 的架构优先级按以下顺序排列：

1. **记录可靠**：健身房现场录入不能依赖网络、后台计时器或服务器。
2. **数据可长期维护**：原始训练记录稳定，统计逻辑可替换。
3. **结构简单**：自用工具，不为未来假想的大规模用户提前堆复杂后端。
4. **易测试**：领域规则、数据层和统计逻辑应尽量脱离 UI 测试。
5. **易迁移**：完整 JSON 可以备份、恢复和跨设备迁移。
6. **易扩展**：以后可以增加桌面端、OneDrive 同步或更多统计，而不推翻核心模型。

---

## 2. V1 总体架构

```text
┌──────────────────────────────────────┐
│              PWA UI                  │
│  训练 / 统计 / 动作 / 设置           │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│         Application / Use Case       │
│                                      │
│  创建训练 / 编辑训练 / 添加动作      │
│  查询历史 / 导入导出 / 统计查询      │
└──────────────────┬───────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│     Domain      │  │   Statistics    │
│ 领域模型与规则   │  │ 纯派生统计模块  │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └──────────┬─────────┘
                    ▼
┌──────────────────────────────────────┐
│        Repository / Data Layer       │
│   统一封装查询、事务、增删改查        │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│              IndexedDB               │
│          本地权威原始数据             │
└──────────────────────────────────────┘
```

核心原则：

> UI 不直接操作 IndexedDB；统计模块不维护第二份权威数据；所有业务写操作经过 Application/Repository 层。

---

## 3. 推荐技术栈

以下是 V1 推荐方案，属于架构建议，不改变产品规格：

```text
语言           TypeScript
前端           React
构建工具       Vite
PWA            vite-plugin-pwa
路由           React Router
本地数据库     IndexedDB
IndexedDB 封装 Dexie
图表           Recharts
测试           Vitest + Testing Library
E2E            Playwright（进入 Release Gate 后）
```

### 3.1 为什么推荐 Dexie

直接使用原生 IndexedDB API 会产生大量样板代码。Dexie 可以提供：

- 明确的表定义；
- 索引查询；
- 事务；
- 数据库版本升级；
- 批量导入；
- 更容易编写 Repository 测试。

V1 不建议引入远端数据库 SDK。

---

## 4. 分层职责

### 4.1 UI 层

负责：

- 页面和组件；
- 表单输入；
- 交互反馈；
- 导航；
- 图表展示；
- 本地 UI 状态。

不负责：

- 直接操作 IndexedDB；
- 直接计算复杂统计；
- 在组件内实现业务级级联删除；
- 自己维护一份与数据库并行的训练真相。

### 4.2 Application / Use Case 层

负责把用户行为组织成完整操作，例如：

```text
createWorkoutSession()
updateWorkoutSession()
addExerciseBlock()
addExerciseRecord()
archiveExercise()
replaceDatabaseFromBackup()
getLastExercisePerformance()
```

这里处理跨实体规则和事务边界。

### 4.3 Domain 层

保存纯业务类型和规则，例如：

- `LoadMode`；
- `FieldRequirement`；
- RecordSchema 合法性；
- Workout 时长计算；
- 动作是否允许硬删除；
- Record 数据校验。

Domain 层尽量不依赖 React、Dexie 或浏览器 API。

### 4.4 Repository 层

Repository 负责数据库读写。

建议至少包含：

```text
ExerciseFamilyRepository
ExerciseRepository
WorkoutRepository
ExerciseBlockRepository
ExerciseRecordRepository
SettingsRepository
```

为了避免 UI 一次训练详情需要拼装多个 Repository，可额外提供 Query Service：

```text
WorkoutQueryService
ExerciseHistoryQueryService
StatisticsQueryService
```

### 4.5 Statistics 层

统计模块只读取原始数据并返回派生结果。

例如：

```text
calculateOverviewStats()
calculateExerciseStats()
calculateHeatmap()
calculateEstimated1RM()
calculateFixedLoadRepTrend()
```

统计结果默认不写入数据库。

允许页面级 memo/cache，但缓存失效后必须可以从原始数据重新计算。

---

## 5. 页面与模块结构

V1 一级导航：

```text
训练 | 统计 | 动作 | 设置
```

推荐模块目录：

```text
src/
├── app/
│   ├── router/
│   └── providers/
│
├── features/
│   ├── workouts/
│   ├── statistics/
│   ├── exercises/
│   └── settings/
│
├── domain/
│   ├── exercise/
│   ├── workout/
│   └── statistics/
│
├── data/
│   ├── db/
│   ├── repositories/
│   ├── migrations/
│   └── backup/
│
├── shared/
│   ├── components/
│   ├── utils/
│   └── types/
│
└── main.tsx
```

模块按“业务功能”分组，不建议把整个项目拆成巨大 `components/`、`hooks/`、`utils/` 平铺目录。

---

## 6. 数据写入策略

所有训练编辑采用“立即保存本地”的方向，而不是依赖页面最后一个巨大 Save。

推荐行为：

```text
用户修改输入
   ↓
本地 UI 状态立即更新
   ↓
短 debounce / 明确事件
   ↓
Repository 写 IndexedDB
```

这样即使：

- 切后台；
- PWA 被系统回收；
- 页面意外关闭；

已经确认输入过的数据也尽量保留下来。

### 6.1 新建训练的状态

创建训练时，在用户确认日期/开始时间后就立即创建 `WorkoutSession`。

训练未填写结束时间是正常状态，不需要额外的“unfinished=true”。

判断方式：

```text
endTime == null
```

---

## 7. Schema-driven 训练编辑器

训练输入 UI 不针对每个动作单独编码。

流程：

```text
Exercise
   ↓
RecordSchema
   ↓
RecordEditor
   ↓
动态生成对应输入字段
```

例如：

```text
卧推
reps=REQUIRED
load=REQUIRED
```

自动生成：

```text
[重量] kg × [次数] 次
```

爬坡：

```text
duration=REQUIRED
speed=OPTIONAL
incline=OPTIONAL
```

自动生成对应有氧记录 UI。

可以针对字段组合做 UI 优化，但不能让某个动作名称绑定一套硬编码页面。

---

## 8. 历史 Schema 兼容策略

Exercise 的 RecordSchema 可以变化，但旧 `ExerciseRecord` 必须继续合法。

V1 推荐采用以下规则：

1. Record 数据本身只保存真实原始值；
2. Exercise 当前 Schema 只决定**新 Record 的录入 UI**；
3. 查看历史时直接按历史 Record 中存在的字段显示；
4. 编辑旧 Record 时，不因为后来新增 REQUIRED 字段而强迫用户补写不存在的历史值；
5. 已存在字段仍按类型和范围校验。

这样无需给每条历史记录保存完整 Schema 快照，也能保持历史兼容。

如果后续发现复杂 Schema 演进确实需要快照，再在数据库新版本中增加，而不是 V1 提前引入。

---

## 9. 统计查询与性能

个人训练数据规模较小，不需要预计算仓库或 OLAP 结构。

### 9.1 查询原则

禁止：

```text
每次 React render -> 全数据库扫描 -> 全部统计重算
```

推荐：

```text
页面进入
   ↓
按日期 / exerciseId 查询所需数据
   ↓
统计纯函数计算
   ↓
页面生命周期内 memo
```

### 9.2 首批索引

详见 `DATA_MODEL.md`，至少包括：

```text
WorkoutSession.date
ExerciseBlock.sessionId
ExerciseBlock.exerciseId
ExerciseRecord.exerciseBlockId
```

### 9.3 缓存策略

V1 不建立持久化统计缓存表。

可以使用：

- `useMemo`；
- query 层内存缓存；
- 以数据库变更版本作为失效依据的轻量缓存。

任何缓存都不是备份，也不是权威数据。

---

## 10. PWA / 离线架构

PWA 的目标是：**核心训练功能断网可用。**

Service Worker 主要缓存：

- App Shell；
- JS/CSS；
- 图标；
- 本地静态资源。

训练数据仍存 IndexedDB，不存 Service Worker Cache。

### 10.1 更新策略

V1 建议采用“检测到新版本 -> 提示用户刷新更新”，避免训练过程中突然强制刷新。

例如：

```text
发现新版本
[稍后] [更新]
```

---

## 11. JSON 导入 / 导出架构

### 11.1 导出

Repository/Data 层读取完整原始数据，生成标准 Backup DTO。

流程：

```text
IndexedDB
   ↓
Backup Exporter
   ↓
格式校验
   ↓
JSON Blob
   ↓
用户保存文件
```

### 11.2 导入

V1 使用 replace-all。

必须采用单个数据库事务：

```text
读取 JSON
   ↓
格式版本校验
   ↓
引用完整性校验
   ↓
向用户显示摘要
   ↓
事务开始
   ├─ 清空旧数据
   ├─ 写入新数据
   └─ 写入设置
   ↓
事务提交
```

任一步失败：

```text
ROLLBACK
```

不能留下半套数据库。

---

## 12. 时间与日期策略

业务日期使用用户本地值：

```text
WorkoutSession.date      YYYY-MM-DD
WorkoutSession.startTime HH:mm
WorkoutSession.endTime   HH:mm
```

这些值表示用户手工记录的训练事实，不自动转成 UTC 时间点。

系统审计时间：

```text
createdAt
updatedAt
```

使用 ISO 8601 时间戳。

### 12.1 跨午夜

V1 建议先允许：

```text
endTime < startTime
```

解释为结束时间在次日。

例如：

```text
23:20 -> 00:35 = 75 min
```

原因是实现成本很低，可以避免人为限制。

---

## 13. ID 策略

所有核心实体使用字符串 UUID，而不是依赖 IndexedDB 自增整数。

原因：

- JSON 导入导出稳定；
- 后续云同步更容易；
- 数据离开本机后仍保持唯一标识；
- 不依赖某一个数据库实例的自增序列。

推荐使用浏览器：

```ts
crypto.randomUUID()
```

---

## 14. 错误与恢复策略

关键错误至少区分：

```text
ValidationError
NotFoundError
DataIntegrityError
ImportFormatError
UnsupportedBackupVersionError
StorageError
```

训练录入时出现存储失败，必须明确提示，不能静默假装保存成功。

导入失败必须保留原数据库。

---

## 15. 测试边界

### 15.1 Domain 单元测试

重点测试：

- RecordSchema 校验；
- LoadMode 规则；
- Workout duration；
- 1RM；
- ASSISTANCE 趋势；
- BODYWEIGHT_PLUS 语义；
- 归档/删除规则。

### 15.2 Repository 测试

重点测试：

- CRUD；
- 顺序字段；
- 级联删除；
- 索引查询；
- replace-all 事务；
- migration。

### 15.3 UI 测试

重点测试最高频流程：

```text
新建训练
-> 添加卧推
-> 40kg × 8
-> 复制下一组
-> 修改为 40kg × 10
-> 添加第二个动作
-> 填结束时间
-> 首页查看
```

---

## 16. V1 不引入的架构复杂度

V1 明确不需要：

- 后端 API；
- 登录系统；
- Redux 级全局状态框架作为前提；
- 云数据库；
- 消息队列；
- 微服务；
- CRDT；
- 多设备冲突解决；
- 持久化统计数据仓库。

---

## 17. 为未来保留的扩展点

当前架构允许以后新增：

```text
OneDriveSyncAdapter
Desktop/Tauri Shell
CSV Exporter
More Statistics
BodyWeight Tracking
Cloud Backup
```

这些能力应作为适配器/新模块加入，不能反过来要求修改原始训练记录语义。

---

## 18. 进入实施 Plan 前建议冻结的技术决策

建议在 `plans/00_PROJECT_BOOTSTRAP.md` 前确认：

1. React + TypeScript + Vite 是否确定；
2. Dexie 是否确定；
3. Recharts 是否确定；
4. PWA 更新提示策略；
5. 跨午夜规则是否接受；
6. 1RM V1 采用的公式；
7. 是否从 V1 就加入 Playwright Release Smoke。

其他产品级规则继续以已批准的 `SPEC.md` 为准。
