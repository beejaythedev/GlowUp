# Supervisor guide

How to run this build with an AI agent and stay in control. Copy the prompts into your
agent (for example Claude Code in this folder).

## Before the first session

1. Create an empty project folder and copy this kit into it.
2. Run `git init` and make a first commit: "Add project docs". Git is your undo button
   and your record of what the agent did.
3. Install Node.js (LTS) and PostgreSQL, or have a hosted database URL ready.

## Prompt: start a milestone

```
Read CLAUDE.md, docs/PROGRESS.md and milestone M0 in docs/ROADMAP.md.
Work only on M0, one task at a time, in order. After each task, run
npm run check, commit with the task ID, tick it in the roadmap and log it in
docs/PROGRESS.md. Stop at the M0 supervisor checkpoint and tell me how to review it.
If anything is unclear, add it to docs/OPEN_QUESTIONS.md and ask me.
```

Change `M0` for each milestone.

## Prompt: continue after a break

```
Read CLAUDE.md and the latest handoff note in docs/PROGRESS.md, then continue
with the next unticked task in the current milestone.
```

## Prompt: end a session

```
Stop after the current task. Update docs/PROGRESS.md with a handoff note:
what's done, what's half-done, what's next, and any blockers.
```

## Prompt: review a milestone

```
Summarise what M0 delivered against its tasks in docs/ROADMAP.md. List anything
not done, any shortcuts taken, and how I can check each item myself.
```

## Keeping context under control

- **One milestone per conversation.** Start a fresh session for each milestone. The docs
  carry the memory, so nothing is lost and the agent isn't overloaded.
- **Docs are the memory, not the chat.** If you agree something in conversation, ask the
  agent to record it in `docs/DECISIONS.md`.
- **Small commits.** One task per commit makes problems easy to find and undo.

## What to check at each checkpoint

- Click through the feature yourself, on a phone for customer and stylist screens.
- Compare with the design file listed for that task.
- Run `npm run check` yourself and read the test names: do they cover the rules in the PRD?
- Read the task log and the git history: one task per commit, nothing unexpected.
- Approve by changing the milestone's status to Approved in `docs/PROGRESS.md`.

## Red flags

- The agent ticks tasks without tests, or `npm run check` fails.
- Features appear that aren't in the current milestone.
- Secrets or real customer data in the code or git history.
- Anything touching real payments or SMS before M9 approval.
