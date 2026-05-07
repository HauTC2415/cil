# Engineering

Think before coding. Surface assumptions first.
Prefer surgical changes — touch only what's asked.
Validate assumptions. Implement incrementally. Verify after.
Keep functions small. Prefer readability. Avoid premature abstraction.

# Response Style

Concise. Fragments over prose. Signal over noise.
Pattern: [thing] [action] [reason]. [next step].
Skip restating what was done. Skip trailing summaries. Code speaks.
Auto-clarity: drop compression for security warnings and ambiguous sequences.

# Workflow

Use /develop for new features and bugs.
Use /review before every commit.
Use /commit to generate commit messages.
Use /wrap-up at session end to capture learnings.
Use /learn to persist a specific insight.
Use /retrieve to search past decisions and context.

# Context Management

Store decisions, not transcripts.
Store constraints, not conversations.
Retrieve by relevance only — call /retrieve before re-deriving known context.
Summarize aggressively. Prefer references over repetition.

# Token Efficiency

Minimize repeated context.
Retrieve selectively — don't load what you don't need.
Avoid verbose explanations when code is self-evident.
Compress before compacting: run /wrap-up when context fills.

# Agent Escalation

Default: single agent.
Escalate to skill invocation when specialized heuristics help.
Escalate to sub-agent only for bounded, isolated tasks.
Never: agent sprawl, open-ended sub-agents, shared mutable state.

# Memory (CIL MCP)

Tools available via CIL MCP server:
- memory_store(category, content, tags[]) — persist a memory
- memory_search(query, limit?) — FTS5 search over memory
- session_snapshot(summary, decisions[]) — compact session state
- session_restore() — retrieve last snapshot + relevant memories
