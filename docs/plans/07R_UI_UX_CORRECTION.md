# Plan 07R — UI/UX Correction

> 状态：CORRECTIVE PLAN  
> 原因：Plan 07 已实现并提交，但真机视觉验收失败。  
> 本 Plan 的目标不是“继续美化”，而是纠正已经确认的页面结构与交互错误。

## 1. Goal

Plan 07R 的唯一目标：

> **让当前实现真正达到已确认的 GymLog UI 参考图和交互意图，而不是仅给旧页面套一层 Design Tokens。**

本轮必须重构页面结构，而不仅是调 CSS。

最终判断标准：

```text
功能测试 PASS
+
结构契约 PASS
+
Playwright 截图 PASS
+
人工视觉验收 PASS
```

缺少最后一项时，不得宣告 Plan 07R PASS。

---

## 2. Why Plan 07 Failed

Plan 07 的失败不是配色问题，而是以下实现策略错误：

1. 把旧页面结构原样保留，只替换颜色、圆角、间距；
2. 把“参考图决定方向”理解成可以忽略页面信息架构；
3. E2E 只验证“能点、能走流程”，没有验证视觉结构；
4. 没有要求输出固定 viewport 截图；
5. Agent 自己勾选 `iPhone PWA Audit`，但没有人工视觉确认；
6. 一个 Plan 同时覆盖过多页面，导致实现趋向“最小满足 checklist”。

07R 必须纠正这些问题。

---

## 3. Source of Truth

业务规则：

```text
docs/INTENT.md
docs/SPEC.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
```

设计规则：

```text
docs/DESIGN_SYSTEM.md
docs/design/reference/
docs/design/UI_ACCEPTANCE.md
```

当前失败截图：

```text
docs/design/reviews/plan07_failed/
```

优先级：

```text
业务 Source of Truth
↓
UI_ACCEPTANCE.md 页面结构契约
↓
DESIGN_SYSTEM.md
↓
目标参考图
↓
当前实现
```

如果当前实现和 UI_ACCEPTANCE 冲突，必须改当前实现。

---

## 4. Hard Rules

### 4.1 本轮不是 CSS Patch Plan

禁止用以下方式“完成”07R：

- 只改 `global.css`；
- 只改颜色、圆角、字号；
- 保留错误页面结构，仅调间距；
- 用 `overflow: hidden` 掩盖布局问题；
- 用更小字体塞下错误信息架构；
- 为截图临时隐藏功能；
- 删除业务功能来换视觉整洁。

允许且鼓励：

- 重构 React 组件；
- 拆页面；
- 重排信息架构；
- 把低频管理入口移到二级页面/Sheet；
- 把 Workout Editor 改为独立沉浸式 flow；
- 复用既有 Application / Domain 行为。

### 4.2 数据模型冻结

- 不新增数据库表；
- 不改 schema version；
- 不改变 RecordSchema / LoadMode 语义；
- 不改变 Backup 格式；
- 不改变 Statistics 计算公式；
- 不删除已有业务能力。

### 4.3 Visual QA 是硬门禁

Plan 07R 不允许 Agent 自己直接宣告视觉 PASS。

实现完成后必须生成截图：

```text
390 × 844
430 × 932
```

至少覆盖：

```text
01 training home
02 active workout
03 exercise picker
04 exercises
05 create exercise
06 statistics overview
07 statistics heatmap
08 settings
```

截图必须保存到临时 review 目录供人工查看。

**在用户明确确认视觉通过之前：**

- 不更新 Plan 07R 为 PASS；
- 不更新 CURRENT_STATE 为 PASS；
- 不 Commit；
- 不 Push；
- 不开始 Plan 08。

Agent 应返回：

```text
READY_FOR_VISUAL_REVIEW
```

等待人工验收。

---

## 5. Tasks

### 07R-A — Training Home Rebuild

必须满足 `UI_ACCEPTANCE.md / Training Home`。

核心：

- [x] 首页顶部是 `训练` + `+ 新建训练`；
- [x] 首页默认不直接展示日期/开始时间大表单；
- [x] 点击新建训练后，才进入轻量 Create Workout flow；
- [x] 未完成训练是独立 Warning Card；
- [x] 历史按本周 / 上周 / 更早展示；
- [x] Workout Card 整体可点；
- [x] 空状态不重复出现多个“创建训练”主 CTA。

禁止：

