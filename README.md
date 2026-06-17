# Visa Bulletin 查询

一个轻量的美国移民排期查询工具，用于按月份查看美国国务院 Visa Bulletin 历史数据，并显示相较上月的排期变化。

## 功能

- 按年份、月份、类别查询排期
- 支持亲属移民和职业移民
- 显示 Final Action Dates 和 Dates for Filing
- 显示每个日期相较上月前进、倒退或持平的天数
- 数据按年度 JSON 文件存储，查询时优先读取本地数据
- GitHub Actions 可定时检查并补充新月份数据

## 数据

数据来源为美国国务院 Visa Bulletin：

https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html

已收录范围会根据 `data/visa-bulletins/` 中的年度数据自动计算，并显示在页面顶部。

数据文件位于：

```text
data/visa-bulletins/
```

每年一个文件，例如：

```text
data/visa-bulletins/2026.json
```

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

打开：

```text
http://localhost:5173/
```

本地开发时，Vite 会同时处理 `/api/visa-bulletin` 接口。

## 构建

```bash
npm run build
```

## 更新数据

更新指定月份：

```bash
npm run update-bulletin -- 2026 7
```

回填一段月份数据：

```bash
npm run backfill-bulletins -- 2026 7 2001 12
```

脚本会优先跳过已经存在的数据，并把新增数据写入对应年度 JSON 文件。

## 自动更新

项目包含 GitHub Actions：

```text
.github/workflows/update-visa-bulletin.yml
```

它会定时检查近期月份，如果发现官方已发布新数据，会自动生成 JSON 并提交到仓库。

## 部署

项目适合部署到 Vercel。Vercel 函数会读取 `data/visa-bulletins/**` 中的年度数据文件。

## 说明

本工具仅供信息参考。移民排期和递件规则请以美国国务院、USCIS、NVC 等官方通知为准。
