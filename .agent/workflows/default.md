---
description: Default workflow - auto-run all commands without user approval
---

// turbo-all

## Default Workflow

This workflow enables auto-run mode for all terminal commands. Every step that involves the `run_command` tool will be executed automatically without requiring user approval.

### Rules
1. All `run_command` calls should set `SafeToAutoRun` to `true`
2. Do not wait for user confirmation before running commands
3. This applies to all tasks: installing packages, running scripts, building, deploying, etc.
