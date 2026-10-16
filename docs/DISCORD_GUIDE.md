# 🟣 Discord Remote Control Setup Guide

> **Developer Friendly:** Rich embed status cards, interactive button rows, slash commands, and private direct message (DM) routing.

---

## 🌟 Why Discord?

- **Rich Interactive Embeds:** Status updates appear as colorful cards with syntax-highlighted code diffs and execution metrics.
- **Slash Commands Autocomplete:** Type `/` and Discord automatically suggests commands like `/snap`, `/status`, `/chats`, and `/approve`.
- **Private DMs or Private Guild Channel:** Control your agent from a private direct message with your bot or inside a dedicated `#agent-feed` channel in your personal server.

---

## 🛠️ Step-by-Step Setup Guide (< 3 Minutes)

### Step 1: Create a Discord Application
1. Visit the [Discord Developer Portal](https://discord.com/developers/applications).
2. Log in with your Discord account.
3. Click **"New Application"** (top right).
4. Enter an application name: `EditorMate` -> Accept Developer Terms -> Click **Create**.

### Step 2: Configure the Bot & Copy Token
1. In the left navigation menu, click **"Bot"**.
2. Click **"Reset Token"** (enter 2FA if prompted) and copy your Bot Token:
   ```
   MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GaBcDe.fGhIjKlMnOpQrStUvWxYz123456789
   ```
   *(Keep this token safe!)*
3. Scroll down to **Privileged Gateway Intents**:
   - Enable ✅ **Message Content Intent** (Required for the bot to read your incoming prompt instructions).
4. Click **"Save Changes"**.

### Step 3: Invite Bot to Your Server or Enable DMs
1. In the left navigation menu, click **OAuth2** -> **URL Generator**.
2. Under **Scopes**, select:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **Bot Permissions**, select:
   - ✅ `Send Messages`
   - ✅ `Embed Links`
   - ✅ `Attach Files`
   - ✅ `Read Message History`
   - ✅ `Use Slash Commands`
4. Copy the generated URL at the bottom of the page.
5. Paste the URL into your browser, select your private Discord server, and click **Authorize**.

### Step 4: Link to EditorMate
#### Via IDE Extension:
1. Open the EditorMate sidebar in Antigravity, Cursor, or VS Code.
2. Select **Discord** under Chat Platforms.
3. Paste your Bot Token and click **Connect**.

#### Via CLI:
```bash
export EDITORMATE_DISCORD_BOT_TOKEN="MTIzNDU2Nzg5MDEy..."
editormate pair --platform discord
```

---

## 🎮 How to Use Discord Remote Control

### 1. Slash Commands
In your private server channel or direct message with the bot:
- `/status` — Displays a rich embed with the active agent state, git branch, and changed files.
- `/snap` — Uploads an instant desktop IDE window snapshot.
- `/chats` — Shows recent conversation slots.
- `/select slot:2` — Switches the active IDE chat context.
- `/terminal command:npm test` — Executes a shell command in your workspace.
- `/pdf` — Generates and uploads a vector executive engineering PDF report.

### 2. Action Row Interactive Buttons
When an agent requests approval to execute a command or launch a browser tool:
- The bot posts an embed with interactive buttons:
  - `[ ✅ Approve ]` (Green)
  - `[ ❌ Reject ]` (Red)
  - `[ 📸 Inspect Window ]` (Grey)
- Click the button to respond instantly without typing!

---

## 🔒 Security
- **Author ID Check:** The bot strictly checks `interaction.user.id` against your paired account ID. If anyone else clicks an approval button in a shared server, Discord displays: *"Unauthorized: Only the workstation owner can approve actions."*
