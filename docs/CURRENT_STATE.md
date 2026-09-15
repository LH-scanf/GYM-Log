# GymLog 当前状态

> 本文件只记录“项目现在真实做到哪里”。  
> 产品规则不在这里定义；规则仍以 `INTENT / SPEC / ARCHITECTURE / DATA_MODEL` 为准。

最后更新：2026-09-15

## 1. 已批准文档

- `INTENT.md` — 已审核；
- `SPEC.md` — 已审核；
- `ARCHITECTURE.md` — 已用于 Plan 00–02；
- `DATA_MODEL.md` — 已由 Plan 01–02 落地验证；
- `docs/AGENTS.md` — 统一 Agent 工作协议；
- `plans/TEMPLATE.md` — 后续 Plan 标准模板。

## 2. 已完成阶段

### Plan 00 — Project Bootstrap

状态：`PASS`

```text
commit: 975a105
message: feat: bootstrap GymLog application
push: origin/master 成功
```

已具备：React + TypeScript + Vite、四 Tab App Shell、PWA、Vitest、Playwright、质量门禁。

### Plan 01 — Data Foundation

状态：`PASS`

```text
commit: 9d6a95d
message: feat: add GymLog data foundation
push: origin/master 成功
```

已具备：Domain Types、Dexie schema v1、Repository、RecordSchema/LoadMode validation、Archive/Delete 保护、Backup v1、原子 restore、数据层测试。

### Plan 02 — Exercise Management

状态：`PASS`

```text
commit: ff61961
message: feat: add exercise management
push: origin/master 成功
```

已具备：真实 Exercise 列表与搜索、ExerciseFamily 管理、Exercise 创建/编辑、RecordSchema / LoadMode 配置、Archive / Restore / Delete Protection、移动端 E2E。

数据库 schema version 仍为 `1`。

### Plan 03 — Workout Logging

状态：`PASS`

已具备：训练创建与未完成训练恢复、动作选择与动作块、Schema 驱动的记录输入、记录复制/删除、上次表现、完成训练、跨午夜时长、放弃训练级联删除，以及移动端 E2E。

数据库 schema version 仍为 `1`。

## 3. 当前状态

- `master` 已与 `origin/master` 同步；
- Plan 02 完成报告显示 working tree clean；
- 02A–02F 已完成并通过测试；
- Plan 03 已实现并通过质量门禁。

## 4. 下一阶段

Plan 03 人工验收后，才可以编写并审核：

```text
Plan 04 — History & Editing
```

Plan 03 只负责训练中的记录流程。

在 Plan 03 人工验收前，禁止提前进入：

```text
Plan 04 — History & Editing
```
