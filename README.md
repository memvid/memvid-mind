<div align="center">

# 🧠 Claude Brain

### **Claude Code finally remembers.**

*One file. Instant recall. Zero config.*

[![npm version](https://img.shields.io/npm/v/claude-brain.svg)](https://www.npmjs.com/package/claude-brain)
[![GitHub stars](https://img.shields.io/github/stars/memvid/claude-brain?style=social)](https://github.com/memvid/claude-brain)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Installation](#-installation) • [How it Works](#-how-it-works) • [Commands](#-commands) • [FAQ](#-faq)



https://github.com/user-attachments/assets/b57cb3db-576b-4c1f-af92-95796ba3fb5b



</div>

---

## The Problem

```
You: "Hey Claude, remember when we fixed that auth bug?"

Claude: "I don't have memory of previous conversations."

You: "We literally spent 3 hours on this yesterday"

Claude: "I'd be happy to help you debug it from scratch!"
```

**200K context window. Zero memory between sessions.**

You're paying $200/month for a goldfish with a PhD.

---

## The Solution

```
You: "What did we decide about the auth system?"

Claude: "Last week we chose JWT over sessions because of your
microservices architecture. I also remember we had issues with
the refresh token rotation - here's what we fixed..."
```

**One plugin. One file. Claude remembers everything.**

---

## 🚀 Installation

**30 seconds. No config.**

1. Add the marketplace in Claude Code:
```
/plugin add marketplace memvid/claude-brain
```

2. Go to **Plugins tab** (`/plugins`) → **Discover** → Install **mind**

3. Restart Claude Code. **Done.**

---

## 🔮 How it Works

After install, Claude stores memories in **one portable file**:

```
your-project/
└── .claude/
    └── mind.mv2   # Claude's brain. That's it.
```

### What Gets Captured

| When | What |
|------|------|
| **Session start** | Injects relevant context from past sessions |
| **While working** | Decisions, bugs found, solutions, file changes |
| **Session end** | Session summary for future recall |

### Why One File?

| Action | Result |
|--------|--------|
| `git commit` | Version control Claude's memory |
| `scp file user@server:` | Transfer to any machine |
| Send to teammate | Instant project onboarding |

**No database. No background service. No API keys. No cloud.**

---

## 📦 Commands

```bash
/mind:mind stats                       # memory statistics
/mind:mind search "authentication"     # find past context
/mind:mind ask "why did we choose X?"  # ask your memory
/mind:mind recent                      # what happened lately
```

---

## ⚡ Endless Mode

Claude hits context limits fast. Claude Mind compresses tool outputs ~20x:

```
Before:  Read (8K) + Edit (4K) + Bash (12K) = 24K tokens gone
After:   Read (400) + Edit (200) + Bash (600) = 1.2K tokens
```

Keeps errors, structure, key functions. Drops the noise.

Work longer without hitting limits.

---

## ❓ FAQ

<details>
<summary><b>How big is the .mv2 file?</b></summary>

An empty `.mv2` file is only **~70KB**. It includes:

- **Lexical index** for fast keyword search
- **Vector index** for semantic search (find by meaning)
- **Block-aligned storage** for O(1) random access

The file grows as you add memories (~1KB per memory). A year of daily use typically stays under 5MB.

</details>

<details>
<summary><b>How big does the file get?</b></summary>

~1KB per memory. 1000 memories ≈ 1MB. The base ~70KB is minimal overhead.

</details>

<details>
<summary><b>Is my data private?</b></summary>

**100% local.** Nothing leaves your machine. No telemetry. No cloud sync. You own your data.

The `.mv2` file is just a file - encrypt it, back it up, delete it, share it. Your choice.

</details>

<details>
<summary><b>How fast is it?</b></summary>

Native Rust core via [memvid](https://github.com/memvid/memvid). Sub-millisecond operations:

- Search: < 1ms for 10K+ memories
- Insert: < 0.5ms
- Load context: < 5ms

</details>

<details>
<summary><b>Can I reset Claude's memory?</b></summary>

```bash
rm .claude/mind.mv2
```

Or use `/mind clear` (coming soon).

</details>

<details>
<summary><b>Does it work with multiple projects?</b></summary>

Yes! Each project gets its own `.claude/mind.mv2` file. Memories are project-scoped by default.

</details>

---

## 🔧 Configuration (Optional)

Create `.claude/mind.config.json`:

```json
{
  "memoryPath": ".claude/mind.mv2",
  "maxContextObservations": 20,
  "endlessMode": true
}
```

Most users don't need to configure anything.

---

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick wins:**
- Add to [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)
- Star the repo ⭐
- Share on Twitter/X with a demo

---


<div align="center">

**MIT License** • Built on [memvid](https://github.com/memvid/memvid) — the single-file memory engine

[Report Bug](https://github.com/memvid/claude-brain/issues) • [Request Feature](https://github.com/memvid/claude-brain/issues)

</div>
