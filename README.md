# Science Research Work Platform (PhD Master Workspace)

> 博士全周期科研一体化桌面工作台 · Electron + SQLite · 断网可用 · 数据全本地

一个为科研工作者（尤其是博士研究生）打造的跨平台桌面应用：科研打卡、课题里程碑、周期复盘、投稿管理、文献库、五赛道职业规划、每日创新文献推送、Zotero/Overleaf 同步、多格式导出，全部功能离线可用，数据 100% 本地存储。

---

## 功能总览

### 工作台
- **总览首页**：任务/投稿/进度/习惯/成就八项核心卡片，日/周/月统计切换，快捷打卡，今日精选文献推送
- **数据仪表盘**：工时趋势折线图、任务完成率柱状图、里程碑甘特图、投稿状态饼图、月度文献统计，单图一键截图导出 PNG
- **科研打卡与工时**：实验/文献/写作/数据/汇报分类计时，请假自动剔除，日/周/月统计

### 课题与论文
- **课题核心管理**：课题档案 + 论文总进度环 + 全周期甘特图
- **毕业论文整体进度**：里程碑按权重自动计算进度，支持手动微调
- **里程碑台账**：预设节点 + 自定义节点、附件、遗留问题，碎片化进展速记自动进入复盘

### 毕业与职业（五赛道并行规划）
- **五赛道毕业规划**：按期毕业（底线）/ 海外深造 / 企业就业 / 高校教职 / 公共部门，博一~博五逐年清单、完成度统计、阶段节点复盘、调整计划一键生成任务
- **完全个性化**：五条赛道只是通用模板，赛道名称、逐年清单、情报来源、书单、课题组全部可以在应用内自由增删改，预置内容仅为演示
- **赛道情报推送**：五个赛道文件夹，每 3 个月自动推送一轮（奖学金 / 招聘 / 基金 / 时政）；预置条目仅为示例，鼓励添加自己关心的推送源与感兴趣的内容，支持记录关键信息与感悟
- **海外课题组跟踪**：导师主页、研究方向、偏好学生特质，一键从 PubMed 拉取课题组最新论文
- **平日灵感库**：日记随笔，支持导入本地图片，灵感随时存档
- **分模块书单**：科研必读 + 文社科经典（政治/经济/心理学/哲学），每半年自动精推 2 本，读完记录感受

### 任务与投稿
- **任务管理中心**：待办/进行中/完成看板，周计划一键下发
- **投稿全生命周期**：待投稿 → 投递中 → 外审 → 返修 → 录用 → 见刊

### 文献与同步
- **文献管理专区**：本地文献库、标签、精读笔记、一键打开原文/PDF
- **创新精选文献**：每日少而精推送（默认 ≤5 篇），覆盖生物/医学/材料/AI 交叉，arXiv + PubMed 多源检索 + 创新度筛选，3 天未读弹窗提醒，笔记一键导入周复盘，一键推送 Zotero
- **Zotero 双向同步**：官方 API，元数据 + PDF 附件下行，笔记/标签反向回写，支持指定文件夹
- **Overleaf 写作同步**：写作时长归入「论文撰写」工时，版本节点标记为课题进展，支持 JSON 导入

### 复盘与导师
- **每周/月总结复盘**：自动抓取工时、任务、投稿、文献、进展预填充模板，「本期重点」自定义，外部重要文件导入存档，核心点列表化展示，一键导出 Word/PDF
- **导师向上管理**：沟通纪要、待咨询问题一键导入周复盘、组会/月度汇报草稿模板

### 辅助与成就
- **健康与学习辅助**：作息/情绪/运动/英语打卡，久坐提醒，备考倒计时
- **成就殿堂**：连续打卡、里程碑通关、论文录用等勋章
- **数据管理与设置**：手动/定时备份（1/3/7 天）、JSON 全量导入导出、双主题（静谧蓝/活力橙）、久坐与工作闹钟提醒、Notion/石墨/网盘拓展接口预留

### 全局命令行（Ctrl+K）

```text
/clock        快速启动科研打卡      /weekly          新建本周复盘
/monthly      新建月度复盘          /milestone       录入里程碑
/task         新建任务              /literature      录入精读笔记
/zotero-sync  Zotero 双向同步       /overleaf-sync   Overleaf 同步
/export-excel 全量导出 Excel        /tutor           记录导师沟通
/innovate-ref 创新文献专区          /refresh-innovate 刷新今日精选
/career       五赛道毕业规划
```


## 界面预览

| 总览首页 | 数据仪表盘 |
| --- | --- |
| ![总览首页](docs/images/overview.png) | ![数据仪表盘](docs/images/dashboard.png) |

