# Plan 07 — UI/UX Polish & Design System

> 目标：在 Plan 00–06 功能闭环已经完成的基础上，统一 GymLog 的视觉语言与高频交互，使它从“功能可用”收口到“真机长期好用”。
> 本阶段不新增业务能力，重点重构视觉、组件和交互路径。

## 1. Goal

Plan 07 的唯一核心目标：

> **以当前已确认的三张 UI 参考图为基准，建立 GymLog 的正式 Design System，并逐页重构高频交互。**

视觉方向正式定义为：

```text
Clean Fitness Utility
```

关键词：

```text
克制
快速
清晰
轻量
iOS-like
数据优先
弱阴影
圆角卡片
单一主色
少量语义色
```

本阶段完成后：

- 页面不再各写各的视觉样式；
- 高频训练操作尽量减少点击；
- 真机 safe-area / keyboard / touch target 一致；
- 训练、历史、统计、动作、设置具有统一产品感；
- Cloudflare Pages + iPhone PWA 可以直接进行最终 Release Smoke。

---

## 2. Source of Truth / Visual References

产品行为仍以：

```text
docs/INTENT.md
docs/SPEC.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
```

为准。

视觉和交互基线以：

```text
docs/DESIGN_SYSTEM.md
docs/design/references/
```

为准。

参考图：

```text
ui-workout-original.png
ui-home-stats-original.png
ui-refined-three-screens.png
```

规则：

- 参考图决定“方向”，不是要求逐像素照抄；
- 如果参考图与现有产品规则冲突，以 SPEC / DATA_MODEL 为准；
- 不允许为了还原图片新增未批准的业务字段；
- 不允许让 UI 暗示不存在的持久化语义。

特别注意：

> 训练未填写 `endTime` 时，不得把“当前时间 - startTime”显示成权威训练时长。参考图中的“已训练 42min”不作为 V1 必做行为。

---

## 3. Entry Criteria

进入 Plan 07 前：

- Plan 00–06：`PASS`；
- 最新 Backup / Restore 已完成；
- 数据库 schema version 仍为 `1`；
- Cloudflare Pages 已可部署；
- iPhone PWA 已可真实使用；
- 根目录 `AGENTS.md` 恢复规则已生效；
- working tree 中不得混入来源不明的 UI 修改；
- 现有业务 E2E 作为重构回归保护。

---

## 4. Non-negotiable UX Principles

### 4.1 高频极简，低频允许复杂

训练中的操作必须尽量短：

```text
添加动作
添加一组
改重量/次数
看上次
完成训练
```

动作 Schema 创建属于低频配置，可以使用独立完整页面。

### 4.2 Autosave，不制造“保存焦虑”

Plan 03 已经是持续本地持久化。

因此训练中：

- 不显示会让用户误解的主操作“保存”；
- 合法数据按现有规则自动持久化；
- 可用非常轻的保存状态，但不得成为必须点击的操作；
- “完成训练”只表达结束 Session，不等价于第一次保存数据。

### 4.3 危险操作降噪

- 删除不能成为页面最抢眼的视觉元素；
- Danger 红色只用于真正破坏性行为；
- 删除 Session / Block 等较大范围操作必须保留确认；
- Record 删除可以是直接操作，但按钮视觉应克制。

### 4.4 触控优先

- 核心 touch target >= 44×44 CSS px；
- 不依赖 hover；
- 输入字号 >= 16px，避免 iOS 自动缩放；
- safe-area 不遮挡固定操作；
- 键盘弹起后仍能完成核心操作；
- 不让横向滚动成为普通表单的必需操作。

---

## 5. Tasks

### 07A — Freeze Design System

创建并落实 `docs/DESIGN_SYSTEM.md`。

必须统一：

- [ ] Color tokens
- [ ] Typography
- [ ] Spacing
- [ ] Radius
- [ ] Border / Shadow
- [ ] Icon usage
- [ ] Touch targets
- [ ] Page width
- [ ] Safe area
- [ ] Motion / feedback

建立可复用 UI primitive：

```text
Button
IconButton
Card
Input
NumberField
FieldLabel
Tag / Badge
SectionHeader
Sheet
Dialog
Toast / InlineFeedback
EmptyState
BottomNavigation
TopBar
```

要求：

