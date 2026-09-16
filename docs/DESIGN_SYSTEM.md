# GymLog Design System

> 状态：V1 Visual Baseline
> 设计方向：Clean Fitness Utility
> 目标：为 Plan 07 提供统一视觉与交互基准。

## 1. Principles

```text
数据优先
操作优先
装饰其次
```

GymLog 不做“重健身品牌视觉”，而做轻量、长期使用的个人工具。

关键词：

- iOS-like，但不是逐像素仿系统 App；
- Light first；
- 单一蓝色主色；
- 卡片化但不层层套卡；
- 弱阴影；
- 信息密度适中；
- 危险色少用；
- 训练中操作优先级高于说明文字。

### 1.1 Copy — 去除非必要提示词

GymLog 是自用、高频工具，不是营销页面，也不是教学页面。

必须删除的非必要提示词：

- 营销 / 激励文案：「坚持训练，遇见更好的自己」；
- 对显而易见界面的解释：「从一次训练开始，记录每组表现」；
- 对页面用途的说明：「按周查看训练历史」「从本地训练记录实时计算」；
- 对控件操作的说明：「有训练的日期已高亮，点击日期查看当日训练」。

规则：

```text
页面标题能说明   → 不加副标题
控件本身能说明   → 不加解释
状态能用 Badge   → 不再写一句说明
```

只有涉及风险、特殊语义、不可逆操作时才保留说明，例如：

- Import 会完整替换本地数据；
- 放弃训练会删除其中的动作与记录。

判断标准：删除后用户仍然知道该做什么，就必须删除。

## 2. Color Tokens

建议 CSS tokens：

```css
--color-bg: #f5f7fa;
--color-surface: #ffffff;
--color-surface-subtle: #f8fafc;

--color-text: #101828;
--color-text-secondary: #475467;
--color-text-tertiary: #667085;

--color-border: #e4e7ec;
--color-divider: #eaecf0;

--color-primary: #1677ff;
--color-primary-pressed: #0958d9;
--color-primary-soft: #eaf3ff;

--color-success: #12b76a;
--color-success-soft: #ecfdf3;

--color-warning: #f79009;
--color-warning-soft: #fff7e8;

--color-danger: #f04438;
--color-danger-soft: #fff1f0;

/* 统计概览四色图标。只允许出现在指标卡的图标底与图标本身。 */
--color-metric-count: #1677ff;
--color-metric-count-soft: #eaf3ff;
--color-metric-duration: #12b76a;
--color-metric-duration-soft: #ecfdf3;
--color-metric-month-count: #7a5af8;
--color-metric-month-count-soft: #f1ecff;
--color-metric-month-duration: #0891b2;
--color-metric-month-duration-soft: #e0f5fa;
```

语义：

- Primary：动作、选中、导航 active；
- Success：明确正向变化；
- Warning：未完成训练；
- Danger：真正删除；
- Metric 四色：只用于统计页指标卡图标的「图标底 / 图标色」配对，
  不参与正文、按钮、链接、状态表达。同一张卡片的图标底与图标色必须成对取用；
- 不为每个 Exercise 使用随机颜色。

## 3. Typography

```text
Page Title      30 / 36  700
Screen Title    22 / 28  700
Section Title   18 / 24  650
Card Title      17 / 22  650
Body            16 / 22  400
Body Emphasis   16 / 22  600
Secondary       14 / 20  400
Caption         12 / 16  400
Metric          30 / 34  700
```

优先系统字体：

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  "PingFang SC",
  "Microsoft YaHei",
  sans-serif;
```

数字建议启用：

```css
font-variant-numeric: tabular-nums;
```

## 4. Spacing

使用 4px 基础网格：

```text
4
8
12
16
20
24
32
40
```

推荐：

```text
页面左右 padding   16
Card padding       16
Section gap        24
Card gap           12
Row gap             8
```

## 5. Radius

```text
sm    8
md   12
lg   16
xl   20
pill 999
```

主要 Card：16px。

Input：10–12px。

Button：12–14px。

## 6. Border / Shadow

Border：

```text
1px solid var(--color-border)
```

Shadow 只用于需要浮层感的 Sheet / Sticky Action：

```css
box-shadow:
  0 1px 2px rgba(16, 24, 40, 0.04),
  0 4px 12px rgba(16, 24, 40, 0.06);
