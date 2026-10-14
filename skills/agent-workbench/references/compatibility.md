# 兼容与状态

安装器要求 Node.js 22+。macOS 默认接收目录是 `~/Library/Application Support/codex-own-independent/core`；Windows 是 `%LOCALAPPDATA%\codex-own-independent\core`。执行时由 CLI 解析系统路径。

发布快照包含 portable-skill-creator、cross-agent-npm-package-development、visual-project-planner、skill-forward-test 及本入口。来源与文件哈希记录在 profiles/source-manifest.json。

环境包负责规则和 Skill 生命周期；组件包负责具体能力；宿主负责命令、文件、浏览器与生成工具；本机配置负责路径和授权。

- portable-skill-creator 依赖宿主当前的基础 skill-creator。本包不复制基础创建器；缺失时需按当前宿主的正式安装方式解决。Python 验证脚本需要本机 Python。
- visual-project-planner 的 Node.js 渲染器随包提供。其原生 Codex HTML 面板在 codex-own 中仍需确认；不可用时按原 Skill 的失败分支交付真实文件链接，报告未完成目视验收。
- skill-forward-test 依赖宿主隔离 Agent 能力，并要求用户明确授权回归。
- npm 发布、图像、视频、钉钉、浏览器及知识库需要各自工具与授权；按对应当前 Skill 检查，缺失则明确报告。

安装完成、CLI 检查、宿主发现、真实任务成功分别提供证据。安装器或 CI 测试不替代新对话中的业务验收。