```text
训练首页
→ 大日期输入
→ 大时间输入
→ 巨大新建训练按钮
```

### 07R-B — Active Workout Rebuild

Active Workout 必须成为独立沉浸式编辑 flow。

- [x] Active Workout 隐藏全局 Bottom Navigation；
- [x] TopBar：返回 / `训练记录` / overflow（可选）；
- [x] Session Header 紧凑显示日期、开始、结束；
- [x] `填入当前时间` 是 Secondary action；
- [x] 不显示误导性“保存”按钮；
- [x] `稍后继续` / `放弃训练` 不允许以两个巨大按钮长期占页面主体；
- [x] `放弃训练` 移入 overflow / secondary destructive action；
- [x] 底部只保留高频：
  - `+ 添加动作`
  - `完成训练`

### 07R-C — Record Row Rebuild

这是 07R 最重要任务。

当前错误模式：

```text
已有 Record = 只读文本
+
底部独立 Composer
```

必须删除这个结构。

正确模式：

```text
#    重量           次数
1    [40 kg]   ×   [8 次]
2    [40 kg]   ×   [8 次]
3    [45 kg]   ×   [6 次]

[ + 添加一组 ]
```

要求：

- [x] 每一条已有 Record 都直接可编辑；
- [x] 新增 Record 后立即成为同样的一行；
- [x] 添加一组继续复制上一组值；
- [x] 不再存在“历史行只读 + 底部空白 Composer”；
- [x] 单行输入不横向溢出；
- [x] unit 与 input 形成一个紧凑控件；
- [x] Strength / Assistance / BODYWEIGHT_PLUS / Cardio 都有对应紧凑行；
- [x] Record 删除是低干扰 icon，不是大面积红色；
- [x] Block 删除移入 `···`；
- [x] 不同时在 Block Header 和 Record Row 大量展示红色垃圾桶。

### 07R-D — Exercise Picker

- [x] `添加动作` 打开 Bottom Sheet / Modal；
- [x] 搜索框打开后可立即输入；
- [x] 展示最近动作；
- [x] 展示 Family 分组；
- [x] 点动作立即添加并关闭；
- [x] 自动滚动到新 Block；
- [x] 不离开 Workout；
- [x] 不把完整“新建动作”复杂表单塞进 Sheet。

### 07R-E — Previous Performance

- [x] `上次 >` 位于 Exercise Header；
- [x] 点击后 Sheet 展示上一训练日和全部 Record；
- [x] 不离开 Workout；
- [x] 无数据时是小型 Empty State；
- [x] 关闭后保留当前输入状态和滚动上下文。

### 07R-F — Exercises Home Rebuild

当前错误：

- 顶部一个“新建动作”；
- 空状态又一个“创建第一个动作”；
- Family CRUD 永久展开在首页。

必须调整：

- [ ] Header：`动作` + `+ 新建动作`；
- [ ] Search 紧随 Header；
- [ ] 主体只展示 Exercise List / Empty State；
- [ ] 空状态不重复第二个巨大主 CTA；
- [ ] `已归档动作` 为 secondary entry；
- [ ] `管理动作族` 为 secondary entry；
- [ ] Family CRUD 移出动作首页主体；
- [ ] 动作首页不能像数据库后台管理页。

### 07R-G — Statistics Rebuild

#### Overview

- [ ] 4 个 Metric Card 紧凑展示；
- [ ] Label 使用“今年训练次数 / 今年训练时长 / 本月训练次数 / 本月训练时长”；
- [ ] 不用 `2026-09 训练次数` 这种开发态标签作为主视觉；
- [ ] 页面标题与参考图层级一致。

#### Heatmap

当前 7 列 × 52 行实现必须废弃。

正确结构：

```text
约 53 周 = 横向
7 天 = 纵向
```

硬约束：

- [ ] 7 rows × 52/53 week columns；
- [ ] Cell 是 contribution square，不显示每个日期数字；
- [ ] 顶部有月份标签；
- [ ] 左侧可有星期标签；
- [ ] Heatmap 内容高度目标约 120–180px；
- [ ] 整个 Heatmap Card 高度不得因 365 天增长为几十屏；
- [ ] 窄屏可在 Card 内横向滚动；
- [ ] 禁止让整个页面发生横向滚动；
- [ ] active / inactive 使用设计 token；
- [ ] 点击/触摸 active cell 可查看当天 Session。

