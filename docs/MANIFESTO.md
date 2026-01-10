# EditorMate Manifesto

## 1. PRIMARY PURPOSE
EditorMate exists to **MOVE THE AI IDE CONVERSATION TO MOBILE**.
It is a **MOBILE CONTROL + REASONING LAYER** for a real development machine.

## 2. MENTAL MODEL
- **Desktop IDE** = Execution Surface
- **AI IDE Agent** = Worker
- **Mobile App** = Command Center + Brain Extension

## 3. CORE CONSTRAINTS (NEVER VIOLATE)
- **No full mobile IDE.**
- **No deep refactors on mobile.**
- **No multi-file editing workflows on mobile.**
- **No cloud execution of user code.**
- **No public backend that sees user code.**
- **No silent code changes by the agent.**

## 4. TECH STACK
### Mobile (React Native + TS)
- Monitoring, reasoning, approving.
- UX > Visual Polish.

### Host Agent (Node.js + TS)
- Runs locally.
- Owns terminal, git, fs, context.
- Orchestrates Local/Cloud LLMs.

### Transport
- SSH-style encrypted channels.
- Device trust model.
- No central server storing code.
