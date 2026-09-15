# GymLog 当前状态

> 本文件只记录“项目现在真实做到哪里”。  
> 产品规则不在这里定义；规则仍以 `INTENT / SPEC / ARCHITECTURE / DATA_MODEL` 为准。

最后更新：2026-09-15

## 1. 已批准文档

- `INTENT.md` — 已审核；
- `SPEC.md` — 已审核；
- `ARCHITECTURE.md` — 已用于 Plan 00–04；
- `DATA_MODEL.md` — 已由 Plan 01–04 落地验证；
- 根目录 `AGENTS.md` — 统一 Agent 工作协议；
- `plans/TEMPLATE.md` — 后续 Plan 标准模板。

## 2. 已完成阶段

### Plan 00 — Project Bootstrap

状态：`PASS`

```text
commit: 975a105
message: feat: bootstrap GymLog application
```

### Plan 01 — Data Foundation

状态：`PASS`

```text
commit: 9d6a95d
message: feat: add GymLog data foundation
```

### Plan 02 — Exercise Management

状态：`PASS`

```text
commit: ff61961
message: feat: add exercise management
```

### Plan 03 — Workout Logging

状态：`PASS`

```text
commit: 24babac
message: feat: add workout logging
```

### Plan 04 — History & Editing

状态：`PASS`

```text
commit: b6e2aa3
message: feat: add workout history and editing
push: origin/master 成功
```

已具备：

- 训练首页历史与未完成训练入口；
- 按周历史展示；
- Workout Detail；
- 原始 ExerciseBlock / ExerciseRecord 展示；
- 历史日期 / 开始时间 / 结束时间编辑；
- ExerciseBlock / ExerciseRecord 上移下移与连续 order；
- 删除整次 Workout 的二次确认与事务级级联删除；
- 跨午夜时长；
- 移动端 E2E。

数据库 schema version 仍为 `1`。

### Plan 05 — Statistics

状态：`PASS`

已具备：

- 从原始 WorkoutSession / ExerciseBlock / ExerciseRecord 实时派生年 / 月训练次数与时长；
- 按本地日期聚合的年度训练热力图，可查看当天训练详情；
- 含已归档动作的动作搜索与统计入口；
- EXTERNAL、BODYWEIGHT_PLUS、ASSISTANCE、纯次数和有氧动作的对应统计与趋势；
- Epley 估算 1RM、固定重量最佳次数、移动端可触控趋势数据点；
- 改名 / 归档、编辑 / 删除后的即时重新查询覆盖，以及移动端统计 E2E。

## 3. 当前状态

- Plan 00–05 均已完成；
- GymLog 已部署到 Cloudflare Pages 测试环境；
- iPhone PWA 已完成基础真机试用，可以正常打开并使用；
- 已发现一些 UI / 交互体验问题，后续可以作为独立小修复逐项处理；
- 数据库 schema version 仍为 `1`；统计没有新增权威持久化表。

## 4. 下一阶段

待执行：

```text
Plan 06 — Import / Export
```

Plan 06 负责：

- JSON 导出与导入；
- 导入前校验、数据摘要与 replace-all 原子恢复；
- `lastBackupAt` 与真实设备备份 / 恢复验收。

Plan 06 不提前开始。