```

普通 Card 优先 border，不使用重阴影。

## 7. Touch

所有核心 touch target：

```text
min 44×44 CSS px
```

Input：

```text
font-size >= 16px
```

避免 iOS 自动 zoom。

## 8. Layout

Mobile-first：

```text
320px → 430px
```

桌面：

- 内容居中；
- max-width 建议 640px；
- 不把手机表单铺满 1440px；
- 统计图可适当更宽，但保持统一 shell。

## 9. Components

### Primary Button

- 蓝底白字；
- 主要 CTA 每屏最多一个；
- 高度建议 48–52px。

### Secondary Button

- 白底/浅蓝底；
- 蓝色文字；
- border 可选。

### Danger Button

- 默认不大面积红底；
- destructive confirmation 中可以使用红色强调。

### Card

- 白色；
- border；
- radius 16；
- 不做多层深重阴影。

### Input / NumberField

- 明确 label；
- unit 放在输入框内部尾部或紧邻；
- 数字输入居中/右对齐可按场景；
- error 放在字段下方。

### Badge

- 未完成：warning；
- archived：neutral；
- 辅助重量提示：neutral/info。

### Bottom Navigation

- 4 项；
- icon + label；
- active 使用 primary；
- inactive 使用 tertiary；
- safe-area bottom。

### Page Header

一级页面（底部 Tab：统计 / 设置）的页头：

- `.page-header`：左对齐 28px 大标题 + 右侧动作槽（可选）；
- 二级页面（有返回或工具按钮）继续用居中的 `.top-bar`；
- 两者职责不同，不要互换；一级页面不要再叠加 `.top-bar`。

### Metric Card（统计概览）

```text
[icon]  今年训练次数
        24 次
```

- 2×2 网格，390px 下不做单列降级；
- 四色图标必须成对取用 `--color-metric-*`（图标色 + 图标底），见 §2；
- 图标只做视觉锚点，语义由 label 文字承担——不得只靠颜色区分卡片；
- 数字 24px、`tabular-nums`、`white-space: nowrap`。

### Select Pill

- 轻量胶囊，用于页头年份、趋势卡动作切换；
- 尽量保留原生 `<select>` 以复用 iOS 滚轮，只做视觉胶囊化；
- 只承载「当前值 + chevron」，不放解释文字；
- 文字过长时省略号截断（`.select-pill__label`），不要撑破页头。

### Compact Field（短字段）

日期、时间这类短值字段的排版：

```text
日期              开始时间
[9月16日]         [13:44]
```

- 小标签在上（`.session-field__label`：11 / 14，650，tertiary）；
- 值在下（`.session-field__value`：16 / 22，tabular-nums）；
- 值由应用紧凑渲染，控件本体保留原生 `input[type=date|time]`，
  以透明层铺满整个字段 → 点击仍打开系统原生选择器；
- **短字段不需要整行宽度**：390px 下也保持两列，不做单列降级
  （见 `design/UI_ACCEPTANCE.md §2.1`）；
- 值的容器必须 `overflow: hidden`，否则长值会把外层顶出视口。

以上表单字段用 `.session-field__control` 包出一个带边框的输入盒（Sheet 录入场景）；
只读展示场景（Active Workout 的 Session Card）直接用 `.session-field__input` 的下划线变体。

### Sheet

- 高频选择和短查看；
- Add Exercise；
- Previous Performance；
- 短确认/选择。
- 新建训练：见 `design/UI_ACCEPTANCE.md §2.1`。

### Full Page Form

用于低频复杂任务：

- Create/Edit Exercise；
- 复杂设置。

## 10. Workout-specific Rules

### Record Row

力量：

```text
#   [40 kg] × [8 次]    remove
```

有氧：

```text
#   [坡度12] [5 km/h] [40 min]
```

要求：

- 行号可扫描；
- unit 不重复输入；
- delete 低干扰；
- 不横向溢出。

### Add Record

全宽 Secondary：

```text
+ 添加一组
```

有氧：

```text
+ 添加一段
```

### Previous Performance

Exercise Header：

```text
卧推                        上次 >
```

点击打开 Sheet，而不是离开训练页面。

## 11. Feedback

Autosave：

- 不每次保存都 Toast；
- 保存失败必须明显；
- 可以展示轻量 “已保存” 状态，但不制造“必须点击保存”的心理。

Validation：

- 就近显示；
- 不用全局弹窗代替字段错误。

Destructive：

- Session 删除 / 放弃有内容训练：Dialog；
- Record 删除：可以直接，但控件不抢眼。

## 12. Reference-specific Decisions

采用参考图：

- 白底/浅灰背景；
- 蓝色主色；
- 训练记录高密度 Card；
- 统计四宫格指标；
- Heatmap；
- Bottom Navigation；
- 未完成状态使用橙色；
- 轻量圆角。

不直接采用：

- 未结束 Session 的权威实时 duration；
- 训练页显式“保存”主按钮；
- 尚未有正式算法支持的“最近进步”数据；
- 满屏彩色 icon。**例外**：统计页概览指标卡允许四个成对的语义色图标
  （见 §2 Metric 四色），此外不新增彩色图标。

## 13. Accessibility

- text contrast 可读；
- 不只靠颜色表达状态；
- icon button 有 aria-label；
- focus visible；
- destructive action 文案明确；
- Sheet / Dialog 可键盘关闭；
- prefers-reduced-motion 下关闭非必要动画。
