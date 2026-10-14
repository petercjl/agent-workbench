---
name: skill-forward-test
description: Perform a user-requested clean-context regression of a completed Skill using an accepted standard artifact and a natural task. Use for explicit isolated regression, not ordinary implementation checks.
---

# Skill Forward Test

Resolve and read the current portable-skill-creator by exact logical name. Execute its user-gated clean-regression contract, then return here to report evidence. The callee owns Skill design and validation policy; this entry owns the focused regression report.

Input: an explicitly requested regression, completed Skill iteration, user-accepted standard artifact, representative input and authorized write scope. Output: evidence, pass or classified gaps, and recommendations. Missing gates stop the isolated run and identify what is missing.

1. Inspect the actual Skill, references required by the realistic task, metadata and disk evidence. Establish ordinary output requirements and safety boundaries. Keep expected answers and design notes outside the runtime Skill.
2. Resolve the current host isolated-run capability. If unavailable, report CAPABILITY_UNAVAILABLE. No tool name is assumed and no new visible conversation is created without the user's request.
3. Launch one fresh-context evaluator only when all three user gates hold. Provide a natural user task, representative materials and ordinary safety/output requirements. Exclude the Skill name/path, tool route, design history, expected answer, suspected bug and rubric. Let ordinary discovery select the Skill.
4. Retrieve process and artifact evidence, independently inspect outputs, and compare against the accepted standard. Static checks alone are not a full pass. Classify pass, partial-pass, skill-gap, tool-gap, output-gap or context-leak with evidence.
5. Report tested scope, files, actual results, limitations and recommendations. Stop after reporting. A failed regression does not authorize edits or another run; a separately authorized update returns to portable-skill-creator.

For broader design principles read references/skill-design-worldview.md only when interpreting a structural gap. Dynamic callee dependency: portable-skill-creator, current user-gated regression contract; resolve from the host catalog, read complete instructions and relative resources, hand off the regression request and evidence, then return to step 5. Missing callee is an explicit dependency error.
