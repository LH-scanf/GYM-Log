# GymLog Agent 工作协议

> 本文件定义所有 Coding Agent 在 GymLog 仓库中的统一工作方式。  
> 它描述“怎么工作”，不描述某个阶段“要做什么”。阶段目标只写在 `docs/plans/` 中。

## 1. Source of Truth

开始任何开发前，Agent 必须阅读与当前任务相关的文档：

1. `docs/INTENT.md` — 产品为什么存在、核心体验与边界；
2. `docs/SPEC.md` — 已批准的产品行为；
3. `docs/ARCHITECTURE.md` — 工程边界与技术约束；
4. `docs/DATA_MODEL.md` — 数据语义、实体关系与持久化规则；
5. `docs/CURRENT_STATE.md` — 当前真实进度、已完成阶段与下一步；
6. 当前被授权的 `docs/plans/<PLAN>.md`。

优先级：

```text
INTENT
  ↓
SPEC
  ↓
ARCHITECTURE / DATA_MODEL
  ↓
CURRENT_STATE
  ↓
当前 Plan
```

若文档之间存在真实冲突，停止冲突部分并报告；不得在代码里偷偷选择一种语义。

---

## 2. 一次只执行一个 Plan

- 只实现用户明确授权的当前 Plan；
- 不提前实现下一阶段；
- 不因为“顺手”“以后会用”而加入未来功能；
- 普通工程细节可自行合理决定；
- 只有会改变产品行为、数据模型或架构原则的问题才需要暂停并请求人工决策。

Plan 是工程任务单，不是建议清单。完成当前 Plan 后必须停止。

---

## 3. 开工前 Git 检查

开始修改前至少检查：

```text
git status
git status -sb
git branch --show-current
git remote -v
git log -5 --oneline
```

规则：

- 不覆盖、删除、reset 用户已有修改；
- 不把来源不明的修改混入当前 Plan；
- 如果工作区不是 clean，先识别原因；
- 无真正阻塞时无需等待二次确认，继续执行当前 Plan。

---

## 4. 工程边界

持续遵守已批准架构：

```text
UI
↓
Application / Use Case
↓
Domain
↓
Repository
↓
IndexedDB / Infrastructure
```

尤其禁止：

- React 页面直接操作 Dexie Table；
- UI 重新定义一套 Domain 类型；
- 为页面方便绕过数据验证；
- 在核心表持久化可从原始数据计算出的统计结果；
- 擅自修改已经批准的 Schema 语义。

如当前 Plan 确实暴露出上游设计无法实现，先报告，再决定是否修改上游文档。

---

## 5. 测试与质量门禁

每个 Plan 完成后，必须实际执行当前项目中存在的全部标准质量门禁：

```text
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
npm run format:check
```

如果项目脚本名称发生合法调整，运行等价命令。

不得通过以下方式让检查变绿：

- 删除失败测试；
- `test.skip` / `.only`；
- 关闭 TypeScript strict；
- 大范围 `eslint-disable`；
- 使用 `any` 绕过模型约束；
- 注释掉失败功能；
- 降低已经存在的质量标准。

测试数据优先使用 GymLog 的真实健身场景，而不是无意义的 `foo/bar/test1`。

---

## 6. 自审

质量门禁通过后，停止新增功能，并对当前 Plan 做一次自审：

- 是否遗漏 Plan Task / Acceptance；
- 是否越界进入下一 Plan；
- 是否破坏上游数据规则；
- 是否存在重复类型、无用依赖、调试代码、临时文件；
- 是否存在 `TODO/FIXME` 或未解释的技术债；
- 是否存在可避免的过度设计；
- Mobile-first 页面是否仍可用；
- 原有 Plan 的回归测试是否仍通过。

发现问题先修复，再重新运行受影响的检查。

---

## 7. 文档同步

当前 Plan 完成后：

1. 更新当前 Plan 的 checklist；
2. 更新 `docs/CURRENT_STATE.md`；
3. 只记录已经真实实现并验证的状态；
4. 不擅自改写 `INTENT.md` / `SPEC.md`；
5. `ARCHITECTURE.md` / `DATA_MODEL.md` 只有在不改变既有产品语义、仅同步已确认工程事实时才可修改。

若产品规则必须改变，在最终报告中提出，等待人工批准。

---

## 8. Git 收尾

完成实现、测试、自审和文档同步后：

```text
git status
git diff
git diff --stat
```

确认不提交：

- `node_modules`
- `dist`
- `coverage`
- `playwright-report`
- `test-results`
- IDE / 临时文件
- 敏感信息

然后精确暂存当前 Plan 的修改，检查 `git diff --cached` 后创建清晰的 Conventional Commit。

规则：

- 不 amend 未经授权的历史；
- 不 force push；
- 不重写其他 branch；
- `origin` 可用时 push 当前分支；
- push 失败时保留本地 commit 并报告。

---

## 9. 最终报告

每个 Plan 完成后的报告至少包含：

```text
# Plan XX 完成报告

1. 完成 Task
2. 主要实现
3. 关键技术/数据决策（仅本轮真实发生的）
4. 测试命令与真实结果
5. 关键验收场景
6. Git：branch / commit / hash / push / working tree / ahead-behind
7. Warning / Technical Debt
8. 未完成事项
9. 下一步理论阶段
```

如果没有技术债或未完成项，明确写 `None`，不要为了格式虚构问题。

---

## 10. 停止规则

当前 Plan 完成后：

```text
实现
→ 测试
→ 自审
→ 文档同步
→ Commit
→ Push
→ 汇报
→ STOP
```

不要自行创建并开始下一 Plan。