- [ ] 页面不得继续大量硬编码互相不一致的颜色/圆角；
- [ ] CSS custom properties / token 层作为视觉真相；
- [ ] 不引入大型 UI framework 重写项目；
- [ ] 保持 React + 当前工程架构。

### 07B — App Shell / Navigation

统一全局壳：

- [ ] Light theme 为 V1 正式视觉基线；
- [ ] 页面背景使用浅灰，主内容 Surface 为白色；
- [ ] Bottom Navigation 统一图标、字号、active 蓝色；
- [ ] 底部导航正确处理 iOS safe-area；
- [ ] 页面标题、返回、右侧 action 使用统一 TopBar；
- [ ] 桌面浏览时保持合理内容宽度，不把手机 UI 拉成大屏网页；
- [ ] 不强制实现 Dark Mode。

底部导航：

```text
训练
统计
动作
设置
```

### 07C — Training Home

按参考图重构训练首页：

- [ ] 顶部标题“训练”；
- [ ] 主入口 `+ 新建训练` 清晰但不过度巨大；
- [ ] 未完成训练使用独立 Warning Card / Badge；
- [ ] “继续训练”入口明确；
- [ ] 本周 / 上周 / 更早周分组层级清楚；
- [ ] Workout Card 显示日期、星期、时间、时长、动作摘要；
- [ ] 未结束 Session 显示“未完成”，不伪造 duration；
- [ ] 整卡可点击；
- [ ] 长动作摘要正常截断；
- [ ] 空历史页面不显示开发态占位感。

### 07D — Workout Editor: Session Header

按参考图重构训练中页面头部：

- [ ] TopBar 使用“训练记录”；
- [ ] 不提供误导性的“保存”主操作；
- [ ] Session Header 清晰展示：
  - 日期
  - 开始时间
  - 结束时间
- [ ] `填入当前时间` 为轻量 Secondary action；
- [ ] 未结束时不展示权威“已训练 X min”；
- [ ] 完成后可以显示真实派生 duration；
- [ ] Session Header 视觉优先级低于 Exercise 操作本身。

### 07E — Workout Editor: Exercise Card / Record Row

这是 Plan 07 最重要的高频交互。

Exercise Card：

- [ ] 动作名突出；
- [ ] “上次表现”作为轻量快捷入口；
- [ ] LoadMode 的解释仅在必要时显示；
- [ ] Card 支持折叠/展开，但默认不妨碍连续录入；
- [ ] Block 危险操作收进 `···` 菜单或低干扰入口。

Record Row：

- [ ] 根据 Schema 保留现有字段语义；
- [ ] 重量/次数等密集输入按参考图排列；
- [ ] unit 不要求用户重复输入；
- [ ] 行号清晰；
- [ ] Delete control 视觉克制，Danger 仅在明确删除态强调；
- [ ] 数字键盘适配；
- [ ] 不出现窄屏横向溢出。

Add Record：

- [ ] “添加一组 / 添加一段”按钮宽且易点击；
- [ ] 延续 Plan 03：默认复制上一条 Record；
- [ ] 新 Record 创建后滚动/定位合理；
- [ ] 尽可能把焦点放到用户最可能修改的字段；
- [ ] 不能破坏自动持久化逻辑。

### 07F — Exercise Picker Interaction

训练中的“添加动作”重构为移动端高频选择体验。

建议使用 Bottom Sheet：

```text
添加动作
├─ 搜索
├─ 最近使用
└─ 按 Family 分组
```

要求：

- [ ] 打开后优先聚焦搜索；
- [ ] Recent Exercise 使用现有历史派生，不新增持久化最近表；
- [ ] 搜索实时过滤；
- [ ] archived Exercise 不可添加；
- [ ] 点击 Exercise 后立即添加 Block；
- [ ] 添加成功后 Sheet 关闭；
- [ ] 自动滚动到新 Block；
- [ ] 同一个 Exercise 仍允许重复添加；
- [ ] 新动作创建不塞进这个 Sheet 的复杂表单。

如当前浏览器/架构不适合 Bottom Sheet，可实现等价移动端 Modal，但交互目标不变。

### 07G — Previous Performance Sheet

“上次”不应把用户带离训练流。

