<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Magic-Agent** (29997 symbols, 92986 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Magic-Agent/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Magic-Agent/clusters` | All functional areas |
| `gitnexus://repo/Magic-Agent/processes` | All execution flows |
| `gitnexus://repo/Magic-Agent/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
| Work in the Sync area (398 symbols) | `.claude/skills/generated/sync/SKILL.md` |
| Work in the Api area (246 symbols) | `.claude/skills/generated/api/SKILL.md` |
| Work in the Composables area (185 symbols) | `.claude/skills/generated/composables/SKILL.md` |
| Work in the Acp area (159 symbols) | `.claude/skills/generated/acp/SKILL.md` |
| Work in the Encryption area (119 symbols) | `.claude/skills/generated/encryption/SKILL.md` |
| Work in the Components area (113 symbols) | `.claude/skills/generated/components/SKILL.md` |
| Work in the Stores area (98 symbols) | `.claude/skills/generated/stores/SKILL.md` |
| Work in the Daemon area (91 symbols) | `.claude/skills/generated/daemon/SKILL.md` |
| Work in the Scripts area (84 symbols) | `.claude/skills/generated/scripts/SKILL.md` |
| Work in the Services area (75 symbols) | `.claude/skills/generated/services/SKILL.md` |
| Work in the Durable-objects area (73 symbols) | `.claude/skills/generated/durable-objects/SKILL.md` |
| Work in the Events area (64 symbols) | `.claude/skills/generated/events/SKILL.md` |
| Work in the Commands area (59 symbols) | `.claude/skills/generated/commands/SKILL.md` |
| Work in the Views area (56 symbols) | `.claude/skills/generated/views/SKILL.md` |
| Work in the Ui area (52 symbols) | `.claude/skills/generated/ui/SKILL.md` |
| Work in the Hooks area (50 symbols) | `.claude/skills/generated/hooks/SKILL.md` |
| Work in the Voice area (48 symbols) | `.claude/skills/generated/voice/SKILL.md` |
| Work in the Codex area (43 symbols) | `.claude/skills/generated/codex/SKILL.md` |
| Work in the Gemini area (41 symbols) | `.claude/skills/generated/gemini/SKILL.md` |
| Work in the Auth area (39 symbols) | `.claude/skills/generated/auth/SKILL.md` |

<!-- gitnexus:end -->
