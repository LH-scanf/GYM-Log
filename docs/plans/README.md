# GymLog 开发计划索引

## V1 路线图

```text
00 Project Bootstrap             PASS
01 Data Foundation               PASS
02 Exercise Management           PASS
03 Workout Logging               PASS
04 History & Editing             PASS
05 Statistics                    PASS
06 Import / Export               PASS
07 UI/UX Polish & Design System  PASS
08 PWA Release                   PASS
09A Exercise Management         PASS — 待人工验收
09B Exercise Details            PASS — 待人工验收
09C Statistics Cleanup          PASS — 待人工验收
```

## 07 — UI/UX Polish & Design System

已冻结并落实 Clean Fitness Utility 视觉方向，建立 Design Tokens、通用组件与高频交互规范，并完成：

- 训练首页；
- 训练记录；
- Add Exercise Picker；
- Previous Performance；
- 动作管理；
- 历史详情 / 编辑；
- Statistics；
- Settings / Backup；
- 全局 Navigation / Feedback；
- iPhone PWA 真机交互审计。

Plan 07 不新增业务功能，不修改数据库 Schema。

## 08 — PWA Release

已完成离线、更新、真机 Smoke、部署和 V1 Release 收口，详见 `CURRENT_STATE.md`。

## 09 — 动作与统计体验优化（实施中）

总体设计：[`09_EXERCISE_STATISTICS/DESIGN.md`](09_EXERCISE_STATISTICS/DESIGN.md)。

按顺序分别授权、实现和验收：

1. [`09A_EXERCISE_MANAGEMENT.md`](09_EXERCISE_STATISTICS/09A_EXERCISE_MANAGEMENT.md)：分类导航、归档入口、新建返回；现有编辑路径暂不变。
2. [`09B_EXERCISE_DETAILS.md`](09_EXERCISE_STATISTICS/09B_EXERCISE_DETAILS.md)：动作详情、独立编辑路由、趋势与旧统计链接兼容。
3. [`09C_STATISTICS_CLEANUP.md`](09_EXERCISE_STATISTICS/09C_STATISTICS_CLEANUP.md)：统计首页精简及整体回归。

09A、09B、09C 已在 `codex/plan-09-exercise-statistics` 实现并通过自动化门禁，待人工验收。生产从 `master` 部署；三个 Plan 全部验收后再合并功能分支，并按 `AGENTS.md` 收口。

通用 Agent 工作规则统一遵循根目录 `AGENTS.md`。
