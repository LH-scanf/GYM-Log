# GymLog UI Acceptance Contract

> 本文件用于 Plan 07R。  
> 它定义页面结构层面的 MUST / MUST NOT。  
> E2E 通过不能覆盖本文件的失败。

# 1. Global

## MUST

- Mobile first: 320–430 CSS px
- 页面左右主 padding 约 16px
- 主要卡片圆角统一
- 主要输入字号 >= 16px
- 底部 safe-area 正常
- Light theme
- 主色蓝、Warning 橙、Danger 红
- Body 不出现普通内容横向滚动

## MUST NOT

- 用巨大按钮填满每个 section
- 为每个小信息块都套 Card
- 一屏出现多个同等级 Primary CTA
- 大面积重复红色危险按钮
- 用超长说明文字占据主页面中心
- 出现营销 / 激励 / 解释型文案（见 `DESIGN_SYSTEM.md §1.1 Copy`）

# 2. Training Home

目标骨架：

```text
GYMLOG
训练                         [+ 新建训练]

[未完成训练 Card]    ← 只有存在时

本周
[Workout Card]
[Workout Card]

上周
[Workout Card]

更早
[Workout Card]
```

MUST:
- 新建训练是 Header action
- Header 不加副标题（页面标题已说明用途）
- 历史是页面主体，直接落在页面上而不是再套一层 Card
- 未完成训练优先于历史：最近一条未完成 Session 是独立 Warning Card
- 分组标签只有 `本周` / `上周` / `更早`，按自然周切分
- Workout Card：日期/星期、时间/时长、动作摘要
- 日期格式：当前年 `9月14日 周日`，跨年 `2025年12月28日 周日`
- 已完成训练只用 chevron 表示可进入，不使用状态圆点
- 历史中的未完成 Session 保留在分组里，只用一个橙色 `未完成` Badge
- 空状态只保留一句 `暂无训练记录`

MUST NOT:
- 默认展示 Date input
- 默认展示 Start Time input
- 默认展示大型 Create Workout form
- 空状态和 Header 同时出现两个大型“创建训练”按钮
- 为了未完成状态同时使用「灰点 + 橙 Badge + 文字说明」三套表达
- 因未完成而把 Session 从历史中隐藏

# 3. Active Workout

目标骨架：

```text
<      训练记录        ···

[Session compact card]
日期    开始    结束
        [填入当前时间]

[Exercise Card]
卧推                     上次 >
#   重量          次数
1   [40 kg]  ×   [8 次]
2   [40 kg]  ×   [8 次]
3   [45 kg]  ×   [6 次]
[ + 添加一组 ]

[Exercise Card]
...

[ + 添加动作 ] [ 完成训练 ]
```

MUST:
- Active Workout 期间隐藏 global Bottom Nav
- 记录行直接可编辑
- 添加一组后出现新的可编辑行
- `上次` 不跳离 Workout
- Bottom sticky action 只有高频主操作
- 放弃训练通过 overflow / secondary destructive entry

MUST NOT:
- 已有 Record 只读 + 下面另放空 Composer
- Block Header 大红删除按钮
- 每条记录巨大红删除按钮
- Sticky actions + Bottom Nav 双层占据大量底部
- 页面主体同时出现“稍后继续”和“放弃训练”两个大按钮

# 4. Exercise Picker

目标：

```text
Bottom Sheet
添加动作
[搜索...]

最近
卧推
高位下拉
...

胸
卧推
上斜卧推

背
...
```

MUST:
- 不离开 Workout
- 搜索优先
- 点击即添加并关闭
- archived 不显示

# 5. Exercises Home

目标：

```text
GYMLOG
动作                         [+ 新建动作]

[搜索动作或动作族]

胸
卧推                 重量 · 次数 >
上斜卧推             重量 · 次数 >

背
...

[管理动作族] [已归档动作]
```

MUST:
- 动作列表是主体
- Family management 是二级入口
- Empty State 简洁

MUST NOT:
- Family CRUD 永久展开在动作首页
- Header 有“新建动作”同时 Empty State 又给一个等价巨大主 CTA

# 6. Statistics

目标骨架：

```text
统计

[今年次数] [今年时长]
[本月次数] [本月时长]

年度训练热力图
[months ------------------------]
M  □□□...
T  □□□...
W  □□□...
T  □□□...
F  □□□...
S  □□□...
S  □□□...

动作统计
[搜索动作]
```

MUST:
- Heatmap 7 rows
- Week columns 横向
- Cell 视觉为 square
- 不在每个 cell 内显示日期数字
- Card 内必要时横向滚动
- 整体高度约 120–180px 的图表区

MUST NOT:
- 7 columns × 52 rows
- 365 个日期数字组成巨型年历
- Heatmap 占几十屏
- Body 因 Heatmap 横向滚动

# 7. Settings

目标：

```text
设置

本地数据与备份

[数据备份]
最近备份：...
本地数据建议定期导出。
[导出 JSON]

[恢复数据]
导入将完整替换本地数据。
[选择备份]
```

MUST:
- 说明精炼
- 行为风险清楚
- Import summary 只在需要时展开

MUST NOT:
- 大段说明文案 + 巨型 CTA 像营销页
- 默认展示完整导入摘要占位

# 8. Screenshot Acceptance

必须人工查看至少：

```text
training-home.png
active-workout.png
exercise-picker.png
exercises-home.png
create-exercise.png
statistics-overview.png
statistics-heatmap.png
settings.png
```

viewport 约定（2026-09-15 起）：

```text
主验收   iPhone 12 — 390 × 844   ← 每个页面都必须在此 viewport 下确认
兼容验收            430 × 932   ← 次要，用于确认不会因屏幕变宽而破版
```

每张截图都需要：

- 在 **390×844** 下确认（硬要求）；
- 并在 430×932 下确认不破版。

如果某页面在 screenshot 中明显违背本 Contract，即使所有自动测试通过也视为 FAIL。

## 8.1 真机验收流程（2026-09-16 起）

本地截图不再是验收终点。每个页面完成后按固定顺序执行：

```text
实现当前页面
→ 运行相关测试
→ 运行完整质量门禁
→ 生成 390×844 截图自查
→ 检查 git diff
→ Commit
→ Push 当前分支
→ 等待 Cloudflare Pages 部署
→ 汇报 commit hash / push 状态 / 部署对应分支
→ STOP
```

然后在 **iPhone 12** 上打开真实 Cloudflare PWA 进行人工验收。

## 8.2 冻结规则

- 页面只有在收到明确回复 **`REAL_DEVICE_VISUAL_PASS`** 后才视为正式冻结。
- 未收到该回复前，任何「已 Commit / 已 Push」都**不构成冻结**。
- 真机验收反馈的处理方式：

```text
保留当前实现
→ 基于真实反馈继续修
→ 重新测试
→ 再 Commit / Push
```

- 430×932 只作为兼容 viewport，**不作为主要视觉决策依据**。
