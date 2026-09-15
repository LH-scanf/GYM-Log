# GymLog

Mobile-first、Local-first 的健身训练记录 PWA。产品和架构约束以 `docs/` 中的文档为准。

## 开发

```bash
npm install
npm run dev
```

## 质量门禁

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
```

## 目录约定

- `src/features/`：按一级业务模块组织页面和 UI。
- `src/domain/`：纯领域类型与规则，不依赖 React 或浏览器 API。
- `src/data/`：持久化和 Repository 实现；页面不直接访问 IndexedDB。
- `src/statistics/`：只保存纯派生计算逻辑。
- `src/shared/`：跨模块 UI、工具和类型。

文件名使用 kebab-case；React 组件使用 PascalCase 导出；TypeScript 严格模式下禁止显式 `any`。
