# 🔍 What EditorMate IS vs. What It IS NOT

> **A Definitive Guide to Architecture, Privacy Boundaries, Threat Model, and Design Philosophy**

When adopting developer tooling—especially software that interfaces between mobile devices and your desktop development environment—you deserve total clarity regarding what the software does, how it communicates, what data it touches, and what it specifically refuses to do.

---

## 1. Executive Summary

EditorMate is a **local-first remote companion** for developers running autonomous AI coding agents (Antigravity IDE, Cursor, VS Code, Windsurf, Claude Code CLI). It allows you to step away from your desk while long-running tasks execute, providing mobile approvals, status cards, voice-prompt injections, and on-demand window snapshots over standard chat apps (Telegram, WhatsApp, Discord, Slack, Matrix).

---

## 2. Detailed Breakdown: What It IS vs. What It IS NOT

### 1. Architectural Model
- **What It IS:**
  - A lightweight local daemon (`editormate-daemon`) running strictly on your local workstation on `http://127.0.0.1:4588`.
  - An extension installed inside your desktop IDE that registers command listeners and approval hooks.
  - An outbound client that connects directly to the official Bot API of your chosen messaging platform (e.g., Telegram Bot API, Discord Gateway, or local Baileys WhatsApp WebSocket).
- **What It IS NOT:**
  - **NOT a Cloud-Hosted SaaS.** There is no central EditorMate multi-tenant cloud database storing your projects, files, or chat histories.
  - **NOT an Inbound Web Server.** EditorMate never binds to `0.0.0.0` and never opens public inbound firewall ports on your home or office router.

---

### 2. Intellectual Property & Code Privacy
- **What It IS:**
  - A local bridge that relays user commands from your phone to the IDE and returns short text summaries, git status counters, and requested screenshots.
  - A privacy-preserving utility where all sensitive tokens (bot tokens, pairing secrets) are encrypted using AES-256-GCM via your operating system's native secure keyring (Linux SecretService, macOS Keychain, Windows Credential Manager).
- **What It IS NOT:**
  - **NOT a Code Crawler or Indexer.** EditorMate does not upload your repository, intellectual property, proprietary algorithms, or git commit history to any third-party server.
  - **NOT an AI Training Pipeline.** We never collect, retain, or train AI models on your prompts, codebases, or conversations.

---

### 3. Role in the AI Ecosystem
- **What It IS:**
  - A **Remote Control & Approval Layer**. It acts as an external interface to your existing desktop coding agents.
  - Compatible with any underlying LLM configured in your IDE (Claude 3.7 Sonnet, GPT-4o, Gemini 2.5 Flash, Qwen 2.5 Coder, local Ollama models).
- **What It IS NOT:**
  - **NOT a Replacement for Your Coding Agent.** EditorMate does not write code itself; your desktop IDE agent (Cursor Composer, Antigravity Agent, Claude Code) generates the code. EditorMate merely relays your voice notes and approvals to it.
  - **NOT a Proprietary LLM.** You do not need to pay EditorMate per-token LLM inference fees.

---

### 4. Display & Visual Monitoring
- **What It IS:**
  - **Event-Driven, On-Demand Snapshots.** When you explicitly type `/snap` or when the agent triggers an interactive tool approval, EditorMate uses native operating system APIs (`screencapture -x` on macOS, silent Spectacle/grim on Linux, `Graphics.CopyFromScreen` on Windows) to capture a single compressed image of the active IDE window rectangle.
  - Silent capture that mutes audio shutter sounds and ignores other monitors/applications.
- **What It IS NOT:**
  - **NOT a Battery-Draining Remote Desktop (VNC / RDP / AnyDesk / TeamViewer).** It does NOT stream continuous 60 FPS video over cellular data, which rapidly drains your mobile battery and consumes gigabytes of data.
  - **NOT a Keylogger or Invasive Screen Spy.** It does not record keystrokes, track mouse movements, or capture background apps like banking portals, personal browsers, or password managers.

---

### 5. Interaction Model
- **What It IS:**
  - An **Interactive Chat Deck**. Features one-tap mobile inline buttons:
    - `[ ✅ Approve ]` — allows a pending shell command or browser tool to execute.
    - `[ ❌ Reject ]` — denies the action and instructs the agent to propose an alternative.
    - `[ 📸 Snap ]` — requests an instant IDE snapshot.
    - `[ 📊 Status ]` — requests the current progress summary.
  - A **Voice-to-Prompt Transcriber**. Send voice notes from your phone; local Whisper strips pauses, normalizes coding terms, and submits the prompt to your agent.
- **What It IS NOT:**
  - **NOT a Mobile IDE.** You are not expected to write complex TypeScript or Python files on a mobile touchscreen keyboard. EditorMate is engineered for supervision, approvals, guidance, and high-level steering.

---

### 6. Licensing & Monetization
- **What It IS:**
  - **Transparent, Developer-Friendly Options:**
    - **Presale Launch Offer:** **$5 for 6 Months** (then standard $5/month).
    - **Pro Monthly:** **$5.00 / month** (flexible, cancel anytime).
    - **Pro Annual:** **$29.00 / year** (~$2.42/month — save 52%).
    - **Founder Lifetime:** **$49.00 one-time** (perpetual license for up to 3 workstation seats).
  - Includes a generous **7-Day Full Evaluation Trial** so you can test all features risk-free.
- **What It IS NOT:**
  - **NOT an Overpriced SaaS or Token Middleman.** We don't mark up your LLM tokens, bill you for your own bandwidth, or lock you into expensive enterprise tiers.
  - **NOT Bloatware or Ad-Supported Software.** Zero third-party telemetry trackers, zero promotional push notifications.

---

## 3. Summary Matrix

| Question | Answer |
| :--- | :--- |
| Can EditorMate read my files when I'm not using it? | **No.** The daemon only reads files when explicitly requested by an approved command. |
| Does EditorMate require port forwarding on my Wi-Fi router? | **No.** All messaging bridges use outbound long-polling or secure local webhooks. |
| Can anyone else message my bot and execute commands? | **No.** Pairing requires a cryptographic handshake token; non-whitelisted User IDs are dropped immediately. |
| Does EditorMate work when I am outside on cellular 5G? | **Yes.** As long as your desktop is powered on and connected to the internet. |
| Does it support multi-monitor setups? | **Yes.** Snapshots automatically locate and isolate the active IDE window coordinate rectangle. |

---

<p align="center">
  <sub>For setup instructions, return to the <a href="../README.md">Main Documentation</a>.</sub>
</p>
