# 原版 Codex 发布工作环境

原版 Codex 是来源；codex-own 是接收方。发布以经审查的快照为单位，原版中的所有目录不会自动上传。

## 给原版 Agent 的提示词

> 请使用 @petercjl/agent-workbench 检查原版 Codex 的工作规则和 Skill 变化，提炼可发布内容，更新工作环境包并发布稳定版本。

执行时读取当前 agent-workbench 和 npm-release-kit Skill。发布之前检查来源、用户授权、包内容和测试；公开包只能包含可分发内容。

## 开发者命令参考

```sh
agent-workbench inventory --json
agent-workbench export --out ./reviewed-export
```

export 仅导出 source-manifest.json 白名单中的四组 Skill 及完整运行资源，拒绝覆盖已有输出。原版文件保持不变；不会读取认证、聊天或数据库。清单中的 npm 工具仍由原工具包维护。

将新导出目录与仓库 skills 比较，审查路径、链接、脚本、依赖、许可和敏感内容，再将确认的 Skill 快照与对应 source-manifest.json 提升到仓库。不要编辑安装到 codex-own 中的副本来代替发布。全局规则在 profiles/AGENTS.md 中手工提炼，真实本机路径和公司专属配置留在本地。

修改 npm 组件选择时更新 profiles/components.json；组件方法变更由组件自己的包发布。本包记录其来源并在显式统一更新时解析稳定版本。

```sh
npm test
npm run check
npm pack --dry-run --json
npm-release-kit doctor --root . --json
```

检查通过后提交源码。常规发布使用仓库的 GitHub Actions OIDC 工作流，稳定版本使用 latest。新包初次建立按 npm-release-kit 当前说明进行一次独立占位发布，再配置 Trusted Publisher；正式内容和后续版本通过工作流发布。发布后确认 npm 上的准确版本与 latest，再在 Mac 和 Windows 接收端验证安装、更新、发现及代表性任务。

原版新习惯不会自动成为公共规则：先提炼和审查，再发布。公司知识、个人机器路径和原生宿主工具适配均需单独判断；不得将可读文件等同于可公开发布内容。
