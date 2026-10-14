# @petercjl/agent-workbench

从原版 Codex 提炼并发布工作习惯和 Skill，让 macOS 与 Windows 的 codex-own 接收同一套工作方法。桌面应用、服务登录、API 配置与聊天记录各自独立。

第一版提供通用工作规则、工作环境管理入口和四组方法 Skill：portable-skill-creator、cross-agent-npm-package-development、visual-project-planner、skill-forward-test。另有已识别 npm 工具的组件清单，可按需安装。清单不是全部工具已迁移或已验证的承诺。

## 让 Agent 安装或更新

安装提示词：

> 请安装 @petercjl/agent-workbench，将工作环境部署到 codex-own。

更新提示词：

> 请使用 @petercjl/agent-workbench 更新 codex-own 的工作环境。

检查提示词：

> 请使用 agent-workbench 检查 codex-own 的工作环境，说明缺少的依赖与能力。

详细流程见 [接收方指南](docs/receiver.md)；原版的提炼、导出、审查和发布见 [发布方指南](docs/publisher.md)。无 Agent 环境也可使用接收方指南中的 Terminal / PowerShell 命令。

安装器保护用户改动，更新建立备份并校验哈希，支持回滚。首次遇到已有文件时需要明确接管，受管文件发生本地修改时停止覆盖。安装工具不授予服务权限。

本包以公开、经审查内容为发行基线；个人路径、公司文档地址、凭据和会话留在本机。组件默认按需选择，不自动安装全部工具。
