# Plan XX — <Name>

> 一句话说明本阶段结束后，用户/系统获得什么能力。

## 1. Goal

说明本阶段唯一核心目标。

## 2. Entry Criteria

进入本阶段前必须已经成立的条件，例如：

- 前一 Plan 已通过人工验收；
- 依赖的数据层/API 已存在；
- working tree clean；
- 对应上游文档已审核。

这里只写阶段依赖，不重复 `AGENTS.md` 的通用 Git/测试流程。

## 3. Scope

本阶段要实现的功能边界。

## 4. Tasks

### XXA — ...

- [ ] ...

### XXB — ...

- [ ] ...

任务应描述“要实现什么”，不要重复如何执行 git、lint、push 等统一工作协议。

## 5. Acceptance Criteria

列出用户行为、数据正确性和边界规则。

## 6. Required Test Scenarios

列出这个阶段独有的关键测试场景。

通用质量门禁由根目录 `AGENTS.md` 统一规定，不在每个 Plan 重复。

## 7. Out of Scope

明确本阶段不做的内容，防止 Agent 越界。

## 8. Checklist

- [ ] XXA
- [ ] XXB
- [ ] Acceptance 全部满足
- [ ] 本阶段专项测试完成

通用自审、文档同步、Commit、Push 由 `AGENTS.md` 负责。

## 9. Next Stage

人工验收通过后，理论上进入哪个阶段；不要在本 Plan 中开始下一阶段。
