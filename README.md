# TRPGGrid - 跑团生涯个人喜好表

TRPGGrid 是一个简单的Web应用，让您可以创建和分享个人游戏喜好网格。通过简单的界面，您可以排列游戏，展示您的游戏品味。

## 项目特点

- **个性化游戏网格**: 创建您独特的游戏排名表格
- **多源搜索功能**: 支持从 SteamGridDB 和 Bangumi 搜索游戏封面
- **分享功能**: 一键生成图片，展示您的游戏品味
- **响应式设计**: 适配各种设备

## 技术栈

- [Next.js](https://nextjs.org/) - React框架
- [React](https://reactjs.org/) - 用户界面库
- [TypeScript](https://www.typescriptlang.org/) - 类型系统
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架

## 快速开始

克隆仓库并安装依赖项：

```bash
git clone https://github.com/yourusername/gamegrid.git
cd gamegrid
npm install
```

运行开发服务器：

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 环境变量

创建`.env.local`文件，添加以下配置：

```bash
# SteamGridDB API配置
STEAMGRIDDB_API_KEY=your_steamgriddb_api_key

# Bangumi API配置
BANGUMI_ACCESS_TOKEN=your_bangumi_access_token
BANGUMI_USER_AGENT=your_user_agent
```

### API密钥获取方式

- **SteamGridDB API Key**: 
  1. 访问 [SteamGridDB](https://www.steamgriddb.com/)
  2. 注册并登录账号
  3. 在个人设置中申请 API 密钥

- **Bangumi Access Token**:
  1. 访问 [Bangumi API](https://bangumi.github.io/api/#/%E6%9D%A1%E7%9B%AE/getCalendar)
  2. 登录并创建应用
  3. 获取 Access Token
  4. 设置合适的 User Agent（参考[bangumiUA指南](https://github.com/bangumi/api/blob/master/docs-raw/user%20agent.md)）

## 开发历程

本项目使用GitHub Copilot辅助开发，提高了开发效率和代码质量。

## 致谢

- 特别感谢[游戏生涯个人喜好表（已下线）](https://gamegrid.azurewebsites.net)项目的灵感，本项目是对该创意的致敬

## 许可证

MIT许可证 - 详情请参阅[LICENSE](LICENSE)文件