- [ ] 点击“上次”打开 Sheet / Modal；
- [ ] 展示日期；
- [ ] 展示上次 Block 的全部原始 Record；
- [ ] 遵循 LoadMode formatter；
- [ ] 无历史显示明确空状态；
- [ ] 关闭后继续停留在原 Exercise Card；
- [ ] 不新增统计建议。

### 07H — Finish / Cancel Workout UX

页面底部主操作：

```text
[ + 添加动作 ] [ 完成训练 ]
```

- [ ] `添加动作` Secondary；
- [ ] `完成训练` Primary；
- [ ] 底部操作区处理 safe-area；
- [ ] 输入键盘弹出时不能遮挡当前编辑行；
- [ ] 完成训练时结束时间交互清晰；
- [ ] 放弃训练进入 `···` 或较弱危险入口；
- [ ] 有内容时保留确认；
- [ ] 不把“完成训练”与“保存”混为一谈。

### 07I — Exercise Management UX

动作列表：

- [ ] 搜索、Family 分组视觉统一；
- [ ] archived 状态清晰但不过度突出；
- [ ] 新建动作入口固定且好找；
- [ ] Exercise row 的 Schema summary 统一 formatter；
- [ ] 管理动作族不挤占高频页面主体。

新建 / 编辑 Exercise 使用独立页面，不使用复杂 Sheet。

表单优化：

- [ ] 名称优先；
- [ ] Family 选择清晰；
- [ ] RecordSchema 用更直观的三态控件；
- [ ] load 为 DISABLED 时隐藏/禁用 LoadMode；
- [ ] load 启用后才显示 LoadMode；
- [ ] BODYWEIGHT_PLUS / ASSISTANCE 配简短解释；
- [ ] Duplicate name warning 是提醒，不阻塞；
- [ ] Archive / Delete 放在页面较后位置。

### 07J — History Detail / Editing UX

- [ ] 详情页信息层级与训练卡一致；
- [ ] 原始 Record 只读展示简洁；
- [ ] Edit action 清晰；
- [ ] 历史编辑尽量复用训练编辑组件；
- [ ] 上移/下移不应占据每行大量视觉空间；
- [ ] Delete Workout 固定为危险区域并二次确认；
- [ ] Legacy fields 仍按既有历史兼容规则显示；
- [ ] 不为视觉重构改变历史 Schema 行为。

### 07K — Statistics UI

以参考图为主要方向：

Overview：

- [ ] 4 个核心 Metric Card：
  - 今年训练次数
  - 今年训练时长
  - 本月训练次数
  - 本月训练时长
- [ ] 数值优先，label 次级；
- [ ] 年份切换器视觉统一。

Heatmap：

- [ ] 卡片化；
- [ ] 月份 / 星期文字可读；
- [ ] active / inactive 层级明确；
- [ ] 触控点击状态清晰；
- [ ] 手机宽度下不破坏整页布局。

Exercise Statistics：

- [ ] 图表标题、指标卡、Segmented Control 统一；
- [ ] Trend tooltip 适合触摸；
- [ ] EXTERNAL / ASSISTANCE 的语义色正确；
- [ ] 图表不通过装饰制造“伪科学精度”。

注意：

> 参考图中的“最近进步”模块如果当前业务没有对应已批准算法，本 Plan 不新实现识别算法。可以保留布局空间设计，不得伪造数据。

### 07L — Settings / Backup UX

- [ ] Import / Export 统一到正式视觉；
- [ ] Backup / Restore 分区清楚；
- [ ] 最近备份时间弱化为状态文本；
- [ ] Import replace-all 风险明确；
- [ ] Danger confirmation 使用统一 Dialog；
- [ ] 文件选择、成功、失败反馈统一；
- [ ] 不改变 Plan 06 的备份语义。

### 07M — Feedback / Empty / Error / Loading

全站统一状态组件：

- [ ] EmptyState
- [ ] Loading
- [ ] Inline validation
- [ ] Error
- [ ] Success
- [ ] Toast / transient feedback
- [ ] Destructive confirmation

要求：

- 不用大量 Toast 干扰训练；
- 自动保存成功不需要每组弹 Toast；
- 错误必须接近出错字段；
- destructive action 必须明确。

### 07N — iPhone PWA Interaction Audit

真机逐项检查：

