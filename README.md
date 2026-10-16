# 🤖 EditorMate

<p align="center">
  <a href="https://praveenojha.com/editormate">
    <img src="https://raw.githubusercontent.com/PraveenOjha/ai-tools/main/editormate/extension/assets/icon.png" width="130" height="130" alt="EditorMate Logo" onerror="this.src='https://placehold.co/130x130/1e293b/f59e0b?text=EditorMate'" />
  </a>
</p>

<p align="center">
  <strong>Universal Mobile & Chat Remote Control for Workstation AI Coding Agents</strong><br />
  <em>Direct and monitor Antigravity IDE, Cursor, VS Code, and Claude Code from Telegram, WhatsApp, Discord, Slack, and Matrix.</em>
</p>

<p align="center">
  <a href="https://praveenojha.com/editormate"><img src="https://img.shields.io/badge/Website-praveenojha.com%2Feditormate-amber.svg?style=flat-square" alt="Website" /></a>
  <a href="https://t.me/EditorMate_bot"><img src="https://img.shields.io/badge/Telegram-@EditorMate__bot-blue.svg?style=flat-square&logo=telegram" alt="Telegram" /></a>
  <a href="docs/WHAT_IT_IS_AND_WHAT_IT_IS_NOT.md"><img src="https://img.shields.io/badge/Architecture-Zero--Party%20Local-emerald.svg?style=flat-square" alt="Architecture" /></a>
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/License-PortSync%20Commercial%20%2F%20Community-purple.svg?style=flat-square" alt="License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-%3E%3D18.0.0-green.svg?style=flat-square&logo=node.js" alt="Node Version" /></a>
</p>

---

## 📑 Table of Contents

