# codex-own 接收和更新指南

需要 Node.js 22 或更新版本及 npm；先通过系统支持的安装方式安装 Node.js LTS。第一次运行会从 npm 下载包，检查后使用本机缓存。所有工作环境发行资源来自 npm。

## macOS Terminal

预览将要安装的文件：

```sh
npx --yes @petercjl/agent-workbench@latest install
```

确认预览后安装：

```sh
npx --yes @petercjl/agent-workbench@latest install --yes
```

## Windows PowerShell

预览：

```powershell
npx.cmd --yes @petercjl/agent-workbench@latest install
```

安装：

```powershell
npx.cmd --yes @petercjl/agent-workbench@latest install --yes
```

使用 npx.cmd 可避免 PowerShell 对 npm 的 .ps1 启动脚本执行策略产生影响。

## 更新

Mac：

```sh
npx --yes @petercjl/agent-workbench@latest update check
npx --yes @petercjl/agent-workbench@latest update install --yes
```

Windows：

```powershell
npx.cmd --yes @petercjl/agent-workbench@latest update check
npx.cmd --yes @petercjl/agent-workbench@latest update install --yes
```

更新会部署新规则和方法，并检查已选组件的稳定版本。离线时已安装的规则和 Skill 继续保留。日常执行任务不自动更换版本。

安装后新建对话或重启 codex-own；运行以下命令检查实际部署。Windows 将 npx 换为 npx.cmd：

```sh
npx --yes @petercjl/agent-workbench@latest status
npx --yes @petercjl/agent-workbench@latest doctor --json
```

## 已有文件、组件与回滚

遇到 UNMANAGED_TARGET 时，检查现有文件；确定接管后在安装命令追加 `--adopt`。接管前保存备份。LOCAL_EDIT 表示有人修改受管文件，应先比较并合并内容，不能强制覆盖。

通过 `components list` 查看已登记工具，再用 `components install --name @petercjl/工具包名 --yes` 安装所需组件。组件采用自己的 canonical Skill 来源，安装生命周期脚本默认关闭；原生依赖与服务授权需按组件指南另行检查。部分组件合同可能尚未兼容，失败会保留原有环境并报告 COMPONENT_CONTRACT。

使用 `rollback` 预览恢复，再使用 `rollback --yes` 执行。每次操作返回实际备份目录；保留该目录以便恢复。连续回滚会回到上一次操作前的状态，包含回滚操作本身。

默认部署目录：Mac 为 `~/Library/Application Support/codex-own-independent/core`；Windows 为 `%LOCALAPPDATA%\codex-own-independent\core`。其中 AGENTS.md 和 skills 由本包管理，`.agent-workbench` 存放版本、备份、组件和更新管理器。config.toml、auth.json、数据库、对话及项目不迁移。发布方的原版和共享 Agent 目录受安装器保护。

Skill 描述工作方法；图像、浏览器、服务与基础创建器的能力由宿主及依赖提供。doctor 的警告需要按用途处理，不应解释为已取得原版全部能力。
