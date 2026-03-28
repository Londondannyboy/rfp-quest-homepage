# Claude Code Documentation Standard v1.0
# Dan Keegan Portfolio — Applies To All Projects
# Last reviewed: 2026-03-28

This document defines the documentation standard that 
every project in this portfolio must follow. It exists 
so that Claude Code can self-start any project without 
a prompt, and so that Claude (claude.ai) can verify 
document quality before sign-off.

Both Claude Code and Claude.ai use this standard.
Claude.ai reviews documents against this standard before 
they are considered signed off.
Claude Code writes documents to this standard at the end 
of every working session.

---

## The Four Required Documents

Every project must have all four. Missing documents mean 
the project is not safe to work on in a new session.

---

### 1. CLAUDE.md — The Constitution

This is the most important document. Claude Code reads 
it first. It must be CONSTRAINING, not merely descriptive.
A CLAUDE.md that only explains what the project does has 
failed its purpose.

#### Required sections in every CLAUDE.md:

**WHAT THIS PROJECT IS**
2-3 sentences. State the purpose and the non-negotiable 
technology choices. Any technology listed here cannot be 
replaced by Claude Code, ever, for any reason.

**PROJECT STATUS**
One of: FROZEN | ACTIVE | PAUSED
FROZEN means no new code, no new packages, no changes 
without explicit instruction. If status is FROZEN, Claude 
Code must read HANDOFF.md to understand why before 
asking any questions.

**FROZEN SECTIONS** (if any)
Exact commit hashes, file paths, or directories that 
must not be modified. Be specific. Vague prohibitions 
are ignored.

**MANDATORY PATTERNS**
The exact technical decisions that are not up for debate.
Include exact strings where precision matters:
model names, hook names, API endpoints, package versions.

**EXPLICIT DO NOT LIST**
Written as hard prohibitions. Minimum five items.
Each item starts with DO NOT.
This list must include what to do instead of each 
prohibited action, or a reference to DECISIONS.md.

**WHEN YOU HIT A WALL**
Exact instruction for what Claude Code must do when 
it cannot proceed. Must always include:
"Stop. Report what you tried and why it failed. 
Do not attempt an alternative without instruction."
Must never say "try an alternative approach."

**GATE TESTS**
The exact tests that must pass before any phase or 
task is marked complete. Written as numbered steps 
with expected outputs. Claude Code cannot mark a task 
done if gate tests are not passing.

**ENVIRONMENT**
All live URLs, local ports, Railway URLs, Vercel project 
IDs, and environment variable names (not values) that 
the project depends on.

---

### 2. HANDOFF.md — Session State

Written at the end of every working session, before the 
session closes. If HANDOFF.md is accurate and complete, 
Claude Code needs no start prompt — it reads this file 
and begins from the correct state.

#### Required sections in every HANDOFF.md:

**SESSION DATE**
ISO format. The date this handoff was written.

**CURRENT STATE**
What actually works, verified by testing.
Not what should work. Not what was just coded.
Verified means: URL returns expected response, 
curl confirms endpoint is alive, visual confirmed 
in browser. If not verified, say "unverified."

**WHAT IS BROKEN**
Honest assessment. Every known issue listed.
Include the reason for each breakage if known.

**LAST COMMITS**
For every repo touched in this session:
- Repo name
- Commit hash (7 chars minimum)
- Commit message
- Whether this commit was authorised

**ENVIRONMENT STATE**
Every environment variable that must exist for the 
project to function. Name only, not value.
Flag any that are missing or unset.

**NEXT ACTION**
Single. Specific. Unambiguous.
The first thing Claude Code must do in the next session.
Written as a numbered step list if multiple steps are 
required. Not "continue development." Not "fix things."
Exact commands where possible.

**DO NOT (session-specific)**
Any prohibitions specific to the current project state.
These supplement CLAUDE.md, they do not replace it.

**SIGN-OFF STATUS**
SIGNED OFF — reviewed and confirmed accurate by Claude.ai
DRAFT — not yet reviewed, treat as informational only

---

### 3. DECISIONS.md — Architectural Log

A running log of every significant decision and, 
critically, every approach that was tried and failed.
This document prevents Claude Code from re-attempting 
approaches that are already known not to work.

#### Format for each entry:

DATE: YYYY-MM-DD  
DECISION: One sentence describing what was decided  
CONTEXT: Why this decision was necessary  
TRIED AND FAILED: What was attempted before this decision  
OUTCOME: What the decision enabled  
REVERSIBLE: Yes / No  

If REVERSIBLE is No, Claude Code must not attempt to 
reverse or work around this decision. If Claude Code 
finds itself considering an approach that contradicts 
a REVERSIBLE: No entry, it must stop and report.

---

### 4. README.md — Human Facing

For external readers, collaborators, and future reference.
Describes what the project does, how to run it locally,
live URLs, and tech stack. This is the last document 
Claude Code reads, not the first.

Must include:
- What the project is (one paragraph)
- Live URL(s)
- How to run locally (exact commands)
- Environment variables needed (names only)
- Tech stack
- Known issues or limitations

---

## Sign-Off Process

No document is authoritative until signed off.
Unsigned documents are drafts.

Process:
1. Claude Code writes or updates documents at session end
2. Dan pastes documents into Claude.ai conversation
3. Claude.ai reviews against this standard and against 
   known project state from conversation history
4. Dan approves or requests changes
5. Claude Code commits with message:
   "docs: [filename] signed off YYYY-MM-DD"

Claude Code must add SIGN-OFF STATUS: SIGNED OFF 
or SIGN-OFF STATUS: DRAFT to HANDOFF.md.

---

## What Good Looks Like

A documentation suite is working correctly when:

- Claude Code can open a repo it has never seen, read 
  the four documents, and know exactly what to do next 
  without any start prompt
- Claude Code never attempts an approach listed as 
  failed in DECISIONS.md
- Claude Code stops and reports rather than improvises 
  when it hits a wall
- Every phase ends with updated, signed-off documents
- No surprise package installations, route additions, 
  or framework switches occur

The test: if you can open a new Claude Code session, 
type nothing, and Claude Code starts the correct next 
task — the documentation is working.

---

## Anti-Patterns To Avoid

These are the failure modes seen across this portfolio:

**Aspirational HANDOFF.md**
Writing "tender cards render" when they rendered once 
locally but have not been verified in production.
Fix: Only write CURRENT STATE entries for things you 
have personally verified since the last deployment.

**Descriptive CLAUDE.md**
Writing what the project does instead of what Claude 
Code must and must not do.
Fix: Every paragraph in CLAUDE.md should constrain 
behaviour, not describe features.

**Missing DECISIONS.md entries**
Failing to log a failed approach means the next session 
will try it again.
Fix: Every wall Claude Code hits, every approach that 
fails, every package that breaks things — log it within 
the same session it happened.

**Stale HANDOFF.md**
The previous session's HANDOFF.md is still the current 
one because no one updated it.
Fix: HANDOFF.md must be updated before the session ends,
not at the start of the next session.