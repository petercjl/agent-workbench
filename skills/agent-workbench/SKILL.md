---
name: agent-workbench
description: Publish reviewed work preferences from original Codex, or install, inspect, update and roll back that work environment in codex-own on macOS and Windows. Use for environment lifecycle, not service login or desktop app updates.
---

# 工作环境发布与接收

输入是发布或接收意图、目标设备及可选组件；输出是可审查快照，或附版本、备份、校验和能力缺口的安装结果。原版 Codex 提供来源，codex-own 接收；账号、密钥、聊天和桌面程序各自管理。

## 接收主线

1. 通过 `agent-workbench version`、`capabilities --json`、`skill source --json` 发现当前包和唯一来源。读取 [兼容说明](references/compatibility.md)，核实目标为 codex-own。包不存在时安装准确 npm 包 `@petercjl/agent-workbench`。
2. 运行 `agent-workbench doctor --json` 和 `install` 预览。默认路径由操作系统解析；`--home` 用于明确指定的独立接收目录。原版和共享 Agent 目录禁止写入。
3. 在已授权范围内执行 `install --yes` 或 `update install --yes`。遇到已有非受管文件先解释冲突及备份方案，明确授权接管后才使用 `--adopt`；受管文件被本地修改时停止覆盖。
4. 已有 npm 工具通过 `components list` 选择，执行 `components install --name PACKAGE --yes`。按组件自己的 `skill source` 合同解析来源；工具包安装不代表服务已授权。
5. 检查 `status`、`doctor --json` 及返回的备份、版本和哈希。新建对话或重启 codex-own 验证发现，再完成所需能力的小任务。分别报告安装、发现和真实运行证据。

## 发布主线

原版环境运行 `inventory --json`，在本机检查来源。使用 `export --out NEW_DIRECTORY` 导出白名单的完整 Skill 资源。导出不上传，也不自动复制全局规则。发布者提炼规则并审查差异、依赖与隐私，将快照提交到环境包源码。常规发布动态加载当前 npm-release-kit，执行其 GitHub Actions OIDC 主线，核实准确版本与 dist-tag。随后返回接收主线验证新版本。

## 恢复与边界

- INSTALL_CONFLICT / LOCAL_EDIT：保留现有文件和版本，报告差异；得到明确处理方案后返回步骤 2。
- NPM_FAILED / COMPONENT_CONTRACT：现有环境保持可用；检查网络或组件合同后重试步骤 2。离线使用已安装环境。
- RECOVERY_REQUIRED：保留返回的备份，停止继续更新；按日志恢复并核对哈希。
- 退回版本时先预览 `rollback`，在授权范围内执行 `rollback --yes`，检查后返回步骤 5。
- 缺少原生工具、基础 skill-creator、Python 或服务授权时报告具体缺口；复制 Skill 不代表取得相同运行能力。

每组方法按任务动态加载其完整当前 SKILL.md。组件拥有自己的业务方法，本入口负责生命周期。规则来自用户确认的工作偏好和包内方法；运行时不修改自身适配器，新需求进入独立授权的开发周期。
