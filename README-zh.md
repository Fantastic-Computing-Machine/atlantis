# 🔱 atlantis

用于 Mermaid.js 图表、笔记和知识管理的自托管平台。使用 Next.js 16（App Router）、Tailwind CSS v4 和 Shadcn UI 构建。

![Atlantis Preview](/public/preview.png)

---

[![Build and Publish Docker Image](https://github.com/Fantastic-Computing-Machine/atlantis/actions/workflows/docker-publish.yml/badge.svg?branch=master)](https://github.com/Fantastic-Computing-Machine/atlantis/actions/workflows/docker-publish.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/strikead/atlantis)](https://hub.docker.com/r/strikead/atlantis)
[![Docker Image Size](https://img.shields.io/docker/image-size/strikead/atlantis/latest)](https://hub.docker.com/r/strikead/atlantis)

[![GitHub Issues](https://img.shields.io/github/issues/Fantastic-Computing-Machine/atlantis)](https://github.com/Fantastic-Computing-Machine/atlantis/issues)
[![Last Commit](https://img.shields.io/github/last-commit/Fantastic-Computing-Machine/atlantis)](https://github.com/Fantastic-Computing-Machine/atlantis/commits/master)
[![Repo Views](https://visitor-badge.laobi.icu/badge?page_id=Fantastic-Computing-Machine.atlantis)](https://github.com/Fantastic-Computing-Machine/atlantis)

[![Docker Hub](https://img.shields.io/badge/View_on-Docker_Hub-blue?logo=docker&logoColor=white)](https://hub.docker.com/r/strikead/atlantis)

## 功能特性

- 现代编辑器，支持实时 Mermaid 预览和检查点（保留 15 个最近版本）。
- 笔记工作区，支持 Markdown/LaTeX/代码模式、交互式待办列表、标签和搜索。
- 完整的 Mermaid 支持，加上 SVG/PNG/PDF 导出和收藏功能。
- 通过 SQLite 本地持久化（data/atlantis.db），可选 PostgreSQL/MySQL（通过环境变量）。
- 可选 Redis 缓存；亮色/暗色主题；备份/恢复到 JSON。

## 演示

![Walkthrough](docs/screenshots/walkthrough.gif)

## 快速开始（Docker）

```bash
docker run -d -p 3000:3000   -v $(pwd)/data:/app/data   --name atlantis   strikead/atlantis:latest
```

- 浏览器访问 <http://localhost:3000>

## 功能详情

### 图表编辑器

- 实时 Mermaid 预览
- 检查点系统（保留 15 个最近版本）
- SVG/PNG/PDF 导出
- 收藏功能

### 笔记工作区

- Markdown 编辑
- LaTeX 公式支持
- 代码模式
- 交互式待办列表
- 标签和搜索

### 数据持久化

- 默认使用 SQLite
- 可选 PostgreSQL/MySQL
- 备份/恢复到 JSON

### 主题

- 亮色主题
- 暗色主题
- 自动跟随系统

## 环境变量

```bash
# 数据库配置（可选）
DATABASE_URL=postgresql://user:password@localhost:5432/atlantis

# Redis 配置（可选）
REDIS_URL=redis://localhost:6379

# 端口配置
PORT=3000
```

## Docker Compose

```yaml
version: '3.8'

services:
  atlantis:
    image: strikead/atlantis:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/atlantis
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=atlantis
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/Fantastic-Computing-Machine/atlantis.git
cd atlantis

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build

# 启动
npm start
```

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 许可证

MIT

---

> 项目地址：[Fantastic-Computing-Machine/atlantis](https://github.com/Fantastic-Computing-Machine/atlantis)
> Docker Hub：[strikead/atlantis](https://hub.docker.com/r/strikead/atlantis)
