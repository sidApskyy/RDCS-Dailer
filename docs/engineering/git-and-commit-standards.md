# Git and Commit Standards

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** All RDCS Dialer Platform development

---

## Overview

This document defines the Git workflow and commit message standards for the RDCS In-House Dialer Platform. All developers must follow these standards to ensure a clean, readable, and maintainable Git history.

---

## Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. This specification provides a simple set of rules for creating an explicit commit history.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

The following commit types are allowed:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect code meaning (formatting, whitespace, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope

The scope provides additional contextual information:
- **api**: Backend API changes
- **web**: Frontend web changes
- **worker**: Background worker changes
- **socket**: Socket.IO gateway changes
- **database**: Database schema or Prisma changes
- **infra**: Infrastructure changes (Docker, CI, etc.)
- **docs**: Documentation changes
- **config**: Configuration changes

### Description

- Use the imperative, present tense: "add" not "added" or "adds"
- Don't capitalize the first letter
- No period (.) at the end
- Maximum 100 characters for the subject line

### Body

- Use the imperative, present tense
- Include motivation for the change and contrast with previous behavior
- Wrap at 72 characters

### Footer

- Reference issues by ID: `Closes #123`, `Refs #456`
- Breaking changes: Start with `BREAKING CHANGE:` followed by description

---

## Examples

### Feature Addition
```
feat(api): add user authentication endpoint

Implement JWT-based authentication with login and registration endpoints.
Add password hashing using bcrypt.
```

### Bug Fix
```
fix(web): resolve layout shift on dashboard

The dashboard layout was shifting when loading user data due to missing
loading state. Added skeleton loader to prevent layout shift.
```

### Documentation
```
docs(readme): update installation instructions

Clarified Docker setup steps and added troubleshooting section for
Windows users.
```

### Refactoring
```
refactor(api): extract user service from controller

Move user business logic from controller to dedicated service class
to improve testability and separation of concerns.
```

### Breaking Change
```
feat(api): change user response format

BREAKING CHANGE: User response now includes nested organization object
instead of organizationId. Frontend must be updated to handle new format.

Closes #123
```

---

## Pre-commit Hooks

Pre-commit hooks are configured using Husky and lint-staged:

### What Runs on Pre-commit
- ESLint with auto-fix for TypeScript/JavaScript files
- Prettier formatting for all supported files

### Configuration
- **File**: `lint-staged.config.js`
- **Hook**: `.husky/pre-commit` (when .git directory exists)

### Bypassing Hooks
If you need to bypass pre-commit hooks (not recommended):
```bash
git commit --no-verify -m "message"
```

---

## Commit Message Validation

Commitlint validates commit messages against the Conventional Commits specification.

### Configuration
- **File**: `commitlint.config.js`
- **Rules**:
  - Type must be one of the allowed types
  - Subject must not be empty
  - Subject must not end with a period
  - Type must be lowercase
  - Header max length: 100 characters
  - Scope must be kebab-case

### Testing Commit Messages
To test a commit message before committing:
```bash
echo "feat: add user authentication" | npx commitlint
```

---

## Branch Naming

### Branch Naming Convention
- **Feature branches**: `feature/description` (e.g., `feature/user-authentication`)
- **Bugfix branches**: `fix/description` (e.g., `fix/login-bug`)
- **Hotfix branches**: `hotfix/description` (e.g., `hotfix/security-patch`)
- **Release branches**: `release/version` (e.g., `release/v1.0.0`)
- **Chore branches**: `chore/description` (e.g., `chore/update-dependencies`)

### Branch Guidelines
- Use kebab-case
- Keep names descriptive but concise
- One branch per feature/fix
- Delete branches after merge

---

## Git Workflow

### Main Branches
- **main**: Production-ready code
- **develop**: Integration branch for features

### Feature Workflow
1. Create feature branch from `develop`
2. Make commits following commit standards
3. Push to remote
4. Create pull request to `develop`
5. Code review
6. Merge to `develop`

### Release Workflow
1. Create release branch from `develop`
2. Update version numbers
3. Merge release to `main` and `develop`
4. Tag release on `main`

### Hotfix Workflow
1. Create hotfix branch from `main`
2. Fix the issue
3. Merge hotfix to `main` and `develop`
4. Tag release on `main`

---

## Pull Request Guidelines

### PR Title
- Use conventional commit format
- Include type and scope
- Example: `feat(api): add user authentication endpoint`

### PR Description
- Describe what the PR does
- Explain why the change is needed
- List related issues
- Include screenshots for UI changes
- Document breaking changes

### PR Checklist
- [ ] Code follows project standards
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests pass
- [ ] No linting errors
- [ ] No TypeScript errors

---

## Git Best Practices

### Commit Frequency
- Commit often, commit small
- One logical change per commit
- Don't mix unrelated changes
- Don't commit half-done work

### Commit Messages
- Be clear and descriptive
- Explain why, not just what
- Use present tense
- Keep subject line under 100 characters

### Merge Commits
- Use squash merge for feature branches
- Keep history clean
- Avoid merge commits in feature branches

### Ignored Files
- Never commit `.env` files
- Never commit `node_modules`
- Never commit build artifacts
- Never commit IDE settings
- Never commit OS files

---

## Troubleshooting

### Commitlint Fails
If commitlint rejects your message:
1. Check the type is allowed
2. Ensure subject is not empty
3. Remove trailing period
4. Keep subject under 100 characters
5. Use lowercase type

### Pre-commit Hook Fails
If pre-commit hooks fail:
1. Run `pnpm lint` to see errors
2. Run `pnpm format` to fix formatting
3. Fix errors manually if needed
4. Stage fixed files and try again

### Husky Not Working
If Husky hooks don't run:
1. Ensure `.git` directory exists
2. Run `pnpm prepare` to reinstall hooks
3. Check `.husky/pre-commit` exists and is executable

---

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