### 07R-H — Settings Simplification

功能不变，信息密度重构：

- [ ] `设置` 页保留清晰标题；
- [ ] Backup / Restore 两个简洁 section/card；
- [ ] 把长说明压缩成 1–2 行 secondary text；
- [ ] “最近备份”作为弱状态文本；
- [ ] Primary action 不要宽大到像营销落地页 CTA；
- [ ] Import 仍明确 replace-all 风险；
- [ ] 导入摘要仅在选文件后展开；
- [ ] 不改变 Plan 06 语义。

### 07R-I — Global Shell / Density Audit

- [ ] 页面顶部留白缩减到合理 iOS PWA 密度；
- [ ] Card 不过度大；
- [ ] 不为每个信息块都套一层 Card；
- [ ] Bottom Nav 高度与 safe-area 正常；
- [ ] 320–430px 视觉密度合理；
- [ ] 不出现一屏只有 1–2 个巨大控件的情况（除非任务本身如此）；
- [ ] 桌面 max-width 继续保持合理；
- [ ] 所有主页面视觉层级一致。

---

## 6. Page-level Acceptance

详细页面契约见：

```text
docs/design/UI_ACCEPTANCE.md
```

该文件是 07R 的硬验收标准，不是建议。

如果代码满足测试但违反其中任一 `MUST NOT`，Plan 07R 仍失败。

---

## 7. Automated Verification

业务回归：

```text
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
npm run format:check
```

新增 UI regression：

- [ ] Playwright viewport `390x844`
- [ ] Playwright viewport `430x932`
- [ ] 页面无 body-level horizontal overflow
- [ ] Heatmap 外层高度不会随 365 天线性增长
- [ ] Active Workout 中不显示 Bottom Nav
- [ ] Training Home 不直接存在 Date/Time create form
- [ ] Exercise Home 不直接展开 Family CRUD
- [ ] 已有 Workout Record 行存在可编辑 input
- [ ] 每页主 CTA 数量符合页面契约

注意：

> DOM assertions 只能阻止明显回退，不能替代视觉验收。

---

## 8. Visual Review Gate

实现完成、自动测试全绿后：

1. 启动本地生产预览；
2. 用 Playwright 截取 390×844 和 430×932；
3. 输出 8 个关键页面 screenshot；
4. 与 `docs/design/references/` 对照；
5. Agent 做一轮自查；
6. 返回截图和差异说明；
7. 状态写：

```text
READY_FOR_VISUAL_REVIEW
```

然后 STOP。

只有用户明确回复视觉通过后，才继续：

```text
更新 checklist
→ CURRENT_STATE
→ Commit
→ Push
→ PASS
```

---

## 9. Out of Scope

- 新业务功能；
- 新 Schema；
- 新统计算法；
- 新备份格式；
- Dark Mode；
- Social；
- Cloud Sync；
- Workout Template；
- AI recommendation。

---

## 10. Checklist

### Implementation
- [x] 07R-A Training Home
- [x] 07R-B Active Workout
- [x] 07R-C Record Row
- [x] 07R-D Exercise Picker
- [x] 07R-E Previous Performance
- [ ] 07R-F Exercises Home
- [ ] 07R-G Statistics
- [ ] 07R-H Settings
- [ ] 07R-I Global Shell / Density

### Automated
- [ ] Typecheck
- [ ] Lint
- [ ] Unit / Integration
- [ ] Build
- [ ] Existing E2E
- [ ] UI regression assertions
- [ ] Format

### Visual
- [ ] 390×844 screenshot set generated
- [ ] 430×932 screenshot set generated
- [ ] Agent visual self-review completed
- [ ] Human visual review approved

> 最后一项未通过时，本 Plan 状态只能是 `READY_FOR_VISUAL_REVIEW`，不能是 `PASS`。

### 进度记录

```text
2026-09-15
07R-B / 07R-D / 07R-E          ——> 已人工视觉验收通过
07R-A Training Home            ——> 实现完成，人工初步认可
07R-C Record Row               ——> 因视觉密度复检重新打开
07R-F / 07R-G / 07R-H / 07R-I  ——> 未完成

2026-09-16
07R-A / 07R-C                  ——> 密度修正完成，已 Commit / Push / 部署，等待真机验收
新建训练 Sheet                 ——> 字段布局改为 390 下两列短字段，已 Commit / Push / 部署，等待真机验收
07R-F / 07R-G / 07R-H / 07R-I  ——> 未完成，本轮未触碰
```

