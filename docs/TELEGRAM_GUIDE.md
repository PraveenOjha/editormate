# 📘 Telegram Remote Control Setup Guide

> **Recommended for 90% of developers:** Fastest setup (< 60 seconds), zero cost, native push notifications, interactive inline buttons, and voice note transcription.

---

## 🌟 Why Telegram?

- **Zero Mobile Keyboard Friction:** Receive interactive inline buttons for `[ Approve ]`, `[ Reject ]`, `[ Snap ]`, and `[ Status ]`.
- **Instant Native Push Notifications:** Get alerted immediately when an autonomous AI agent needs permission to run a sensitive shell command or launches a browser.
- **Flawless Voice Notes:** Send audio messages from anywhere; EditorMate transcribes them locally via Whisper and injects them directly into your IDE prompt.
- **Zero Port Forwarding:** Telegram's Bot API uses secure outbound HTTPS long-polling.

---

## 🚀 Setup Option A: 1-Click Master Bot (Fastest — 30 Seconds)

If you don't want to create your own bot token, you can use the official EditorMate master bot:

1. Open your desktop IDE (Antigravity, Cursor, or VS Code) with the EditorMate extension installed.
2. In the status bar or sidebar, click **"Connect Telegram"**.
3. A pairing QR code and deep link appear (e.g. `https://t.me/EditorMate_bot?start=pair_xxxx`).
4. Scan the QR code with your phone or tap the link.
5. In Telegram, tap **"Start"**.
6. **Done!** Your phone is paired with your workstation.

---

## 🛠️ Setup Option B: Your Own Private Bot (< 2 Minutes)

Creating your own private bot ensures that only your personal bot token touches Telegram's servers:

### Step 1: Create Your Bot via @BotFather
1. Open Telegram and search for `@BotFather` (verified bot with a blue checkmark).
2. Send `/newbot`.
3. Choose a display name (e.g., `My Dev Remote`).
4. Choose a unique username ending in `bot` (e.g., `john_editormate_bot`).
5. BotFather will reply with an API token:
   ```
   Use this token to access the HTTP API:
   718293847:AAHfdk293kLmNOPqrstuvwXYZ1234567
   ```
   *(Keep this token confidential!)*

### Step 2: Configure Bot Commands & Menu
To make navigation effortless from mobile, set up the command shortcuts:
1. In `@BotFather`, send `/setcommands`.
2. Select your newly created bot.
3. Paste the following block:
   ```
   status - Check active AI agent tasks and workspace state
   snap - Capture silent desktop IDE window screenshot
   approve - Approve pending tool or shell command execution
   reject - Decline pending agent action
   chats - List 10 recent conversation transcripts with time-ago dates
   select - Switch active IDE chat context (/select 1-10)
   terminal - Safely execute a remote shell command
   pdf - Generate executive PDF progress report
   diff - Inspect git modified files and line counts
   help - Show interactive control deck
   ```
4. Send `/setmenubutton` to `@BotFather`, select your bot, and choose **Commands**. This places a convenient `Menu` button right beside your chat box so you never have to type commands manually.

### Step 3: Link to EditorMate
#### Via IDE Extension:
1. Open the EditorMate sidebar in VS Code / Antigravity / Cursor.
2. Click **Settings** (gear icon) -> Paste your Bot Token -> Click **Save**.
3. Click **"Start Pairing"** and send `/pair <token>` to your bot in Telegram.

#### Via CLI:
```bash
export EDITORMATE_TELEGRAM_BOT_TOKEN="718293847:AAHfdk293kLmNOPqrstuvwXYZ1234567"
editormate pair --platform telegram
```

---

## 🎮 How to Use Telegram Remote Control

### 1. Interactive Approval Cards
When your coding agent pauses asking:
> *"May I execute `npm run test:e2e`?"*

Your phone receives a notification with an interactive card:
```
🛡️ Approval Requested by Antigravity Agent
Action: run_command
Command: npm run test:e2e
Directory: /home/praveen/work/app

[ ✅ Approve ]    [ ❌ Reject ]    [ 📸 View Context ]
```
Tap **`[ ✅ Approve ]`** and the command executes instantly on your workstation.

### 2. Voice Note Prompt Injection
- Press and hold the microphone icon in Telegram.
- Speak your instruction:
  > *"Please refactor the user auth middleware to handle expired JWT tokens gracefully, then re-run the tests."*
- Release to send.
- EditorMate's local Whisper pipeline transcribes the voice note, runs local Ollama jargon cleanup (< 300ms), and injects the text into your active IDE chat.

### 3. Desktop IDE Window Snapshots
- Send `/snap` or tap the **`📸 Snap Window`** button.
- Within 1–2 seconds, EditorMate captures the active IDE window and sends back a high-resolution PNG image.

### 4. Chat Switchboard
- Send `/chats` to see your recent sessions:
  ```
  💬 Active Sessions:
  1. Refactor auth controller (active • today)
  2. Implement Stripe webhook handler (yesterday)
  3. Fix memory leak in audio stream (3 days ago)
  ```
- Send `/select 2` to instantly reload session #2 into your IDE window!

---

## 🔒 Security Best Practices for Telegram
- **Token Isolation:** EditorMate stores your bot token in your workstation's OS Keyring encrypted with AES-256-GCM.
- **User Whitelist:** Only your paired Telegram `chat_id` can send commands. Any unauthorized messages from strangers are discarded immediately with HTTP 403.
