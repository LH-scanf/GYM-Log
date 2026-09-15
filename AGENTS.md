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

### 3.1 进行中 Plan 的恢复与续作

一个 Plan 不要求在一次 Agent 会话、一次回复或一次工具调用中完成。

如果当前 working tree 不 clean，Agent 必须先判断修改来源。

如果未提交修改已经确认属于**当前被授权 Plan 的进行中工作**：

- 这些修改不是阻塞项；
- 不得因为 working tree dirty 而停止当前 Plan；
- 不得 `reset`、`checkout`、`stash`、丢弃或重建这些修改；
- 必须以当前 working tree 为真实工作现场继续实现剩余 Task；
- 一个 Plan 可以跨多次 Agent 会话持续推进；
- 在 Plan 完整通过质量门禁前，不要求中间 Commit；
- 后续会话应先读取当前 diff 与相关文件，再从现有状态继续，而不是重新从 Plan 起点实施。

只有以下情况，dirty working tree 才可能构成阻塞：

- 修改来源未知；
- 修改与当前 Plan 无关；
- 修改属于用户未确认的独立工作；
- 当前 Plan 的继续实施会覆盖或破坏这些修改。

### 3.2 中途状态报告不是停止条件

如果当前 Plan 尚未完成，但不存在真正的产品、数据模型、架构或代码冲突，Agent 不应仅返回：

- “Plan 尚未完成”；
- “当前不能 Commit”；
- “仍有若干任务待完成”；
- “工作区不 clean，因此停止”。

然后结束执行。

正确行为是：**继续完成当前 Plan 的剩余 Task。**

只有以下情况才允许中途停止并请求人工处理：

1. 产品规则存在无法从 Source of Truth 判断的冲突；
2. 必须修改已经批准的数据模型；
3. 必须升级或改变数据库 Schema Version，且当前 Plan 未授权；
4. 必须改变既有架构原则；
5. 存在无法安全保留的用户修改冲突；
6. 当前工具或运行环境客观上无法继续执行；
7. 已进行合理重试后，仍存在无法安全推进的代码级阻塞。

普通实现困难、测试失败、类型错误、样式问题、局部重构需求，不属于人工阻塞，应优先自行分析和修复。

### 3.3 Patch / 编辑失败恢复规则

单次文件编辑失败、patch apply 失败、context mismatch、行号变化或大型替换失败，默认属于**工具级失败**，不是 Plan 级阻塞。

发生此类失败时，Agent 必须：

1. 重新读取目标文件的当前真实内容；
2. 检查当前 diff，确认之前成功的修改仍然存在；
3. 根据最新文件内容重新定位修改位置；
4. 缩小修改范围，避免重复使用已经失败的大型 patch；
5. 优先采用小步增量编辑；
6. 必要时先提取独立组件、hook、helper 或 service，再小范围接入现有页面；
7. 每完成一个小块后运行针对性测试或类型检查；
8. 继续当前 Plan，而不是因为一次工具失败宣告无法完成。

对于大型页面或复杂模块，优先采用：

```text
读取当前文件
→ 提取小组件 / helper
→ 单独实现
→ 小范围接入
→ 局部验证
→ 继续下一块
```

而不是一次性整体替换大型文件。

禁止因为一次 patch / edit 失败就：

- 宣告当前 Plan 无法完成；
- reset 当前工作；
- 重建已有实现；
- 丢弃当前 Plan 已成功修改；
- 要求用户重新开始整个 Plan。

只有在重新读取、缩小修改范围并进行合理重试后，确认存在真正的产品 / 数据 / 架构 / 用户修改冲突，才升级为人工阻塞。

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

### 10.1 Plan 完成后的停止

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

### 10.2 Plan 未完成时默认继续

只要当前 Plan 尚未完成，且不存在第 3.2 节定义的真正阻塞，Agent 默认行为必须是：

```text
读取当前状态
→ 保留已有修改
→ 继续剩余 Task
→ 局部验证
→ 继续推进
```

不得把“尚未完成”“当前不能 Commit”“单次 patch 失败”本身当作停止理由。

> **Plan 是一个可跨多轮 Agent 会话推进的工程交付单元，不等于一次 Agent 会话或一次回复。**
