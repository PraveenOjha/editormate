# 🟢 Matrix & Element Remote Control Setup Guide

> ⏳ **Status: Planned / In Active Development (Slated for v1.3)** — Telegram, WhatsApp & Discord are live and active today; the Matrix / Element decentralized bridge is slated for upcoming v1.3 release.

---

## 🌟 Why Matrix?

- **100% Open & Decentralized:** Works across Matrix federated homeservers (e.g. `matrix.org` or your own self-hosted private Synapse server).
- **Client Freedom:** Control your agents from [Element](https://element.io), [Cinny](https://cinny.in), [FluffyChat](https://fluffychat.im), or any Matrix client on iOS, Android, Linux, or Web.
- **End-to-End Encryption (E2EE):** Sensitive prompt communications remain encrypted in transit and at rest in your private room.

---

## 🛠️ Step-by-Step Setup Guide (< 3 Minutes)

### Step 1: Create a Bot Account
1. Open [Element Web](https://app.element.io) (or your preferred Matrix client).
2. Register a dedicated bot account (e.g. `@editormate_bot:matrix.org` or `@bot:yourdomain.com`).

### Step 2: Retrieve the Access Token
1. Log in to the bot account on Element Web.
2. Click **Settings** (gear icon) in the bottom-left corner.
3. Select **Help & About**.
4. Scroll down to the **Advanced** section.
5. Click to reveal and copy your **Access Token** (`syt_...`).

### Step 3: Create a Private Control Room
1. From your personal Matrix account, create a **Private Room** (e.g. `Dev Workstation Remote`).
2. Invite the bot user ID (`@editormate_bot:matrix.org`) into the room.
3. Open Room Settings -> **Advanced** -> Copy the **Internal Room ID** (`!xyz123abc:matrix.org`).

### Step 4: Configure EditorMate
Export the environment variables or save them in your EditorMate configuration:
```bash
export EDITORMATE_MATRIX_HOMESERVER="https://matrix-client.matrix.org"
export EDITORMATE_MATRIX_ACCESS_TOKEN="syt_your_access_token_here"
export EDITORMATE_MATRIX_ROOM_ID="!xyz123abc:matrix.org"

# Start the daemon
editormate daemon
```

---

## 🎮 How to Use Matrix Remote Control

- Send `!status` or `/status` to view active agent goals, modified git files, and token usage.
- Send `!snap` to receive a snapshot of your active desktop IDE window.
- When an agent prompts for permission to run a terminal command:
  - Reply with `!approve` or `yes` to execute.
  - Reply with `!reject` or `no` to decline.
- Send audio/voice notes via Element to have EditorMate transcribe and inject them directly into your active IDE chat.
