# Plan 06 — Import / Export

> 目标：把 Plan 01 已有 Backup v1 正式暴露给用户，完成 JSON 导出、校验、摘要确认与原子 replace-all 恢复。

## 1. Goal

让 GymLog 的 Local-first 数据具备用户可控的完整备份/恢复能力：

```text
设置
├─ 导出 JSON 备份
└─ 导入 JSON
   ├─ 解析
   ├─ 完整校验
   ├─ 摘要
   ├─ 二次确认
   └─ 原子 replace-all
```

不做 merge，不做云同步。

## 2. Entry Criteria

- Plan 00–05：PASS
- Backup v1 / validation / atomic restore 已由 Plan 01 落地
- 数据库 schema version 仍为 1
- UI 不直接操作 Dexie
- 以根目录 `AGENTS.md` 为执行规则

## 3. Tasks

### 06A — Backup Application API
- [ ] 审计并复用现有 Backup v1，不重新发明格式
- [ ] 为 UI 提供 Application / Use Case API
- [ ] 导出包含全部 canonical data
- [ ] 不导出统计缓存、UI draft 等派生/临时数据
- [ ] 保留 `format` / `version` / `exportedAt`

### 06B — Export UI
- [ ] 设置页新增“导出备份”
- [ ] 生成 UTF-8 JSON
- [ ] 文件名类似 `gymlog-backup-2026-09-15.json`
- [ ] Chrome / iPhone PWA 可进入下载或系统分享/保存流程
- [ ] 成功/失败反馈明确
- [ ] 成功导出后更新并显示 `lastBackupAt`
- [ ] 导出失败不得更新 `lastBackupAt`

### 06C — Import / Parse
- [ ] 用户手动选择 JSON
- [ ] 解析错误明确提示
- [ ] 选择文件后不立即覆盖
- [ ] 当前数据库在解析/校验阶段完全不变

### 06D — Full Validation
至少验证：
- [ ] `format`
- [ ] `version`
- [ ] 必需数据区
- [ ] 实体类型与 ID 唯一性
- [ ] Exercise.familyId 外键
- [ ] Block.sessionId / exerciseId 外键
- [ ] Record.exerciseBlockId 外键
- [ ] Workout 日期/时间
- [ ] Record 数值/字段合法性
- [ ] order
- [ ] Settings

校验失败：不进入恢复事务、不修改现有数据库。

### 06E — Import Summary
校验通过后展示：
- [ ] exportedAt
- [ ] 动作族数量
- [ ] 动作数量
- [ ] WorkoutSession 数量
- [ ] ExerciseBlock 数量
- [ ] ExerciseRecord 数量

### 06F — Replace-all Confirmation
- [ ] 明确提示“将完整替换当前设备上的 GymLog 数据”
- [ ] 必须二次确认
- [ ] 取消后零写入
- [ ] 不实现 merge / conflict resolution

### 06G — Atomic Restore
- [ ] 复用 Plan 01 原子恢复
- [ ] 全部校验成功后才进入 transaction
- [ ] 任意写入失败 rollback
- [ ] 成功后 UI 立即重新读取恢复后的数据
- [ ] 恢复成功后历史/统计/动作页无需数据库迁移即可工作

### 06H — Settings UX
设置页明确说明：
- [ ] V1 数据主要保存在当前设备 IndexedDB
- [ ] 清站点数据等操作可能造成数据丢失
- [ ] 建议定期导出 JSON
- [ ] 导入是整库替换，不是合并
- [ ] 移动端按钮/确认弹窗安全区正常

### 06I — Real-device
- [ ] 桌面 Chrome 导出/导入可用
- [ ] iPhone Safari / PWA 可导出
- [ ] iPhone Files 可选择 JSON 导入
- [ ] 文件选择器切出/返回后流程不丢失
- [ ] Cloudflare Pages 环境不依赖后端 API

## 4. Acceptance

Plan 06 完成时：
1. 可以完整导出 GymLog JSON
2. 可以看到最近备份时间
3. 合法备份先显示摘要再确认
4. 非法 JSON / format / version / FK 被拒绝
5. 导入失败当前数据库保持不变
6. 合法导入 replace-all 后数据完整恢复
7. 恢复后训练、动作、历史、统计正常读取
8. 不新增云同步、后端或数据库表
9. schema version 仍为 1
10. iPhone PWA 基础备份/恢复路径可用

## 5. Required Tests

- Export complete dataset
- Export → Import round trip
- Invalid JSON
- Wrong format / unsupported version
- Broken foreign key
- Atomic rollback
- Replace-all：A 库被 B 备份完整替换
- `lastBackupAt`：只在成功导出后更新
- Mobile E2E：设置 → 导出 → 选 fixture → 摘要 → 确认恢复 → 验证数据

原 Plan 00–05 回归测试必须继续通过。

## 6. Out of Scope

- 云同步 / OneDrive / iCloud
- 登录 / 多用户
- merge restore
- conflict resolution
- 增量备份
- CSV 恢复
- 自由文本解析
- 后端 API
- 全站 UI 重构

## 7. Checklist

- [x] 06A Backup Application API
- [x] 06B Export UI
- [x] 06C Import / Parse
- [x] 06D Full Validation
- [x] 06E Import Summary
- [x] 06F Replace-all Confirmation
- [x] 06G Atomic Restore
- [x] 06H Settings UX
- [x] 06I Real-device（移动端浏览器 E2E；iPhone PWA 使用标准文件选择/下载接口）
- [x] Acceptance 全部满足
- [x] 专项测试完成
- [x] Plan 00–05 Regression 通过
- [x] schema version 仍为 1

## 8. Next Stage

建议下一阶段改为：

```text
Plan 07 — UI/UX Polish & Design System
Plan 08 — PWA Release
```

Plan 07 集中统一视觉与交互；不再把全站 UI 重构混进功能 Plan。
