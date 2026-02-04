## Summary

<!-- Brief description of what this PR does -->

## Changes

<!-- List of changes made -->
-

## Testing

- [ ] Tests pass locally (`yarn test` or project-specific test command)
- [ ] New tests added for new functionality
- [ ] Existing tests updated if behavior changed

### Mutation Testing

<!--
Mutation testing runs automatically on PRs that modify apps/server/workers/src/.
A bot comment will appear with the mutation score summary.
HTML report available in workflow artifacts.
-->

- [ ] **Mutation report reviewed** (if applicable)
  - Mutation score from CI comment: ____%
  - [ ] Surviving mutants reviewed and assessed
  - [ ] N/A - No mutation testing triggered for this PR

<details>
<summary>What to look for in mutation reports</summary>

| Status | Meaning | Action |
|--------|---------|--------|
| **Killed** | Test detected the mutation | Good - no action needed |
| **Survived** | Test missed the mutation | Review if in critical code path |
| **No Coverage** | No test covers this code | Consider adding tests |
| **Timeout** | Mutation caused infinite loop | Usually fine |

**Focus areas:**
- Surviving mutants in business logic (not boilerplate)
- Mutations in conditional statements and boundary checks
- Mutations affecting error handling paths

**Note:** Not all surviving mutants need fixing - some are equivalent mutations or in low-risk code.
</details>

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactor (code change that neither fixes a bug nor adds a feature)
- [ ] Documentation update
- [ ] Dependency update

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if applicable)
- [ ] No new warnings introduced

## Related Issues

<!-- Link to Linear issues: HAP-XXX -->
Resolves:

## Screenshots

<!-- If applicable, add screenshots to help explain your changes -->
