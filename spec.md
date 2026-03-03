# PUBG IOS CONFIG PANEL

## Current State

- Full single-page app with landing/panel views in React (App.tsx)
- Admin modal with key generator (1d/7d/30d/custom durations)
- Keys stored entirely in browser `localStorage` — not visible across devices
- No device binding — any device can use any valid key
- Owner key `rohan2006` hardcoded in frontend

## Requested Changes (Diff)

### Add

- Motoko backend canister to store all generated keys centrally
- Device fingerprint generation (browser fingerprint derived from userAgent, screen, timezone, canvas hash) stored per key when first used
- Backend `useKey(key, deviceId)` function that binds the key to the first device that uses it, and rejects it from any other device
- Backend `generateKey(adminKey, durationDays)` callable from admin panel — creates and stores key in canister
- Backend `getKeys(adminKey)` to return all keys (for admin panel view from any device)
- Backend `deleteKey(adminKey, key)` to remove a specific key
- Backend `clearAllKeys(adminKey)` to remove all keys

### Modify

- Admin modal: replace localStorage key CRUD with backend API calls (`generateKey`, `getKeys`, `deleteKey`, `clearAllKeys`)
- Key validation on landing page: replace localStorage lookup with backend `useKey(key, deviceId)` call — which also binds the device
- Keys list in admin panel now shows device binding status (bound / unbound)
- Loading states added for async backend calls

### Remove

- All `localStorage` key storage logic for generated keys (`pubg_generated_keys`)
- `loadKeys()` / `saveKeys()` helper functions

## Implementation Plan

1. Generate Motoko backend with:
   - `generateKey(adminKey: Text, durationDays: Nat): async Text` — creates a random numeric key, stores with expiry and no deviceId bound
   - `getKeys(adminKey: Text): async [KeyRecord]` — returns all keys with their state
   - `validateAndBindKey(key: Text, deviceId: Text): async ValidationResult` — validates key, binds deviceId on first use, rejects if different deviceId
   - `deleteKey(adminKey: Text, key: Text): async Bool`
   - `clearAllKeys(adminKey: Text): async Bool`
   - `KeyRecord` type: `{ key: Text; durationDays: Nat; expiryTimestamp: Int; deviceId: ?Text }`
   - `ValidationResult` type: `{ valid: Bool; message: Text; isAdmin: Bool; expiryTimestamp: ?Int }`

2. Frontend updates:
   - Add device fingerprint utility (deterministic hash from navigator properties)
   - Replace all `loadKeys`/`saveKeys`/localStorage calls with backend actor calls
   - Add loading spinners on generate, validate, and list-fetch operations
   - Show "Device Bound" or "Open" badge next to each key in admin list
   - On admin login, fetch keys from backend immediately
