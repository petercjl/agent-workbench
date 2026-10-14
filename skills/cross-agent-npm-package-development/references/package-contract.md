# Package and validation contract

Use this reference at the architecture/QA node, after inspecting the target repository.

## Canonical package

For a registry-based management shell, bundle its own routing Skill and register external component package names, CLI entry points and Skill identities. Each component retains its own canonical source, tests and release version. Validate local-versus-external ownership, complete dependency closure, actual CLI source discovery and fresh registry installation. Explicit unified updates check the shell and all components' stable latest versions, even when the shell itself is unchanged; ordinary business calls keep the installed environment stable. Preserve Git-owned development registrations, local edits and recovery evidence. Adding a component changes the shell registry; updating an existing component can be released independently.

- One npm package under the requested scope contains the stable CLI/runtime, one canonical source per bundled portable Skill, `capabilities.json`, and thin Agent adapters. Agent installation directories contain managed links or copies; they do not become independent sources.
- The CLI exposes `version`, `capabilities --json`, `doctor --json`, `skill source/status/install/update`, and package update check/install (or documented equivalent commands). `doctor` checks executable dependencies and required nested capabilities, not just that source files exist. Probe Agent-managed runtimes via the Agent home/config location before falling back to platform `PATH`; an environment override is an option, not the only working path.
- A single-Skill `skill source --json` returns the real bundled source in a `source` field; a suite returns its registered collection and supports `skill source --name NAME --json` with that same named-source contract; installers should parse it before guessing `skill/` versus `skills/`. `skill status --agent <agent> --json` should expose the target's installed/managed/current state. Both fresh installation and update return machine-readable destination, ownership, state, version/digest, and backup evidence.
- Preserve existing user-owned files. Copy-mode updates use a recoverable backup; locally generated configuration and UI metadata are either bundled in the canonical Skill or preserved by a declared migration.
- Auto-update policy must specify check trigger, channel, compatibility boundary, package and Skill synchronization, rollback, offline behavior, and what the user sees. An update checker by itself is not an updater.

## Target matrix

Assess Codex/macOS, SealSeek/macOS, and SealSeek/Windows independently when they are requested. A CI job on Windows/macOS verifies installation and package mechanics; a real host run verifies discovery, native image/report capabilities, and a small end-to-end artifact. Record each cell as `tested`, `implemented`, `unresolved`, or `unsupported` with date and evidence. Never derive SealSeek support from Codex tests or Windows support from macOS tests.

## Mandatory negative cases

Test absent runtime, installed runtime with missing imports, Agent-managed runtime without an override, unmanaged Skill target, stale and locally edited managed copies, offline registry, locked-directory rename with recoverable in-place sync, update failure after backup, first-install and preserved customized UI metadata, non-ASCII Skill bytes, missing nested renderer, and incomplete business output. A successful `doctor` does not prove the business report exists. Installers must consume the package's `skill source/install` interface instead of assuming `skills/` or `skill/` layout.

## Release gate

Inspect `npm pack --dry-run --json` output and test the package entry point after installation. Before claiming an Agent/OS target tested, run its actual user-facing installer from a package-name-only request and retain evidence of source resolution, existing managed-target recognition, installed target, new-session discovery, and business output. A clean package CLI test cannot substitute for this installer smoke. The release workflow must depend on cross-platform QA and use GitHub-hosted OIDC Trusted Publishing. `npm-release-kit` owns release initialization and publication; this contract adds package/Agent validation rather than replacing its workflow.

## Provenance and gap register

This layer compiles user-confirmed package conventions (U), the user's general Agent-plugin/CLI knowledge (W), and observed platform failures (E) into a shareable engineering method. Coverage is partial: host-specific SealSeek capability discovery, Windows runtime installation, and image/report end-to-end behavior require per-package evidence. Revisit this reference when a new platform, installer contract, or update channel changes the decision.
