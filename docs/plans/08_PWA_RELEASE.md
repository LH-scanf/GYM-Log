# Plan 08 — PWA Release

> 目标：把已完成全部功能开发的 GymLog 收口为一个可正式发布、可离线使用、可安全备份恢复、有明确版本与发布记录的 V1.0。
> 本 Plan 不新增任何产品功能，只做版本、测试、PWA、离线、更新、备份恢复、部署、tag 与 GitHub Release 的完整验收与收口。

## 1. Goal

Plan 08 的唯一核心目标：

> **验证并发布 GymLog V1.0 —— 一个在 iPhone PWA 上可长期稳定使用、离线可用、数据可完整备份恢复、有明确版本号与发布标记的正式版本。**

本 Plan 完成后，用户获得：

- 一个版本号明确的 V1.0 发布（`v1.0.0`）；
- 一条完整的、可复现的发布验证记录；
- 一个带说明的 GitHub Release + git tag；
- 一套经过真机验证的 PWA 安装 / 离线 / 更新 / 备份恢复行为；
- 冻结的 Cloudflare Pages 生产地址。

## 2. Entry Criteria

进入 Plan 08 前必须成立：

- Plan 00–06：`PASS`；
- Plan 07 / 07R：实现完成并已提交（真机视觉 Release Pass 不再要求提前完成，改为纳入 08C / Acceptance，见下文）；
- `Exercise.category` 收口已完成（41 个精确名称映射 + 只兜底缺失的一次性迁移，见 `7c0b410` 及本 Plan 08A 前修复）；
- 数据库 schema version 仍为 `1`，未新增索引；
- working tree clean，本地与 `origin/master` 同步；
- Cloudflare Pages 生产地址 `https://gym-log-wa6.pages.dev` 已可正常访问；
- 根目录 `AGENTS.md` 的 Git / 测试 / 停止规则已生效。

> 说明：本 Plan 只写 Release 收口的阶段依赖，不重复 `AGENTS.md` 的通用 Git / 测试流程。

## 3. Scope

本 Plan 的完整边界：

1. **版本收口**：确定并落实 `v1.0.0` 版本号；
2. **完整质量门禁**：全量跑通类型 / Lint / 单测 / 构建 / E2E / 格式检查；
3. **PWA 验收**：安装、manifest、图标、standalone 显示、主屏体验；
4. **离线验收**：Service Worker 缓存、断网可用、App Shell 与静态资源命中；
5. **更新验收**：`registerType: 'prompt'` 的提示式更新、回前台复查 SW；
6. **备份恢复验收**：导出 JSON → 导入 replace-all → 完整性校验 → 数据一致；
7. **部署验收**：Cloudflare Pages 生产部署收敛，产物与本地 dist 一致；
8. **Git 收口**：打 `v1.0.0` tag，发布 GitHub Release；
9. **文档同步**：更新 `CURRENT_STATE.md` 与相关文档，记录 V1.0 发布状态。

## 4. Non-negotiable Rules

1. **本 Plan 不新增产品功能** —— 不新加页面、字段、Schema、统计算法、备份格式；
2. **允许修复阻碍既定验收通过的 bug** —— 修复以「让 V1.0 按既有 SPEC / 契约通过验收」为唯一目的，不得借此新增功能、扩展字段或改变产品语义；
3. **不升级 Dexie schema version、不新增数据库索引**；
4. **不修改 `INTENT.md` / `SPEC.md` 的产品语义**（`ARCHITECTURE.md` / `DATA_MODEL.md` 仅在同步已确认工程事实时可改）；
5. **不改变已冻结的页面视觉契约**（`DESIGN_SYSTEM.md`、`UI_ACCEPTANCE.md`、Record Row / New Workout Sheet 契约）；
6. **不 force push、不重写历史、不 amend 已发布 commit**；
7. 任何验收项失败都必须修复后重跑，不得通过降低标准让门禁变绿。

## 5. Tasks

### 08A — Version Finalization & Category Reconcile Fix

- [ ] 确认版本号 `v1.0.0`（`package.json` 的 `version` 字段从 `0.0.0` 更新为 `1.0.0`）；
- [ ] 确认 app 显示名 / manifest `name` / `short_name` 为最终值（`GymLog`）；
- [ ] 确认 manifest `display: 'standalone'`、`theme_color`、`background_color`、图标（any + maskable）无误；
- [ ] 确认无遗留 debug / 开发态占位文案（如 `2026-09 训练次数` 等开发态标签）；
- [ ] **修复 category reconcile 重复覆盖**：已有 category 一律尊重，只对 `category === undefined` 的旧数据兜底（不再每次进入动作页把官方动作强制改回官方值）；
- [ ] 回归测试锁定「手动修改后不被覆盖」与「备份恢复后不被覆盖」。

### 08B — Full Quality Gate

