# Plan 00 — Project Bootstrap

> 目标：建立 GymLog 的可持续开发骨架。  
> 本阶段不实现正式健身业务，只保证项目可以稳定运行、测试、构建和作为 PWA 安装。

## 1. 输入文档

实施前应阅读：

- `../INTENT.md`
- `../SPEC.md`
- `../ARCHITECTURE.md`
- `../DATA_MODEL.md`

本 Plan 不允许修改这些文档已经确定的产品语义。

---

## 2. 技术基线

V1 推荐基线：

```text
React
TypeScript
Vite
React Router
Dexie（01 阶段正式接入）
vite-plugin-pwa
Recharts（05 阶段使用）
Vitest
React Testing Library
Playwright
ESLint
Prettier
```

说明：

- 00 阶段可以安装 Dexie，但不建立正式业务表；
- Recharts 可以延后安装，不是 Bootstrap 完成条件；
- 不引入 Redux 级全局状态框架作为前提；
- 不引入后端服务。

---

## 3. 目标目录结构

建议初始目录：

```text
GymLog/
├─ docs/
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ router/
│  │  └─ layout/
│  ├─ pages/
│  │  ├─ workouts/
│  │  ├─ statistics/
│  │  ├─ exercises/
│  │  └─ settings/
│  ├─ domain/
│  ├─ application/
│  ├─ data/
│  ├─ statistics/
│  ├─ components/
│  ├─ hooks/
│  ├─ utils/
│  └─ styles/
├─ tests/
│  └─ e2e/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ playwright.config.ts
```

约束：

- 页面组件不能直接操作 IndexedDB；
- `domain/` 不依赖 React；
- `data/` 负责持久化实现；
- `statistics/` 后续保持为纯计算逻辑；
- 页面壳先建好，但不提前塞模拟业务规则。

---

## 4. Task 00A — 初始化工程

### 工作项

- 使用 Vite 创建 React + TypeScript 工程；
- 配置 package scripts；
- 建立 Git 仓库（如果目录尚未初始化）；
- 建立 `.gitignore`；
- 保证 Windows 开发环境可正常安装和构建。

### 推荐 scripts

```text
dev
build
preview
typecheck
test
test:watch
e2e
lint
format
```

### 验收

- `npm run dev` 可以启动；
- `npm run build` 成功；
- `npm run typecheck` 成功。

---

## 5. Task 00B — 建立应用壳和路由

建立底部四 Tab：

```text
训练 | 统计 | 动作 | 设置
```

V1 路由建议：

```text
/
/workouts/:sessionId
/statistics
/statistics/exercises/:exerciseId
/exercises
/exercises/new
/exercises/:exerciseId
/settings
```

00 阶段只需要 Placeholder 页面。

### 验收

- 四个主页面可以切换；
- 浏览器刷新后仍可进入当前路由；
- 手机宽度下底部导航不溢出；
- 不存在桌面布局才能使用的阻塞性设计。

---

## 6. Task 00C — 基础 UI 约束

建立极简基础视觉变量，不做完整 Design System。

至少统一：

- 页面最大宽度；
- 页面 padding；
- 卡片圆角；
- 表单高度；
- 字体大小层级；
- 底部安全区；
- iPhone `env(safe-area-inset-bottom)`；
- 深浅背景的基础变量。

要求：

- Mobile First；
- 输入框和按钮适合健身时单手点击；
- 不把 hover 当成必需交互；
- 不使用过小点击区域。

---

## 7. Task 00D — PWA 基础

配置 `vite-plugin-pwa`。

目标：

- 可生成 manifest；
- 可添加到主屏幕；
- App Shell 在安装/缓存后离线打开；
- 不缓存任何“虚假的业务数据”；
- Service Worker 更新不强制打断正在训练的页面。

更新策略暂定：

```text
检测到新版本
    ↓
显示“有新版本可用”提示
    ↓
[稍后] [更新]
```

禁止训练过程中自动刷新页面。

### 验收

- production build 能注册 Service Worker；
- 离线情况下可打开应用壳；
- 更新事件可以被 UI 感知，至少提供未来挂接入口。

---

## 8. Task 00E — 测试框架

建立：

- Vitest；
- React Testing Library；
- Playwright。

00 阶段至少有：

1. 一个纯 TypeScript 单元测试；
2. 一个 React 页面渲染测试；
3. 一个 Playwright smoke：打开首页并切换 Tab。

目的不是追求覆盖率，而是保证后续阶段从第一天就能写自动化测试。

---

## 9. Task 00F — 工程质量门禁

配置：

- TypeScript strict；
- ESLint；
- Prettier；
- 统一 import/文件命名约定；
- 禁止明显的 `any` 漫延。

建议 CI/本地提交前最小门禁：

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

---

## 10. 明确不做

00 阶段禁止顺手实现：

- 动作 CRUD；
- WorkoutSession 正式逻辑；
- IndexedDB 业务表；
- 统计；
- JSON 导入导出；
- OneDrive；
- 登录；
- 云同步；
- 复杂主题系统。

---

## 11. 完成条件

只有全部满足才可进入 01：

- [ ] 项目可启动；
- [ ] production build 成功；
- [ ] TypeScript strict 无错误；
- [ ] 四 Tab 路由壳完成；
- [ ] PWA manifest / service worker 工作；
- [ ] 离线可打开应用壳；
- [ ] Vitest 可运行；
- [ ] Playwright smoke 可运行；
- [ ] 目录结构与 `ARCHITECTURE.md` 一致；
- [ ] 没有提前把业务逻辑写进 React 页面组件。

完成后进入：`01_DATA_FOUNDATION.md`。
