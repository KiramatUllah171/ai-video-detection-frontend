# SachAI Frontend

React/Vite frontend for the AI video detection platform.

## Required Production Configuration

Set the API base URL before building:

```powershell
$env:VITE_API_BASE_URL="https://api.example.com"
npm run build
```

Production builds intentionally fail when `VITE_API_BASE_URL` is missing or not HTTPS.

## Local Development

```powershell
npm install
npm run dev
```

`.env.development` may point to a local or LAN backend during development.

## Verification

```powershell
npm test
npm run build
npm audit --omit=dev
```

Use the backend `scripts/Test-FrontendCspAssets.ps1` smoke test against the deployed HTTPS frontend before switching traffic.