- [What is EditorMate?](#-what-is-editormate)
- [What EditorMate IS vs. What It IS NOT](#-what-editormate-is-vs-what-it-is-not)
- [How It Works](#-how-it-works-architecture)
- [Supported IDEs & Coding Agents](#-supported-ides--coding-agents)
- [Supported Messaging Platforms](#-supported-messaging-platforms)
- [Quickstart & Installation](#-quickstart--installation)
- [Messaging Channel Setup Guides](#-messaging-channel-setup-guides)
  - [1. Telegram (Recommended)](#1-telegram-recommended)
  - [2. WhatsApp (Free Local QR)](#2-whatsapp-free-local-qr)
  - [3. Discord](#3-discord)
  - [4. Slack](#4-slack-enterprise)
  - [5. Matrix / Element](#5-matrix--element)
- [Remote Commands Reference](#-remote-commands-reference)
- [Voice Notes & Audio Pipeline](#-voice-notes--audio-pipeline)
- [Security, Privacy & Zero-Data Guarantee](#-security-privacy--zero-data-guarantee)
- [FAQ & Troubleshooting](#-faq--troubleshooting)
- [Support & Community](#-support--community)

---

## 💡 What is EditorMate?

When autonomous AI coding agents (such as Antigravity IDE, Cursor, Windsurf, or Claude Code) work on complex features, long refactors, or test suites, you shouldn't have to sit frozen in front of your workstation for hours waiting to click *"Approve"* on a shell command or check if a build succeeded.

**EditorMate is a lightweight, local-first companion daemon and IDE extension** that bridges your workstation to the messaging app already on your phone (Telegram, WhatsApp, Discord, Slack, or Matrix).

With EditorMate, you can step away from your desk, go for a walk, cook lunch, or relax:
- 📲 **1-Tap Approvals:** When an agent prompts to run a terminal command or launch a browser, you get an interactive card on your phone with `[ ✅ Approve ]` and `[ ❌ Reject ]`.
- 🎙️ **Voice & Video Notes:** Send a quick voice note describing what to fix next; local Whisper transcribes it and injects it straight into your active IDE chat box.
- 📸 **Silent Window Snapshots:** Send `/snap` to see what your IDE and agent are doing right now without opening heavy remote desktops.
- 💬 **Chat Switchboard:** Send `/chats` to list your recent 10 sessions and `/select 2` to switch active contexts.
- 📄 **Executive PDF Reports:** Send `/pdf` to receive an auto-generated visual PDF with progress meters, git diff stats, and execution logs.

---

## ⚖️ What EditorMate IS vs. What It IS NOT

To avoid confusion, here is a clear, transparent breakdown of what EditorMate does and what it deliberately avoids doing:

| Feature / Aspect | What EditorMate **IS** ✅ | What EditorMate **IS NOT** ❌ |
| :--- | :--- | :--- |
| **Hosting Model** | **100% Local Companion Daemon** running on your own machine (`localhost:4588`). | **NOT a Cloud SaaS.** We do NOT host your code, store your prompts, or run remote servers inspecting your files. |
| **AI Intelligence** | **A Universal Remote Control Bridge** that talks to whatever agent you already use. | **NOT an AI Model.** It does not replace Claude, GPT-4o, or Gemini; it bridges you to your desktop IDE agent. |
| **Code Editing** | **A Companion for Existing IDEs** (Antigravity, Cursor, VS Code, Windsurf, Claude Code). | **NOT a New Editor.** You keep your existing IDE, keybindings, themes, extensions, and workflows. |
| **Screen Streaming** | **On-Demand Silent Snapshots** (`/snap` or interactive approval events) capturing only the active IDE window. | **NOT a Battery-Draining VNC / RDP / TeamViewer.** It does not stream 60 FPS video over cellular data. |
| **Privacy & Telemetry** | **Zero Text Inspection.** Transcripts and code flow strictly between your chat app and local workstation. | **NOT a Keylogger or Screen Spy.** It never captures other windows, personal browsers, or background tasks. |
| **Network Exposure** | **Zero Open Inbound Ports.** Connects via outbound long-polling or local encrypted webhooks. | **NOT a Security Hole.** No port forwarding (`0.0.0.0`), no router configuration, no exposed public web servers. |
| **Pricing / Lock-in** | **Developer-Friendly Access:** **Presale $5 for 6 Months** (then $5/mo), **$5/mo**, **$29/yr** (52% off), or **$49 Founder Lifetime** (3 seats). Free 7-day trial. | **NOT an Overpriced SaaS Trap.** No token markups, no artificial charges for your own network bandwidth. |

👉 For an in-depth threat model and privacy audit, read [docs/WHAT_IT_IS_AND_WHAT_IT_IS_NOT.md](docs/WHAT_IT_IS_AND_WHAT_IT_IS_NOT.md).

---

## 🏗️ How It Works (Architecture)

```
[ Your Phone (Telegram / WhatsApp / Discord / Slack / Matrix) ]
                           │
                           │  Encrypted Outbound Transit (Bot API / Long-Polling)
                           ▼
     ┌─────────────────────────────────────────────────────────────┐
     │ WORKSTATION (Linux / macOS / Windows)                      │
     │                                                             │
     │   [ EditorMate Local Companion Daemon ] (port 4588)         │
     │      ├─ OS Keyring (AES-256-GCM Token Storage)              │
     │      ├─ Local Whisper VAD (Audio Transcription)            │
     │      ├─ Native OS Window Capture (Spectacle/screencapture)   │
     │      └─ PDF Generator (Vector Status Reports)               │
     │                           │                                 │
     │                           │ Local IPC / Extension Bridge    │
     │                           ▼                                 │
     │   [ Active IDE: Antigravity / Cursor / VS Code / Claude ]   │
     │      ├─ Active Agent Chat Box (Prompt Injection)            │
     │      ├─ Interactive Approval Interceptor                    │
     │      └─ Workspace Files & Git State                         │
     └─────────────────────────────────────────────────────────────┘
```

1. **Outbound Connection:** The local daemon on your workstation connects outward to your messaging platform (e.g., Telegram Bot API or Discord Gateway). No external entity can reach into your machine uninvited.
2. **Cryptographic Pairing:** During setup, your phone pairs via a one-time cryptographic handshake token (`/pair <token>`). Only your approved User ID can send commands.
3. **Local Action Dispatch:** When you tap `[ Approve ]` or speak a prompt, the daemon injects it directly into the running IDE extension or Claude Code session.

---

## 💻 Supported IDEs & Coding Agents

EditorMate seamlessly connects to all leading modern AI coding environments:

| IDE / Environment | Extension / Integration | Status |
| :--- | :--- | :---: |
| **Antigravity IDE** | Native EditorMate Extension (`praveenojha.editormate`) | ✅ Fully Supported |
| **Cursor** | Native Extension + Cursor IPC Prompt Injection | ✅ Fully Supported |
| **Visual Studio Code** | VS Code Marketplace Extension | ✅ Fully Supported |
| **Windsurf** | Native Extension + Cascade Bridge | ✅ Fully Supported |
| **Claude Code CLI** | Interactive Terminal Daemon Bridge | ✅ Fully Supported |

---

## 📱 Supported Messaging Platforms

| Platform | Recommended For | Voice Notes | Buttons | Setup Time |
| :--- | :--- | :---: | :---: | :---: |
| **Telegram** | 🌟 Best overall mobile experience, instant push | ✅ Native Whisper | ✅ Inline Keys | < 60 sec |
| **WhatsApp** | Primary phone number, zero third-party accounts | ✅ Voice Note | ✅ Quick Reply | 2 min (QR) |
| **Discord** | Dev servers, rich embed status cards, DMs | ⚠️ Audio Upload | ✅ Action Rows | 3 min |
| **Slack** | Engineering teams, corporate Socket Mode | ⚠️ File Audio | ✅ Block Kit | 4 min |
| **Matrix / Element** | Decentralized, privacy purists, E2EE | ⚠️ Voice Event | ⚠️ Text Reply | 3 min |

---

## 🚀 Quickstart & Installation

### Option 1: VS Code / Cursor / Antigravity Extension (Recommended)
1. Open your IDE Extension marketplace and search for `EditorMate` (or `praveenojha.editormate`).
2. Click **Install**.
3. Click the bottom status bar item `$(remote) EditorMate` or open the EditorMate sidebar.
4. Follow the 1-click on-screen pairing QR code.

### Option 2: Standalone CLI & Companion Daemon
```bash
# Install globally via npm
npm install -g editormate

# Or run instantly with npx (zero permanent install)
npx editormate daemon
```

To pair your favorite messaging app from the CLI:
```bash
# Pair Telegram
editormate pair --platform telegram

# Pair WhatsApp (scans a terminal QR code using WhatsApp Linked Devices)
editormate pair --platform whatsapp

# Pair Discord
editormate pair --platform discord
```

---

## 📖 Messaging Channel Setup Guides

Detailed, step-by-step guides for configuring each chat provider:

- 📘 **[Telegram Setup Guide](docs/TELEGRAM_GUIDE.md)** — Free, < 60s setup using `@BotFather` or `@EditorMate_bot`.
- 📗 **[WhatsApp Setup Guide](docs/WHATSAPP_GUIDE.md)** — Connect via native Baileys multi-device QR scan ($0 Meta fees).
- 🟣 **[Discord Setup Guide](docs/DISCORD_GUIDE.md)** — Create a custom Discord bot with slash commands and DM support.
- 🟡 **[Slack Setup Guide](docs/SLACK_GUIDE.md)** — Corporate Socket Mode setup with zero inbound ports.
- 🟢 **[Matrix / Element Setup Guide](docs/MATRIX_GUIDE.md)** — Decentralized E2EE setup on Matrix.org or private Synapse.

---

## 📋 Remote Commands Reference

All commands can be typed or triggered via one-tap interactive buttons:

| Command | Button | Description |
| :--- | :---: | :--- |
| `/status` | 📊 Status | Inspect active agent goals, current git branch, and modified file list. |
| `/snap` | 📸 Snap Window | Receive a crisp, silent desktop screenshot of your active IDE window. |
| `/approve` | ✅ Approve | Approve pending tool execution, browser launch, or shell command. |
| `/reject` | ❌ Reject | Safely decline pending agent action and instruct it to pause or retry. |
| `/chats` | 💬 Chats | Display a numbered list of your 10 most recent conversation sessions. |
| `/select <1-10>` | — | Switch active IDE chat context to the selected conversation slot. |
| `/terminal <cmd>` | 💻 Terminal | Safely execute a terminal command in the workspace and receive output. |
| `/pdf` | 📄 PDF Report | Generate a downloadable executive PDF report with progress charts. |
| `/diff` | 📝 Git Diff | View concise git diff metrics and changed lines of the repository. |
| `/stop` | 🛑 Stop | Pause or cancel the current long-running autonomous task. |
| `/help` | ❓ Help | Display the full interactive control deck and command list. |

👉 Full workflow examples in [docs/COMMANDS_AND_WORKFLOWS.md](docs/COMMANDS_AND_WORKFLOWS.md).

---

## 🎙️ Voice Notes & Audio Pipeline

You don't need to type code or long prompts on tiny mobile keyboards.

1. **Send a Voice Note:** Tap the microphone icon on Telegram or WhatsApp and speak naturally (e.g. *"Fix the mobile navigation drawer so it closes when clicking outside, then run the tests"*).
2. **Local Voice Activity Detection (VAD):** EditorMate strips dead air, ambient pauses, and noise.
3. **Local Whisper Transcription:** Runs locally on your machine or via lightweight private API.
4. **Local Ollama Jargon Refiner:** Auto-corrects developer terms, symbol names, and paths in < 300ms.
5. **Prompt Injection:** The refined text is injected directly into your active IDE chat box and submitted to the agent.

---

## 🔒 Security, Privacy & Zero-Data Guarantee

EditorMate was designed from the ground up for strict enterprise and privacy compliance:

- **Zero Cloud Code Storage:** Your code, file names, and prompts NEVER transit through or get stored on EditorMate servers.
- **Localhost Binding:** The companion daemon listens exclusively on `127.0.0.1:4588`. It does not bind to `0.0.0.0`.
- **Encrypted Local Storage:** All tokens, credentials, and settings are stored locally in your operating system's native secure keyring (Linux SecretService, macOS Keychain, Windows Credential Manager).
- **Single-Device Cryptographic Seat Binding:** Remote pairing requires a cryptographic handshake token. Unknown user IDs are immediately dropped.
- **Selective Window Capture:** Desktop captures specifically target the active IDE window rectangle using OS-level window handles; your background desktop, email, and personal browser tabs remain uncaptured.

👉 Read the full security audit and disclosures in [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).

---

## ❓ FAQ & Troubleshooting

#### Q: Do I need to keep my computer awake?
**A:** Yes. EditorMate controls your desktop workstation, so your computer must be powered on and connected to the internet. If you use a laptop, configure it to stay awake when the lid is closed.

#### Q: Does EditorMate cost monthly subscription fees?
**A:** No! EditorMate comes with a **7-Day Free Trial** and a permanent, single-payment **Lifetime Pro License** for individual developers. Zero recurring subscription traps.

#### Q: Does it work if I'm on 5G mobile data away from my home Wi-Fi?
**A:** Yes! Because the companion daemon connects outbound to Telegram, WhatsApp, or Discord, your phone can be anywhere in the world on cellular data with **zero port forwarding, dynamic DNS, or VPN configuration**.

👉 Check [docs/TROUBLESHOOTING_FAQ.md](docs/TROUBLESHOOTING_FAQ.md) for common questions and resolutions.

---

## 🌐 Support & Community

- **Official Webpage:** [praveenojha.com/editormate](https://praveenojha.com/editormate)
- **Documentation & FAQ:** [praveenojha.com/store/editormate/support](https://praveenojha.com/store/editormate/support)
- **Telegram Master Bot:** [@EditorMate_bot](https://t.me/EditorMate_bot)
- **Issue Tracker:** [GitHub Issues](https://github.com/PraveenOjha/editormate/issues)
- **Creator:** Built with pride by [Praveen Ojha](https://praveenojha.com) as part of the PortSync Developer Suite.

---

<p align="center">
  <sub>Copyright © 2026 Praveen Ojha • PortSync Ecosystem. All rights reserved.</sub>
</p>
