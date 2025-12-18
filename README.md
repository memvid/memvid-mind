<div align="center">

# 🧠 memvid-mind

**Give Claude Code a memory. One file. That's it.**

[![npm version](https://img.shields.io/npm/v/memvid-mind.svg)](https://www.npmjs.com/package/memvid-mind)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Installation](#installation) • [How it Works](#how-it-works) • [Commands](#commands) • [FAQ](#faq)

</div>

---

## The Problem

```
You: "Hey Claude, remember when we fixed that auth bug?"

Claude: "I don't have memory of previous conversations."

You: "We literally spent 3 hours on this yesterday"

Claude: "I'd be happy to help you debug it from scratch!"
```

200K context window. Zero memory between sessions.

**You're paying for a goldfish with a PhD.**

---

## Installation

```bash
claude plugin install memvid-mind
```

That's it. No config needed.

---

## How it Works

After install, Claude remembers everything in **one file**:

```
your-project/
└── .claude/
    └── mind.mv2   # Claude's brain. That's it.
```

Next session:

```
You: "What did we decide about the auth system?"

Claude: "Last week we chose JWT over sessions because..."
```

### What Gets Captured

| Event | What's Saved |
|-------|--------------|
| **Session start** | Loads relevant context from past sessions |
| **While working** | File structures, decisions, bugs found, solutions |
| **Session end** | Summary of what happened |

### Why One File?

- **`git commit`** - version control Claude's memory
- **`scp`** - copy to another machine, it just works
- **Share** - instant context transfer to teammates

No database. No background service. No config.

---

## Endless Mode

Claude hits context limits fast. This compresses tool outputs ~20x:

```
Before:  Read (8K) + Edit (4K) + Bash (12K) = 24K tokens gone
After:   Read (400) + Edit (200) + Bash (600) = 1.2K tokens
```

Keeps errors, structure, key functions. Drops the noise.

---

## Commands

```bash
/mind search "authentication"     # find past context
/mind ask "why postgres?"         # ask your memory
/mind recent                      # what happened lately
/mind stats                       # how much is stored
```

---

## FAQ

**How big does the file get?**
~1KB per memory. 1000 memories ≈ 1MB.

**Privacy?**
Everything stays on your machine. Nothing uploaded.

**Speed?**
Native Rust core. Sub-millisecond operations.

**Reset?**
Delete `.claude/mind.mv2` or run `/mind clear`.

---

## Config (optional)

```json
{
  "memoryPath": ".claude/mind.mv2",
  "maxContextObservations": 20,
  "endlessMode": true
}
```

---

<div align="center">

MIT License

Built on [memvid](https://github.com/Memvid/memvid) — the single-file memory engine.

</div>
