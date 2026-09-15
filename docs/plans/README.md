# GymLog 开发计划索引

> `plans/` 只回答“当前阶段要实现什么”。  
> 通用 Agent 执行规则统一放在仓库根目录 `AGENTS.md`，不再在每个 Plan 重复 Git、测试、Commit、Push 等流程。

## 1. 文档职责

```text
INTENT.md          为什么做、核心产品边界
SPEC.md            产品必须怎么工作
ARCHITECTURE.md    软件怎么组织
DATA_MODEL.md      数据怎么表达与持久化
CURRENT_STATE.md   现在真实做到哪里
AGENTS.md          Agent 每一轮怎么工作
plans/*.md         当前阶段具体做什么
```

核心原则：

> Plan ≠ Prompt。

Plan 是可验收的工程任务单；Prompt 只需要指定“执行哪个 Plan”。

---

## 2. Plan 标准结构

从 Plan 02 开始，新 Plan 统一采用精简结构：

1. Goal / Entry Criteria
2. Scope
3. Tasks
4. Acceptance Criteria
5. Required Test Scenarios
6. Out of Scope
7. Checklist
8. Next Stage

通用内容不再复制进 Plan：

- git status / diff；
- lint / typecheck / build；
- 自审流程；
- Commit / Push；
- 最终报告格式；
- 禁止 force push / skip test 等统一规则。

这些全部由 `AGENTS.md` 负责。

未来新 Plan 以 `TEMPLATE.md` 为模板。

Plan 00 / 01 已经完成，保留其历史格式，不为了统一样式重写已完成阶段。

---

## 3. V1 路线图

```text
00 Project Bootstrap      PASS
        ↓
01 Data Foundation        PASS
        ↓
02 Exercise Management    PASS
        ↓
03 Workout Logging         PASS
        ↓
04 History & Editing       NEXT
        ↓
05 Statistics
        ↓
06 Import / Export
        ↓
07 PWA Release
```

`05+` 继续在前一阶段真正完成后再详细编写，避免计划与真实工程状态脱节。

---

## 4. 各阶段职责

### 00 — Project Bootstrap

建立 React + TypeScript + Vite + PWA + 测试与四 Tab App Shell。

### 01 — Data Foundation

落地 Domain、Dexie schema v1、Repository、Validation、Backup v1、Atomic Restore 与数据层测试。

### 02 — Exercise Management

用户维护自己的动作字典：ExerciseFamily、Exercise、RecordSchema、LoadMode、Archive / Restore / Delete Protection。

### 03 — Workout Logging

新建 WorkoutSession、手动日期/开始时间、动作选择、Schema 驱动 Record 输入、添加/删除/复制一组、自动本地持久化、结束时间与未完成训练恢复。

### 04 — History & Editing

首页按周展示历史、训练详情、历史数据编辑与删除整次训练。

### 05 — Statistics

年度/月度训练统计、训练热力图、动作趋势、最大重量、固定重量最佳次数、1RM、辅助重量/纯次数/有氧对应统计。

### 06 — Import / Export

把 Plan 01 已有 Backup 能力正式暴露给用户：JSON 导出、导入、校验、原子恢复与备份时间提示。

### 07 — PWA Release

iPhone PWA、真实离线、更新机制、Release Smoke 与 V1 发布收口。

---

## 5. 当前状态

真实状态统一查看：

```text
../CURRENT_STATE.md
```

不要在本文件同时维护 commit hash、working tree 等高频变化信息，避免多处状态漂移。

---

## 6. Plan 变更规则

如果实现中发现：

- Schema 无法覆盖真实训练；
- 产品字段语义不清；
- 导入导出无法无损恢复；
- 当前 Plan 必须改变上游产品行为；

则暂停对应实现，回到上游文档讨论，不在代码里偷偷增加例外。
