# GymLog 当前状态

最后更新：2026-09-17

## 已完成

```text
00 Project Bootstrap      PASS
01 Data Foundation        PASS
02 Exercise Management    PASS
03 Workout Logging        PASS
04 History & Editing      PASS
05 Statistics             PASS
06 Import / Export        PASS
07 UI/UX Polish           PASS
07R UI/UX Correction      PASS（待真机最终验收收口）
```

Plan 05：

```text
commit: 802721e
message: feat: add workout statistics
push: origin/master 成功
```

Plan 06：

```text
commit: 0ffffa9
message: feat: add backup import and export
push: origin/master 成功
```

Plan 07 已完成 Design System、全站视觉重构与移动端回归验证；提交信息以 Git 历史为准。

Plan 07R（UI/UX 纠正）已实现并提交：

```text
8d45505  recalibrate Record Row density against reference
94c9ff7  keep new workout fields two columns at 390
8a9b69f  rebuild statistics page + simplify settings
fea3211  drop redundant GymLog eyebrow
d4eb68f  rebuild exercises page + add-exercise sheet
9eb2e40  add body-part categories + part-based picker filters
7c0b410  make category a first-class exercise attribute
```

数据库 schema version 仍为 `1`（未升级、未新增索引）。

## 当前状态

- GymLog 已部署到 Cloudflare Pages：https://gym-log-wa6.pages.dev（生产分支 `master`）；
- 版本号已更新为 `1.0.0`（`package.json` / `package-lock.json`）；
- iPhone PWA 已可正常真实使用，`registerType: 'prompt'`，回前台会重新检查 SW 更新；
- 核心功能闭环已经完成；Clean Fitness Utility Design System 已冻结并落实到全站；
- 四个主 Tab、训练 Sheet、记录卡、统计和备份页面已完成视觉重构；
- Mobile Chromium 的 320–430px 回归、safe-area CSS 和键盘相关核心交互已验证；
- 下一阶段：Plan 08 — PWA Release（进行中，只做 V1.0 收口，不新增产品功能）。

### Workout Flow / 导航（已实现）

- 新建训练走「训练首页 → 新建训练 Sheet（日期/开始时间，390px 两列）→ 沉浸式 Active Workout」；
- Active Workout 隐藏全局 Bottom Navigation，TopBar 为「返回 / 训练记录 / overflow」；
- Session Header 紧凑展示日期 / 开始 / 结束时间，「填入当前时间」为 Secondary action，无误导性「保存」；
- 底部只保留高频「+ 添加动作」「完成训练」；「放弃训练」收进 overflow；
- 训练记录页（历史详情）与 Active Workout 共享 `workout-editor.tsx`（`mode: 'active' | 'history'`）；
- Record Row 直接可编辑（已废弃「只读历史行 + 底部 Composer」），添加一组复制上一组值。

### Exercise Picker（已实现）

- 训练中「添加动作」打开 Bottom Sheet：搜索 + 最近使用 + 按 Family 分组；
- 顶部筛选：最近 / 常用 + 8 个身体部位（胸/背/肩/手臂/腿/腹/有氧）+ 全部；
- 已归档动作默认隐藏；部位内按 Family 分组；点动作立即添加 Block 并关闭 Sheet。

### Exercise.category（已收口为一等属性）

- `Exercise.category` 为可选字段，固定 8 类：
  `CHEST` / `BACK` / `SHOULDERS` / `ARMS` / `LEGS` / `CORE` / `CARDIO` / `OTHER`；
- `officialExerciseCategories`（41 个精确名称 → category 映射）是正式动作分类的 Source of Truth；
- `inferCategory` 仅作「新建建议」和「未知旧动作兜底」，不再作为 41 个正式动作的分类依据；
- 兜底迁移 `reconcileExerciseCategories`：已有 category 一律尊重、不覆盖，只对 `category===undefined` 的旧数据兜底（官方命中用官方值，未命中用 infer）；因此重复进入动作页幂等无副作用，用户手动改过、备份恢复回来的分类都永久保留；
- 新建/编辑动作页在「动作名称」与「动作族」之间新增「身体部位」选择：新建用 `inferCategory` 作建议可改，编辑回显当前值可改，改名不重置 category；
- category 与 ExerciseFamily 完全独立；未升级 Dexie schema version、未新增数据库索引。

## 后续路线

```text
00  Project Bootstrap             PASS
01  Data Foundation               PASS
02  Exercise Management           PASS
03  Workout Logging               PASS
04  History & Editing             PASS
05  Statistics                    PASS
06  Import / Export               PASS
07  UI/UX Polish & Design System  PASS
07R UI/UX Correction              PASS
08  PWA Release                   PASS — v1.0.0 已发布
```

## V1.0 发布信息

- 版本：`v1.0.0`（tag 与 GitHub Release 已发布）
- Release：https://github.com/LH-scanf/GYM-Log/releases/tag/v1.0.0
- 生产地址：https://gym-log-wa6.pages.dev
- 数据库 schema version：`1`（未升级、未新增索引）
- V1.0 进入长期维护期；后续产品功能需单独立项。
