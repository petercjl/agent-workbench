# Skill Design Worldview

Use this reference when creating, updating, reviewing, or testing Agent skills. Keep it shareable: do not depend on a private wiki, local absolute paths, personal names, or hidden context from the design conversation.

## Core Model

A skill is an execution manual for an LLM, not just a prompt and not merely a fixed workflow. It should define the goal, main line, execution method, tool and script usage, branches, patches, QA, and evolution rules.

## Main Line

Make the main path explicit. The agent may handle exceptions flexibly, but every branch must return to the main line. For complex skills, describe workflow nodes, branch conditions, tool nodes, patch areas, QA gates, and output contracts.

## Deterministic Nodes

Use deterministic code, scripts, CLI tools, MCP tools, or APIs for fixed, important, high-risk, or verifiable steps. A workflow node can be a script call when exactness matters more than prose flexibility.

## Validation

Do not treat a one-time successful run as proof that a skill works. After optimizing a skill, verify that changes are written to disk with `rg`, file reads, `git diff`, or equivalent evidence. For non-trivial skills, test in a clean sub-agent or fresh conversation so success does not depend on leaked context.

## Failure Feedback

If clean-context testing fails, write the failure back into the skill as a main-flow change, branch, tool error handler, patch, QA rule, or return-to-main-line rule. Do not only solve the failure in the design conversation.

## Shareability

Shareable skills must not require private wiki notes or machine-specific paths. If a local private note is useful for the author, keep it outside the skill or mention it only as optional local context. Generalizable methods belong in the skill or its `references/` files.
