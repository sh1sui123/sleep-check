# 安睡管家 Sleep Guardian

睡眠手动记录 → 指标分析 → 作息失调判定 → 循序渐进恢复计划打卡的响应式 Web 应用。

## 功能

- 每日记录：上床时间、起床时间、入睡用时、夜醒时长与次数、睡眠质量；跨零点睡眠与午睡都能正确计算，同一天可再记一次午睡
- 指标分析：近 7 / 30 天的平均睡眠时长、睡眠效率、入睡用时、睡眠债、入睡时间波动；「节律带」逐日显示在床时段与目标起床线；趋势图带目标线与 85% 效率参考线
- 失调判定：入睡时间标准差 > 90 分钟、连续 3 天比目标少睡 ≥ 1.5 小时、工作日与周末睡眠中点差 > 2 小时，任一满足即提示；记录不足 3 天不判定；可暂缓 3 天
- 恢复计划：7～28 天（默认 7～14 天），每天把目标入睡/起床时间提前 15～30 分钟，每日 2～4 项行动；连续 2 天未达标自动放缓、连续 3 天达标自动加快；支持暂停、恢复、终止与前后对比复盘
- 其他：影响因素洞察（样本达 10 天且只陈述相关性）、记录与睡前提醒、深色模式、健康声明、数据导出与清空

## 本地运行

```bash
npm install
npm run dev      # 默认 5173 端口，可加 -- --port 27841
npm run build
npm run lint
```

## 数据与边界

- 单用户应用，数据保存在浏览器 localStorage（命名空间 `sleep-guardian`），不上传、不跨设备同步
- 未接入后端与账号体系：邮箱注册登录、服务端规则引擎、邮件/Push 推送均未实现，Web 推送仅做本地权限申请
- 首页提供「载入示例数据（熬夜型）」，便于在没有真实记录时查看分析与计划效果

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + react-router-dom + recharts。

---

# 项目技术规范

## 技术栈

- 前端: React 19 + TypeScript
- 样式: Tailwind CSS v4
- UI 组件: shadcn/ui `import { Button } from "@/components/ui/button";`
- 图标: lucide-react `import { SearchIcon } from "lucide-react";`
- 图表: echarts-for-react `import ReactECharts from "echarts-for-react";`
- 动画: framer-motion `import { motion } from "framer-motion";`
- 路由: react-router-dom `import { Link, useNavigate } from "react-router-dom";`

---

## 目录结构

```
src/
├── index.tsx            # 入口（勿修改）
├── app.tsx              # 路由配置（仅在 <Routes> 内增删 <Route>）
├── index.css            # 全局样式 + 主题变量
├── components/          # 基础 UI 组件（禁止存放业务组件）
│   ├── layout.tsx       # 全局布局容器（含 <Outlet />）
│   └── ui/              # shadcn/ui 内置组件（勿修改）
├── pages/               # 页面模块（每个页面一个目录）
│   ├── <PageName>/      # 页面目录示例
│   │   ├── PageName.tsx        # 页面入口文件与目录同名
│   │   └── components/         # 页面专属组件
│   └── NotFoundPage/
│       └── NotFoundPage.tsx
├── hooks/               # 自定义 Hooks
└── lib/                 # 工具函数（cn() 等）

public/                  # 静态资源（dev server 原样服务；构建后随 dist/output 同源部署）
```

---

## 模板初始状态

- `app.tsx` 首页路由指向 `pages/HomePage`（占位欢迎页）
- 开发时将 `HomePage` 替换为业务首页，或在 `pages/` 下创建新页面并调整 `index` 路由
- `layout.tsx` 为空壳容器（仅 `<Outlet />`），需根据需求实现导航和布局

---

## 禁止修改的文件

| 文件 | 原因 |
|------|------|
| `src/index.tsx` | Provider 层级 + 样式引入，由模板管理 |
| `src/components/ui/*` | shadcn/ui 内置组件，版本锁定 |

---

## 文件放置规则

| 内容类型 | 放置位置 |
|---------|---------|
| 新页面 | `src/pages/<PageName>/PageName.tsx` |
| 页面专属组件 | `src/pages/<PageName>/components/` |
| 自定义 Hooks | `src/hooks/` |
| 工具函数 | `src/lib/` |
| 静态数据文件 | `public/data/` |
| 静态图片 | `public/images/` |

---

## 导入路径

```typescript
// @/ 别名 → src/
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// public/ 下的静态资源通过 URL 引用（dev 与线上同源）
// <img src="/images/hero.png" />  fetch("/data/config.json")
```

---

## 路由配置

- 新增页面需在 `src/app.tsx` 的 `<Routes>` 内注册 `<Route>`
- `BrowserRouter` 已在 `index.tsx` 中配置，`app.tsx` 中**禁止**再包裹 Router

---

## 主题变量

主题色定义在 `src/index.css`，通过 `:root` CSS 变量 + `@theme inline` 注册到 Tailwind。

| 用途 | Tailwind 类 | CSS 变量 |
|------|------------|----------|
| 页面背景 | `bg-background` | `--background` |
| 主文本 | `text-foreground` | `--foreground` |
| 卡片背景 | `bg-card` | `--card` |
| 次要文本 | `text-muted-foreground` | `--muted-foreground` |
| 主色 | `bg-primary` / `text-primary` | `--primary` |
| 强调色 | `bg-accent` | `--accent` |
| 边框 | `border-border` | `--border` |
| 危险色 | `text-destructive` | `--destructive` |
| 图表色 | `bg-chart-1` ~ `bg-chart-5` | `--chart-1` ~ `--chart-5` |

HSL 格式使用**空格分隔**：`--primary: hsl(150 60% 40%);`
