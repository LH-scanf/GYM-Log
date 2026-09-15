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
```

语义：

- Primary：动作、选中、导航 active；
- Success：明确正向变化；
- Warning：未完成训练；
- Danger：真正删除；
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

### Sheet

- 高频选择和短查看；
- Add Exercise；
- Previous Performance；
- 短确认/选择。

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
- 过度彩色 icon。

## 13. Accessibility

- text contrast 可读；
- 不只靠颜色表达状态；
- icon button 有 aria-label；
- focus visible；
- destructive action 文案明确；
- Sheet / Dialog 可键盘关闭；
- prefers-reduced-motion 下关闭非必要动画。