| 里程碑台账 | 五赛道毕业规划 |
| --- | --- |
| ![里程碑台账](docs/images/milestones.png) | ![五赛道毕业规划](docs/images/career.png) |

| 赛道情报推送 | 创新精选文献 |
| --- | --- |
| ![赛道情报推送](docs/images/careerInfo.png) | ![创新精选文献](docs/images/innovation.png) |

| 文献管理专区 | 每周总结复盘 |
| --- | --- |
| ![文献管理专区](docs/images/literature.png) | ![每周总结复盘](docs/images/weekly.png) |

| 导师向上管理 | 数据管理与设置 |
| --- | --- |
| ![导师向上管理](docs/images/advisor.png) | ![数据管理与设置](docs/images/settings.png) |

<details>
<summary>更多界面截图</summary>

| 科研打卡与工时 | 课题核心管理 |
| --- | --- |
| ![科研打卡与工时](docs/images/clock.png) | ![课题核心管理](docs/images/project.png) |

| 毕业论文整体进度 | 任务管理中心 |
| --- | --- |
| ![毕业论文整体进度](docs/images/thesis.png) | ![任务管理中心](docs/images/tasks.png) |

| 投稿全生命周期 | Zotero / Overleaf 同步 |
| --- | --- |
| ![投稿全生命周期](docs/images/submissions.png) | ![Zotero 同步](docs/images/zotero.png) |

| 月度总结复盘 | 导师向上管理（问题归集） |
| --- | --- |
| ![月度总结复盘](docs/images/monthly.png) | ![导师向上管理](docs/images/advisor.png) |

| 海外课题组跟踪 | 平日灵感库 |
| --- | --- |
| ![海外课题组跟踪](docs/images/careerLabs.png) | ![平日灵感库](docs/images/careerInspire.png) |

| 分模块定向书单 | 健康与学习辅助 |
| --- | --- |
| ![分模块定向书单](docs/images/careerBooks.png) | ![健康与学习辅助](docs/images/health.png) |

| 成就殿堂 | 科研打卡页 |
| --- | --- |
| ![成就殿堂](docs/images/achievements.png) | ![科研打卡](docs/images/clock.png) |

</details>

## 安装与运行

环境要求：Node.js ≥ 18（推荐 20/22），npm ≥ 9

```bash
npm install
npm start
```

首次启动自动创建 SQLite 数据库并写入一套演示数据，删除 `data/` 目录即可重置。

### 便携模式（数据跟随程序目录）

应用默认把所有数据（数据库、附件、备份、缓存）保存在程序目录下的 `data/` 文件夹中。把整个项目文件夹放到任意位置（如 D 盘），数据就跟随所在盘，不写入系统用户目录。

### 打包

```bash
npm run build:win   # Windows NSIS 安装包
npm run build:mac   # macOS DMG
```

SQLite 使用纯 WASM 实现（sql.js），打包与安装不依赖本地编译工具链。

## 数据说明

- 所有业务数据保存在 `data/phd-workspace.db`（SQLite）
- 导入的附件（PDF/图片）保存在 `data/attachments/`
- 自动备份保存在 `data/backups/`（保留最近 20 份）
- 第三方同步数据仅作为新记录写入，不覆盖本地自建数据
- 断网环境下除在线检索/同步外全部功能可用

## 自定义指南

- **加一个导航页面**：在 `src/renderer/js/views-*.js` 中编写 `render()` + `mount()`，注册到 `window.viewsXxx`，再在 `src/renderer/js/app.js` 的 `NAV` 数组中加一项即可
- **加一张数据表**：在 `src/main/db.js` 的 `SCHEMA` 与 `TABLES` 中注册，即自动获得通用增删改查 IPC
- **调整每日/季度/半年推送**：修改 `src/main/seed.js` 中的 `QUARTERLY_INFO_POOL` / `BOOK_PUSH_POOL`，或直接在应用设置界面配置
- **主题与提醒**：全部在应用内「数据管理与设置」页面可视化配置

## 技术栈

Electron · sql.js (SQLite WASM) · 原生 HTML/CSS/JS 渲染层 · docx (Word 导出) · xlsx (Excel 导出) · Electron printToPDF

## 目录结构

```
src/
  main/            Electron 主进程
    db.js          SQLite 存储层（白名单 CRUD + 迁移）
    seed.js        演示数据与默认配置
    ipc.js         IPC 接口注册
    services/      统计 / 复盘 / 导出 / 备份 / 第三方同步 / 规划推送 / 提醒
  preload/         contextBridge 安全桥接
  renderer/        纯 HTML/CSS/JS 渲染层
scripts/           辅助脚本
```

## License

MIT
