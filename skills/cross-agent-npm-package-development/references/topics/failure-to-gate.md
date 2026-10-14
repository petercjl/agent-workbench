# Turn a platform failure into a reusable gate

Classify the failing boundary before editing: package runtime discovery, canonical Skill source, installer target mapping, managed update and metadata, nested capability, Agent-native execution, or release workflow. A workaround in one Agent session is evidence that a path exists; it is not a distributable fix.

For each confirmed failure, capture a minimal positive and negative test that reproduces the class of problem without private machine paths. Put deterministic checks in the package or shared audit; put target-native behavior in a named Agent/OS smoke. Confirm the new test fails before the fix and passes after it. If the test cannot run in CI, record the manual host gate and keep the target status below `tested` until real evidence exists.

For installer-contract failures, cover the package-name-only request, JSON `skill source` parsing, a canonical Skill under any valid package directory, pre-existing package-managed links without installer-specific metadata, and refusal of an unrelated target. Verify the package CLI and the Agent's real installer independently; only the latter proves the user-facing installation path.

For a live Windows Agent, specifically exercise a Skill directory rename rejected by a file lock: keep a recoverable backup, copy only managed content in place, preserve the host UI sidecar, and verify file hashes afterward. Test local edits separately so an update cannot silently discard user changes. For a report dependency, distinguish package install success from renderer availability and from a completed report artifact. For an encoding report, compare actual UTF-8 bytes or hashes before editing source text.
