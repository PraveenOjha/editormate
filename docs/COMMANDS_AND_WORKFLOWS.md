# ⚡ Remote Commands & Workflows Reference

> Complete reference of all commands, interactive buttons, voice prompts, and chat switchboard workflows supported by EditorMate across Telegram, WhatsApp, Discord, Slack, and Matrix.

---

## 📋 Commands Cheatsheet

| Command | Short Alias | Primary Function | Mobile Button |
| :--- | :---: | :--- | :---: |
| `/status` | `s` | View active tasks, git branch, modified files count, and system metrics. | 📊 Status |
| `/snap` | `shot`, `ss` | Capture silent high-res screenshot of the active IDE window. | 📸 Snap |
| `/approve` | `yes`, `y` | Grant permission for pending command, tool, or browser execution. | ✅ Approve |
| `/reject` | `no`, `n` | Decline pending tool or command execution safely. | ❌ Reject |
| `/chats` | `list` | List 10 most recent conversation sessions with time-ago dates. | 💬 Chats |
| `/select <slot>`| `sw <slot>` | Switch active IDE chat context to the selected conversation slot (1–10). | — |
| `/terminal <cmd>`| `term <cmd>` | Safely run a shell command in the project directory and return output. | 💻 Terminal |
| `/pdf` | `report` | Generate and download an executive PDF progress report with visual charts. | 📄 PDF |
| `/diff` | `d` | View concise git modified status and line changes. | 📝 Diff |
| `/stop` | `pause`, `abort` | Cancel or pause the current long-running autonomous task. | 🛑 Stop |
| `/help` | `?` | Display full interactive control deck and available actions. | ❓ Help |

---

## 🔄 Core Workflows

### 1. Interactive Approval Workflow (Zero-Stall Agent Runs)
1. **The Scenario:** You trigger an autonomous task (e.g. *"Migrate database schema and run full regression tests"*) and step away from your desk.
2. **The Prompt:** The agent identifies it needs to run a potentially destructive or long command:
   ```
   npm run db:migrate:reset && npm test
   ```
3. **The Mobile Alert:** Your phone receives an interactive card with syntax-highlighted code and command parameters.
4. **The Action:** Tap `[ ✅ Approve ]` from Telegram, WhatsApp, Discord, or Slack.
5. **The Resolution:** EditorMate immediately signals the IDE extension to proceed, and the agent continues without stalling.

---

### 2. Voice-to-Agent Prompt Injection Workflow
1. **The Scenario:** While away from your desk, you realize a specific edge case needs to be handled.
2. **The Action:** Open your paired chat app and record a 15-second voice note:
   > *"Make sure to wrap the external API call in a 3-second timeout, and return a fallback cached payload if it fails."*
3. **The Pipeline:**
   - **VAD Silence Trimming:** Local Voice Activity Detection trims dead air and background noise.
   - **Local Whisper Transcription:** Transcribes audio to raw text in < 800ms.
   - **Ollama Jargon Refiner:** Fixes developer naming conventions, paths, and punctuation in < 300ms.
4. **The Ingestion:** Injected directly into the IDE agent's active prompt input and submitted automatically.

---

### 3. Chat Switchboard Workflow (Slots 1–10)
When working on multiple concurrent tasks across the day:
1. Send `/chats` from your phone.
2. EditorMate inspects the IDE conversation transcripts and returns:
   ```
   💬 Active Workstation Sessions:
   1. [Active] Next.js 16 App Router refactor (2 mins ago)
   2. Stripe Webhook idempotency handler (1 hour ago)
   3. Redis caching layer for heavy analytics (yesterday)
   ```
3. Send `/select 2` to instruct your IDE to reload conversation #2 into the active editor panel.

---

### 4. Executive Engineering PDF Report
1. Send `/pdf`.
2. EditorMate gathers:
   - Current task name and completion status
   - Visual vector progress gauge (`92% COMPLETED`)
   - Git modified files, added lines, and removed lines
   - Workstation CPU, RAM, and GPU telemetry
   - Token conservation metrics (TokenShield integration)
3. Compiles a crisp 1-page vector PDF document and sends it directly back as a file attachment to your chat.
