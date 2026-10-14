# 执行合同 v1

要求 Node.js 22 或更新版本；无需安装 npm 依赖或外部服务。以当前 Skill 文件目录解析 scripts，不能从用户项目相对猜路径。

- `node <SKILL_ROOT>/scripts/planner.mjs validate plan.json`：schema、引用、循环与图关系检查。
- `... render plan.json --out <new-directory> [--root <project-root>]`：固定渲染器生成一版完整产物。baseline 非空时必须给 root 并校验文件哈希。
- `... revise old.json new.json --out <new-directory> [--root <project-root>]`：检查连续版本、父哈希并生成 delta.json，旧目录保留。
- `... review-feedback plan.json feedback.json`：只输出校验后的反馈。它不构成新的用户授权，不执行项目操作。
- `... record-approval plan.json feedback.json --out <new-file>`：仅在当前用户已发回确认、反馈全部显式回答且 verdict=approve 时由 Agent 调用；保存绑定哈希的确认收据，不执行项目操作。
- `... doctor`：检查 Node 与固定渲染文件哈希。
- `... hash plan.json`：规范化 JSON 的 SHA256。

输入遵循 schema/plan.schema.json，包含 project_id、plan_id、revision、mode、标题、目标、范围、主要行为条目、决策、风险、实施顺序、待核实项、图与可选 baseline。schema 严格拒绝未知字段。revision>1 必须指定 parent_hash。

标准输出为 JSON。错误包含 code 和 message，非零退出。常见错误：INVALID_PLAN、BASELINE_CHANGED、FEEDBACK_STALE、FEEDBACK_INVALID、OUTPUT_EXISTS、DEPENDENCY_CHANGED。文件创建采用排他写；任何旧产物保持不变。无网络、付费或项目执行副作用。

反馈格式由页面生成，版本为 1.0.0；答案附 touched=true 才表示用户显式查看。浏览器仅导出，必须由用户发回聊天。来源回查与真实授权仍由 Agent 核验。
