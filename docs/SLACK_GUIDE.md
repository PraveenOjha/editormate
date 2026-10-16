# 🟡 Slack Remote Control Setup Guide

> ⏳ **Status: Planned / In Active Development (Slated for v1.2)** — Telegram, WhatsApp & Discord are live and active today; the Slack Socket Mode bridge is slated for upcoming v1.2 release.

---

## 🌟 Why Slack?

- **Corporate IT Compliant:** Runs over Slack Socket Mode via outbound WebSockets. No inbound firewall rules, no ngrok, and no port forwarding required.
- **Block Kit Approvals:** Clean, structured cards with one-tap approval buttons matching company Slack standards.
- **Team Notifications:** Route agent progress updates and executive PDF reports to a dedicated private channel (e.g. `#dev-praveen-agents`).

---

## 🛠️ Step-by-Step Setup Guide (< 4 Minutes)

### Step 1: Create a Slack App using Manifest
1. Visit [api.slack.com/apps](https://api.slack.com/apps).
2. Click **"Create New App"** -> Choose **"From an app manifest"**.
3. Select your development workspace and click **Next**.
4. In the JSON tab, paste the included manifest:
   ```json
   {
     "display_information": {
       "name": "EditorMate",
       "description": "Universal AI Coding Agent Remote Control",
       "background_color": "#1e293b"
     },
     "features": {
       "bot_user": {
         "display_name": "EditorMate",
         "always_online": true
       },
       "slash_commands": [
         {
           "command": "/editormate",
           "description": "Interact with active workstation coding agent",
           "usage_hint": "[status|snap|pdf|chats|approve|reject]",
           "should_escape": false
         }
       ]
     },
     "oauth_config": {
       "scopes": {
         "bot": [
           "chat:write",
           "commands",
           "files:write",
           "im:history",
           "im:read",
           "im:write"
         ]
       }
     },
     "settings": {
       "socket_mode_enabled": true
     }
   }
   ```
5. Click **Next** -> Click **Create**.

### Step 2: Enable Socket Mode & Generate App-Level Token
1. In the left navigation menu, click **"Socket Mode"** (verify it is toggled **ON**).
2. Under **App-Level Tokens**, click **"Generate Token and Scopes"**.
3. Token Name: `editormate_socket`.
4. Add Scope: `connections:write`.
5. Click **Generate** and copy the **App-Level Token** (`xapp-1-...`).

### Step 3: Install App & Copy Bot Token
1. In the left navigation menu, click **"Install App"** -> Click **"Install to Workspace"** -> Click **Allow**.
2. Copy the **Bot User OAuth Token** (`xoxb-...`).

### Step 4: Link to EditorMate
Configure the tokens in EditorMate:
```bash
editormate config set slack.appToken "xapp-1-..."
editormate config set slack.botToken "xoxb-..."
editormate daemon
```

---

## 🎮 How to Use Slack Remote Control

- Send `/editormate status` in your DM with the bot to inspect running agent tasks.
- Send `/editormate snap` to receive a screenshot of the active IDE window.
- When an agent requests approval to execute a sensitive terminal command, EditorMate posts an interactive Slack Block Kit card with `[ Approve ]` and `[ Reject ]` buttons.