- [ ] `npm run typecheck` 通过；
- [ ] `npm run lint` 通过；
- [ ] `npm run test` 通过（全量单测，含 category 映射 / 迁移 / 备份校验）；
- [ ] `npm run build` 通过；
- [ ] `npm run e2e` 通过（全量 E2E，含 Record Row 密度 / Sheet 溢出 / New Workout 字段 / category 收口）；
- [ ] `npm run format:check` 通过；
- [ ] 记录真实的测试通过数量（单测 N 个、E2E N 个），写进最终报告。

### 08C — PWA Install & Display Acceptance

在 iPhone（主验收 390×844）+ 桌面 Chromium 上验证：

- [ ] 「添加到主屏」后以 standalone 打开，无 Safari 地址栏 / 底部工具栏；
- [ ] 主屏图标显示正确（any 图标 + maskable 图标均正常）；
- [ ] `theme_color` / `background_color` 生效，启动无白屏闪烁；
- [ ] manifest 可被正确解析（`/manifest.webmanifest` 返回合法 JSON）；
- [ ] `viewport-fit=cover` 与 safe-area（顶部 / 底部）在 standalone 下正常；
- [ ] 底部 Tab（`getByRole('navigation', { name: '主导航' })`）触控正常；
- [ ] **07R 真机视觉 Release Pass**：逐页 `REAL_DEVICE_VISUAL_PASS` 确认（Active Workout / 训练首页 / 动作页 / 统计 / 设置 / New Workout Sheet 等），作为 V1.0 视觉冻结的最终门槛。

### 08D — Offline Acceptance

- [ ] 首次加载后，App Shell（`/index.html`）+ JS/CSS + 图标已进入 SW 缓存；
- [ ] 断网（飞行模式）后刷新页面，应用仍可正常打开；
- [ ] 断网下核心功能可用：查看训练历史 / 进入训练详情 / 查看统计 / 查看动作；
- [ ] 断网下可新建训练并本地保存（IndexedDB 数据写入，非 SW Cache）；
- [ ] `navigateFallback: '/index.html'` 生效，深链接 / 刷新不返回 404；
- [ ] 恢复网络后数据仍在（IndexedDB 持久化，不受 SW 缓存影响）。

### 08E — Update Acceptance

- [ ] 确认 `registerType: 'prompt'`（非 autoUpdate），新版本以提示而非强制刷新方式出现；
- [ ] 部署新版本后，用户回前台会重新检查 SW 更新（`34f2f44` 的回前台复查逻辑仍生效）；
- [ ] 用户点「更新」后加载到新版本，带哈希的 `/assets/*` 长缓存正确失效；
- [ ] `cleanupOutdatedCaches: true` 生效，旧 SW 缓存被清理；
- [ ] 验证「旧 SW 在 = 整站旧版」的已知现象不再导致误判（以 SW 更新而非边缘缓存为准）。

### 08F — Backup / Restore Acceptance

数据安全规则（必须遵守）：

- 破坏性 replace-all 恢复测试**优先在独立测试环境执行**（如 E2E 隔离 IndexedDB / 一次性测试数据库），不直接作用于真机正式数据；
- 在真机执行 replace-all 恢复前，**必须先有可验证的完整备份**（已导出 JSON，且导入前已确认其内容完整、可读）。

验收项：

- [ ] 导出：生成完整 JSON（含 `format` / `version` / `exportedAt` + 五实体 + settings）；
- [ ] 导出含 `Exercise.category`（若存在）；
- [ ] 导入：选择合法备份后展示摘要，确认后 replace-all；
- [ ] 完整性校验通过：ID 唯一 / 引用完整 / RecordSchema 合法 / LoadMode 合法 / 日期时间格式 / 数值范围；
- [ ] 导入失败（坏格式 / 坏引用）不留下半套数据（事务回滚，原库保留）；
- [ ] 导入后数据一致：动作（含 category）/ 训练 / 记录 / 设置均与备份一致；
- [ ] 导入含 category 的备份后，category 值正确还原，且后续 reconcile 不覆盖（回归测试锁定）。

### 08G — Cloudflare Pages Deployment Acceptance

- [ ] 生产 `master` 分支 push 后自动部署触发；
- [ ] `gh api repos/LH-scanf/GYM-Log/commits/<SHA>/check-runs` 中 `Cloudflare Pages` conclusion 为 `success`；
- [ ] 线上 `https://gym-log-wa6.pages.dev/` 的 `index.html` 引用 JS/CSS 哈希与本地 `dist/` 一致（重试一次规避边缘未收敛）；
- [ ] `gym-log.pages.dev` / `gymlog.pages.dev` 明确排除，生产地址唯一为 `gym-log-wa6.pages.dev`。

### 08H — Git Tag & GitHub Release

- [ ] 版本更新 commit 合入 `master` 并 push；
- [ ] 打轻量/附注 tag `v1.0.0` 并 push；
- [ ] 创建 GitHub Release `v1.0.0`，标题与 tag 一致；
- [ ] Release 说明包含：V1.0 能力概览、本次发布范围（不含新功能）、已知技术债（见 `docs/CURRENT_STATE.md`）、部署地址；
- [ ] Release 不附带 `dist` / `node_modules` 等构建产物（源码即发布源）。

