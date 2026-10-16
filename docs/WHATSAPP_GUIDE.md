# 📗 WhatsApp Remote Control Setup Guide

> **Zero Extra Accounts:** Control your coding agents directly from your primary WhatsApp phone number.  
> **100% Free Option:** Includes a native local Web QR Bridge (powered by Baileys Multi-Device) with **$0 Meta API charges**.

---

## 🌟 Why WhatsApp?

- **No Third-Party Apps Needed:** If WhatsApp is your primary messenger, you don't need to install Telegram, Discord, or Slack.
- **Universal Voice Notes:** Record WhatsApp voice notes on iOS or Android; EditorMate transcribes and refines them into clean prompts.
- **Cross-Platform:** Works on Android, iPhone, WhatsApp Desktop, and WhatsApp Web simultaneously.

---

## 🚀 Option 1: Local Baileys Multi-Device Bridge (Recommended — Free & 100% Private)

The Baileys bridge pairs your workstation as a standard **Linked Device** (just like WhatsApp Web). It runs completely locally on your computer.

### Step 1: Start WhatsApp Pairing
#### In IDE Extension:
1. Open the EditorMate sidebar in Antigravity, Cursor, or VS Code.
2. Select **WhatsApp** from the platform selector.
3. Click **"Generate Pairing QR"**. A QR code appears in the sidebar.

#### In Terminal CLI:
```bash
editormate pair --platform whatsapp
```
A high-contrast QR code will render directly inside your terminal window.

### Step 2: Scan from Your Phone
1. Open **WhatsApp** on your phone.
2. Go to **Settings** (iOS) or **Three Dots** (Android) -> **Linked Devices**.
3. Tap **"Link a Device"** (verify with Face ID, Touch ID, or fingerprint).
4. Point your camera at the QR code on your workstation screen.
5. **Pairing Complete!** Your workstation is now securely linked as an authorized device.

### Step 3: Start Interacting
- You can now chat directly with your linked bot number or a designated control group.
- Send `status` or `/status` to verify communication.

---

## 🏢 Option 2: Official Meta Cloud API (For Teams & Businesses)

If you maintain a verified Meta Developer business account and prefer official webhooks:

1. Visit [developers.facebook.com](https://developers.facebook.com) -> Create App under **Business**.
2. Add the **WhatsApp** product.
3. Under **API Setup**, retrieve:
   - **Phone Number ID**
   - **Temporary or Permanent System User Access Token**
4. Set the Webhook Callback URL to your local daemon endpoint (via secure tunnel if testing remotely, or direct IP):
   - Callback: `https://<your-host>:4588/api/whatsapp/webhook`
   - Verify Token: A custom random string of your choice.
5. Save the configuration in EditorMate:
   ```bash
   editormate config set whatsapp.phoneNumberId "YOUR_PHONE_NUMBER_ID"
   editormate config set whatsapp.token "YOUR_META_ACCESS_TOKEN"
   ```

---

## 🎮 How to Use WhatsApp Remote Control

### 1. 1-Tap Approvals
When an AI agent requests confirmation to run a terminal command:
```
🛡️ Approval Requested:
Agent: Antigravity IDE
Action: run_command
Command: npm run build

Reply with:
1 or yes -> Approve
2 or no  -> Reject
```
Simply reply `1` or `yes` to execute, or `2` / `no` to cancel.

### 2. Voice Note Prompt Injections
- Tap and hold the WhatsApp voice note button.
- Speak your coding instructions:
  > *"Add a retry mechanism with exponential backoff to the external payment API call in payment-service.ts"*
- Send the voice note.
- EditorMate downloads the `.ogg`/`.opus` audio, runs Whisper VAD to trim silence, uses Ollama to fix code syntax and filenames, and enters the prompt into your IDE chat.

### 3. Screen Snapshots
- Send `snap` or `/snap`.
- EditorMate takes a snapshot of your active IDE window and sends it as a photo attachment.

---

## 🔒 Security & Persistence
- **Session Caching:** Baileys session keys are encrypted locally on your workstation in `~/.editormate/whatsapp_auth/`.
- **Auto-Reconnection:** When your workstation restarts or wakes from sleep, EditorMate automatically re-establishes the connection without requiring you to re-scan the QR code.
- **Whitelist Enforcement:** Only messages from your verified mobile phone number are processed. Messages from other contacts are strictly ignored.