- [ ] safe-area top / bottom；
- [ ] keyboard；
- [ ] number input；
- [ ] date/time input；
- [ ] Sheet / Dialog；
- [ ] Bottom Nav；
- [ ] sticky action；
- [ ] 320–430 CSS px 宽度；
- [ ] standalone PWA；
- [ ] Safari browser mode；
- [ ] 页面刷新；
- [ ] 返回导航；
- [ ] 长列表滚动；
- [ ] Cloudflare Pages 正式部署。

---

## 6. Acceptance Criteria

Plan 07 完成时必须满足：

1. 三张 Reference 的总体视觉语言已被真实 UI 吸收；
2. 全站正式使用统一 Design Tokens；
3. Training / Statistics / Exercise / Settings 四个主 Tab 风格一致；
4. 训练中没有误导性的必须“保存”按钮；
5. 添加动作可以在不离开训练上下文的情况下快速完成；
6. 添加一组继续复制上一组并保持高效编辑；
7. Previous Performance 不强制跳走；
8. Record Delete 不再成为页面最抢眼的视觉元素；
9. 新建 Exercise 仍保留完整、可理解的 Schema 配置能力；
10. History / Statistics / Backup 不改变原有业务语义；
11. iPhone safe-area、keyboard 和 touch target 正常；
12. 页面在 320px 宽度不产生普通内容横向滚动；
13. Plan 00–06 全部回归测试通过；
14. 数据库 schema version 仍为 `1`；
15. 不因 UI 重构新增未批准的核心业务字段。

---

## 7. Required Test / Review Scenarios

### 7.1 Workout Recording Smoke

```text
新建训练
→ 添加卧推
→ 输入 40kg × 8
→ 添加一组
→ 自动复制
→ 改为 40kg × 10
→ 查看上次
→ 添加爬坡
→ 输入坡度/速度/时间
→ 完成训练
```

要求单手可完成，核心按钮不被 keyboard / safe-area 遮挡。

### 7.2 Add Exercise Picker

```text
添加动作
→ 搜索“卧推”
→ 点击
→ Sheet 关闭
→ 新 Block 出现并定位到可编辑区域
```

### 7.3 Create Exercise

```text
动作
→ 新建动作
→ 名称
→ Schema
→ LoadMode
→ 保存
→ 返回列表
```

验证条件显示逻辑和错误提示。

### 7.4 History

```text
训练首页
→ 本周
→ 进入详情
→ 编辑
→ 返回
```

页面层级和返回路径稳定。

### 7.5 Statistics

```text
统计
→ Overview
→ Heatmap
→ Exercise Statistics
→ Segment 切换
```

在 iPhone 上没有横向页面溢出。

### 7.6 Backup

```text
设置
→ 导出
→ 导入
→ 摘要
→ 取消
→ 再导入并确认
```

Dialog / feedback 与全站一致。

### 7.7 Regression

必须实际执行项目标准质量门禁和已有 E2E。

不得为了 UI 重构删除 Plan 00–06 的业务测试。

---

## 8. Out of Scope

Plan 07 不做：

- 新数据库表；
- Schema migration；
- Workout Template；
- RPE / RIR；
- AI 建议；
- 最近进步识别算法；
- 社交功能；
- 云同步；
- 登录；
- Dark Mode；
- 桌面专用复杂布局；
- 新统计公式；
- 改 Backup 格式；
- 全新产品功能。

---

## 9. Checklist

- [x] 07A Design System
- [x] 07B App Shell / Navigation
- [x] 07C Training Home
- [x] 07D Session Header
- [x] 07E Exercise Card / Record Row
- [x] 07F Exercise Picker
- [x] 07G Previous Performance Sheet
- [x] 07H Finish / Cancel Workout
- [x] 07I Exercise Management
- [x] 07J History Detail / Editing
- [x] 07K Statistics UI
- [x] 07L Settings / Backup
- [x] 07M Feedback States
- [x] 07N iPhone PWA Audit
- [x] Acceptance Criteria 全部满足
- [x] Plan 00–06 Regression 全部通过
- [x] schema version 仍为 `1`

---

## 10. Next Stage

Plan 07 完成并真机验收后：

```text
Plan 08 — PWA Release
```

Plan 08 只做 Release 收口，不再承担大规模 UI 重构。