### 08I — Documentation Sync

- [ ] 更新 `docs/CURRENT_STATE.md`：07R 收口为 PASS，Plan 08 标记完成，V1.0 发布状态；
- [ ] 更新 `docs/plans/08_PWA_RELEASE.md` 的 checklist；
- [ ] 若发布过程中发现需同步的工程事实，更新 `ARCHITECTURE.md` / `DATA_MODEL.md`（不改产品语义）；
- [ ] 最终报告按 `AGENTS.md §9` 格式输出（Task / 实现 / 决策 / 测试结果 / 验收 / Git / Warning / 未完成 / 下一步）。

## 6. Acceptance Criteria

Plan 08 完成时必须满足：

1. 版本号明确为 `v1.0.0`，且 `package.json` 与 Release 一致；
2. 全量质量门禁（typecheck / lint / test / build / e2e / format:check）全部通过；
3. `reconcileExerciseCategories` 只兜底缺失 category，不覆盖已有值；「手动修改后不被覆盖」「备份恢复后不被覆盖」回归测试通过；
4. iPhone 上 PWA 可安装并以 standalone 正常打开，图标与启动体验正确；
5. 07R 真机视觉 Release Pass 逐页确认（`REAL_DEVICE_VISUAL_PASS`），V1.0 视觉冻结；
6. 断网下应用可打开、历史 / 统计 / 动作可查看、可本地新建训练；
7. 版本更新走提示式（prompt），回前台可检测到新版本并正确切换；
8. 备份导出 → 导入 replace-all 全流程可用，失败不破坏原库，category 正确还原且不被覆盖；
9. Cloudflare Pages 生产部署成功，线上产物与本地 `dist` 一致；
10. `v1.0.0` tag 与 GitHub Release 已创建，内容准确；
11. 本 Plan 未引入任何新产品功能（仅修复阻碍验收的 bug），schema version 仍为 `1`，未新增索引。

## 7. Required Test / Review Scenarios

### 7.1 PWA Install / Standalone

```text
iPhone Safari → 分享 → 添加到主屏
→ 从主屏打开 → 无浏览器 UI → 图标 / 启动色正确
```

### 7.2 Offline

```text
首次加载 → 打开飞行模式 → 刷新 → 应用可打开
→ 浏览历史 / 统计 / 动作 → 新建训练并本地保存 → 恢复网络 → 数据仍在
```

### 7.3 Update

```text
旧版本已安装 → 部署新版本 → 回前台 → 出现更新提示 → 点更新 → 加载新版本
```

### 7.4 Backup / Restore

```text
设置 → 导出 JSON → 修改/清空本地数据 → 导入该 JSON → 摘要确认 → 数据完整还原（含 category）
→ 用坏 JSON 导入 → 报错且原库保留
```

### 7.5 Release

```text
版本 commit → push → Cloudflare Pages success → tag v1.0.0 → GitHub Release 可见且内容正确
```

## 8. Out of Scope

Plan 08 不做（不新增产品功能）：

- 新页面 / 新字段 / 新实体；
- 新的默认动作 seed 功能；
- 云账号 / 云同步 / 多用户；
- 新统计口径 / 新图表；
- 新备份格式 / CSV 导出；
- Dark Mode；
- Workout Template；
- RPE / RIR / AI 建议；
- 社交功能；
- 数据库 schema version 升级 / 新增索引。

## 9. Checklist

- [x] 08A Version Finalization（版本号 `1.0.0` 已提交 `a0083f2`；reconcile 修复已提交 `1aa1232`）
- [x] 08B Full Quality Gate（typecheck / lint / test 126 / build / e2e 29 / format:check 全绿）
- [x] 08C PWA Install & Display（含 07R 真机视觉 Release Pass —— 真机验证通过，无问题）
- [x] 08D Offline（真机飞行模式验证通过）
- [x] 08E Update（真机部署后回前台验证通过）
- [x] 08F Backup / Restore（真机备份恢复验证通过，category 正确还原且不被覆盖）
- [x] 08G Cloudflare Pages Deployment（success，线上 index-CQvlQHvm.js 与本地 dist 一致）
- [x] 08H Git Tag & GitHub Release（tag `v1.0.0` + Release 已发布：https://github.com/LH-scanf/GYM-Log/releases/tag/v1.0.0）
- [x] 08I Documentation Sync（CURRENT_STATE 已更新）
- [x] Acceptance Criteria 全部满足
- [x] 本 Plan 专项测试 / Review 完成
- [x] schema version 仍为 `1`、未新增索引

通用自审、文档同步、Commit、Push 由 `AGENTS.md` 负责。

## 10. Next Stage

Plan 08 完成并发布 `v1.0.0` 后：

```text
V1.0 已发布，进入长期维护期
```

后续产品功能（如动作部位字段扩展、排序 UI、模板等）需单独立项，不在 V1.0 范围内。