- 已人工确认的页面：**Active Workout / 训练记录页**（其 Record Row 密度修正待真机验收）。
- 07R-A 附带全局 UI 文案原则：`DESIGN_SYSTEM.md §1.1 Copy`（去除非必要提示词）。
- 07R 整体状态仍为 `READY_FOR_VISUAL_REVIEW`，**未 PASS**。
- 本轮起改用真机验收流程：`UI_ACCEPTANCE.md §8.1`；
  页面只有收到 `REAL_DEVICE_VISUAL_PASS` 才算冻结（`§8.2`）。
- 验收 viewport 约定（后续所有页面沿用）：

```text
主验收   iPhone 12 — 390 × 844
兼容验收            430 × 932
```

### New Workout Sheet 字段契约（390 × 844 主验收）

2026-09-16 明确：日期 / 开始时间是短字段，**390px 下也必须两列**。
原先 `@media (max-width: 400px)` 里对 `.create-workout-fields` 的单列降级被移除 ——
iPhone 12 正好是 390px，等于把主验收宽度当成「需要降级成单列的极窄屏」。

```text
小标签          11 / 14  650  tertiary   （复用 .session-field__label）
值              16 / 22  tabular-nums    （复用 .session-field__value）
字段盒          高 >= 44px / radius 10px / border 1px --color-border
可点热区        = 可见盒子（原生控件以 inset: -1px 的透明层铺满）
两列轨道        173 / 173px（390px，含 12px gap）
字段总高        60px（原单列为 144px）
```

说明：

- 原生 `input[type=date|time]` 的固有宽度塞不进 173px 的轨道，iOS 还会用
  `2026年9月16日` 的本地化长格式渲染，所以值改由应用紧凑渲染，
  控件本体保留为原生输入并铺满整个字段 —— 点击仍由系统原生选择器接管，
  没有引入自定义日期选择器。
- 值的容器必须 `overflow: hidden`：它让这个 flex 项的 `min-width: auto` 归零。
  去掉后长值会把 Sheet 顶出视口，已用负向对照确认压力用例有效。
- 断言锁定：`tests/e2e/new-workout-fields.spec.ts`。

### Record Row 数值契约（390 × 844 主验收）

07R-C 复检确定、07R-C2 按参考图重新校准，并已由
`tests/e2e/record-row-density.spec.ts` 与 `tests/e2e/active-workout.spec.ts` 断言锁定：

```text
Record Row 高      44–46px
输入框（field）高  34–36px
输入框（field）宽  96–106px
数字字号           16–17px / weight 500，右对齐贴住单位
单位字号           12–13px
表头字号           12–13px / weight 500
添加一组按钮高     34–38px
删除按钮点击热区   ≥ 44 × 44（图标 16px，灰）
数值与单位间距     ≤ 8px（读作一个 token，如 `40 kg`）
行距（pitch）      44–46px
```

说明：

- 宽度是 390 主验收口径；430 下输入框按流式变宽，只要求不破版、不横向溢出。
- 数字与单位由同一个带边框的 `.record-field` 容器承载，数字右对齐、单位紧随其后，避免旧实现里「数字居中 + 单位绝对定位」造成的松间距。
- 07R-C2 起，**参考图的归一化比例优先于旧的 40–44px 数值契约**：
  契约改为「一条训练数据」的密度，而不是「两个大型表单控件」。

**参考图实测值（供后续比对，勿与契约混淆）**

把 `docs/design/reference/ui-workout-original.png` 的屏幕区
（x 227–856 = 630px）按 390 逻辑宽归一化后实测：

```text
输入框高    ≈ 24px        行距 ≈ 30px
输入框宽    ≈ 105 / 113px（重量 / 次数）
数字字号    ≈ 13–14px     单位 ≈ 11px
添加一组高  ≈ 32px        图标 ≈ 15px
```

契约取值整体约为参考图纵向尺寸的 1.4×：参考图的 24px 输入框在真机上偏小，
因此契约保留了参考图的比例关系与横向尺寸，但纵向留出可点可读的余量。
若真机复验仍觉得偏大，下一轮按上表直接压到 26–28px / 34–36px pitch。

---

## 11. Next Stage

只有 07R 人工视觉验收 PASS 后：

```text
Plan 08 — PWA Release
```
