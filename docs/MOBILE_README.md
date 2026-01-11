# Mobile Readme (copied from mobile/README.md)

## 1. Setup
This is a Standard Expo React Native app.

```bash
cd mobile
npm install
npx expo start
```

## 2. Dependencies
- **UI Framework**: React Native (built-in)
- **Navigation**: Expo Router (implicit file-based routing in `app/`)
- **Transport**: Standard `fetch` / `WebSocket` (Phase 1) or Custom Native Module (Phase 2).

## 3. Connecting to Host
The Host Agent prints connection info on startup:
```
Mobile Connection Address:
-> ssh user@192.168.1.X -p 2222
```

### Pairing (QR)
The Host Agent exposes a `/pairing` endpoint which returns `sshCommands` and a `qrDataUrl` (PNG data URL). The mobile app can fetch this endpoint to show a "Scan to connect" QR and copy SSH commands to clipboard.

### Push registration & wake-and-fetch (MVP)
The mobile app should register its push token (FCM for Android, APNs for iOS) with the Agent/Server during pairing. For the MVP we use push messages only to carry a minimal `wake_token` which the app uses to establish an SSH/tunnel connection and fetch full messages over the secure channel. See `docs/notifications-tunneling.md` for details and the server relay API.

- On pairing: mobile uploads `deviceToken` to Agent.
- On push received: app performs a quick authenticated SSH/tunnel connection, exchanges `wake_token`, fetches message, and displays it.
- Notifications MUST NOT contain plaintext message content in the payload for privacy.

Note: See `docs/notifications-tunneling.md` for security notes and the minimal payload examples.

## 4. Android SDK Configuration (Local Development)
- If you plan to run Android emulators or use `adb`, create `android/local.properties` with your SDK path. For Windows/Gradle use:

```
sdk.dir=F:\\sdk
```

- Optionally add a `.env` file at the project root with these variables for convenience (used by some tooling):

```
ANDROID_SDK_ROOT=F:/sdk
ANDROID_HOME=F:/sdk
ADB_PATH=F:/sdk/platform-tools
```

- After that, run `npx expo prebuild` (if you need native project files) or `npx expo start` and use `adb`/emulator commands as usual.

### JDK (Java) Requirements
- Android native builds require **Java 11+** (we recommend Temurin 17 or 21). If you have multiple JVMs installed, Gradle might pick an older JVM; you can:
  - Set `JAVA_HOME` to the desired JDK path in your shell session (recommended for quick testing):

    ```powershell
    $env:JAVA_HOME = 'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.9.10-hotspot'
    $env:Path = "$env:JAVA_HOME\\bin;" + $env:Path
    ```

  - Persistently set the `JAVA_HOME` for your user:

    ```powershell
    setx JAVA_HOME "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.9.10-hotspot"
    ```

  - Or point Gradle to a specific JDK by adding `org.gradle.java.home` to `android/gradle.properties` (already added for convenience).

> **Note:** For the current shell you'll need to restart terminal sessions to pick up `setx` changes. If you want, I can attempt to run a test build (`npx expo run:android`) now to verify the environment.

---

## Troubleshooting: "Unable to resolve 'expo-modules-core'"
If you encounter an error like:

```
Unable to resolve "expo-modules-core" from "node_modules\\expo\\src\\Expo.ts"
```

Try these steps (in order):

1. Clean and reinstall JS dependencies:

```powershell
# From project root
Remove-Item -Recurse -Force node_modules; Remove-Item package-lock.json -ErrorAction SilentlyContinue; npm install
```

2. Regenerate native project files (prebuild):

```bash
npx expo prebuild -p android
```

3. Start Metro with a cleared cache and build again:

```bash
npx expo start -c
npx expo run:android
```

If the issue persists, run `npx expo-doctor` and follow its recommendations. If you're unsure, send me the `expo-doctor` output and the `package.json` and I'll help fix it.
