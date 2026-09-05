# SignalLog — Offline Incident Logger

SignalLog is an offline-first Progressive Web App (PWA) designed for security incident responders to log investigative and containment actions in real time. All entries are stored locally on the device in IndexedDB and connected through a tamper-evident SHA-256 cryptographic hash chain.

After the PWA's initial load/installation, SignalLog requires **zero network connectivity** and operates with complete autonomy during network outages or air-gapped forensic operations.

---

## Key Features

- 🛡️ **Offline-First PWA Architecture**: Operates with zero network dependency using Service Worker precaching (`vite-plugin-pwa` and Workbox).
- 🔗 **Tamper-Evident SHA-256 Hash Chain**: Each action is cryptographically anchored to the preceding entry using the standard browser Web Crypto API.
- 💾 **Local IndexedDB Persistence**: High-performance client-side storage managed through `idb-keyval`.
- 🔍 **Real-Time Chain Audit & Verification**: An in-browser verification engine audits sequential indexes, genesis linkage, and cryptographic hashes without mutating stored data.
- 🛠️ **Debug Tamper Tool**: A built-in collapsible debug tool (`Debug: edit entry text directly`) allows manual editing of stored text to demonstrate immediate cryptographic breach detection and recovery.
- 📄 **Zero-Network JSON & Report Export**: Downloads incident records and human-readable reports locally via `Blob` and `URL.createObjectURL` without sending data to external servers.
- 🎨 **SOC Security Dark Theme**: Accessible interface featuring visual status tags (not color alone), click-to-copy hash buttons, and live network status indicators.

---

## Cryptographic Hash Chain Architecture

### Data Model

Each log entry is stored with the following schema:

```json
{
  "index": 0,
  "timestamp": "2026-09-05T08:00:00.000Z",
  "text": "Isolated infected workstation WS-0412 from subnet VLAN-4.",
  "tag": "containment",
  "prevHash": "GENESIS",
  "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

### Hash Formula

Hashes are computed using standard SHA-256 via `window.crypto.subtle.digest`:

$$\text{hash} = \text{SHA-256}(\text{prevHash} + \text{timestamp} + \text{text})$$

- **Genesis Entry (`#0`)**: `prevHash` is strictly `"GENESIS"`.
- **Subsequent Entries (`#i` where $i > 0$)**: `prevHash` equals `entries[i - 1].hash`.
- **Integrity Rule**: If any character in `text`, `timestamp`, or `prevHash` is modified post-creation, the recomputed SHA-256 digest fails to match `entry.hash`, immediately invalidating the chain from that entry forward.

### Verification Rules

The verification engine (`src/services/verify.js`) checks:
1. **Sequential Indexing**: `entry.index === i` for all entries.
2. **Chain Linkage**: Entry 0 has `prevHash === "GENESIS"`; each entry $i > 0$ has `prevHash === entries[i - 1].hash`.
3. **Digest Integrity**: Recomputed $\text{SHA-256}(\text{prevHash} + \text{timestamp} + \text{text}) === \text{entry.hash}$.

---

## Tech Stack

- **Framework**: React 19 + Vite 8
- **Routing**: React Router DOM v7
- **Storage**: `idb-keyval` (IndexedDB abstraction)
- **Cryptography**: Web Crypto API (`window.crypto.subtle`)
- **PWA & Caching**: `vite-plugin-pwa` + Workbox
- **Styling**: Modern Vanilla CSS with CSS Custom Properties and accessible dark theme tokens

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/tejaswini572/signal_log.git
cd signal_log
npm install
```

### Development Server

Start the local Vite development server:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

### Production Build & Preview

To build the optimized production bundle and service worker:

```bash
npm run build
```

To test the production build with full PWA service worker caching:

```bash
npm run preview
```

Open your browser at `http://localhost:4173`.

---

## Offline Testing Instructions

To verify complete zero-network offline functionality:

1. **Build and serve the production preview**:
   ```bash
   npm run build
   npm run preview
   ```
2. **Open the browser**:
   Navigate to `http://localhost:4173`.
3. **Verify Service Worker Installation**:
   - Open Developer Tools (`F12`).
   - Navigate to **Application** > **Service Workers**.
   - Verify `sw.js` is active and running.
   - In **Application** > **Manifest**, confirm manifest details and icons.
4. **Simulate Offline Environment**:
   - In Developer Tools, go to the **Network** tab.
   - Change throttling from **No throttling** to **Offline**.
   - Reload the page (`Ctrl + R` or `F5`).
   - Notice that the application loads immediately from the service worker cache with no network errors.
   - The top navigation bar displays the `Offline Mode` indicator.
5. **Log, Verify, and Export Offline**:
   - Navigate to **Timeline** and submit a new response action.
   - Navigate to **Verify Chain** and confirm all hashes validate offline.
   - Navigate to **Export** and click **↓ Download JSON** to save the log locally.

---

## Demonstrating Tamper Detection

SignalLog includes a dedicated debug tool to test cryptographic detection of unauthorized data modifications:

1. Navigate to the **Verify Chain** screen (`/verify`).
2. Verify the initial state displays green: `✔ Chain intact — N entries verified`.
3. Expand the collapsible panel labeled `Debug: edit entry text directly`.
4. Select a target entry from the dropdown and ensure `Modify Text (Hash Mismatch)` is selected.
5. In the labelled textarea, edit the text (for example, append `[UNAUTHORIZED MODIFICATION]`).
6. Click **Overwrite stored text**.
   - The tool updates only the entry's text directly in IndexedDB without recalculating hashes.
   - The audit engine immediately runs and reports:
     ```
     ✖ Chain broken at entry #X
     ⚠ Entry #X stored hash does not match the recomputed hash.
     ```
   - The tampered entry is highlighted with a red border and an `INTEGRITY FAILURE` badge.
7. Click **Timeline** in the navigation: observe the modified text is stored and displayed.
8. Return to **Verify Chain**, expand the debug panel, and click **↺ Restore Original Log**:
   - The pristine snapshot is restored to IndexedDB.
   - The audit re-runs and returns to green: `✔ Chain intact`.

---

## Incident Response Workflow

1. **Start Incident**: Enter an incident name (e.g., `INC-2026-MALWARE-01`) to initialize the session.
2. **Log Actions**: Record response actions categorised by phase:
   - `detection` (Investigation, alerts, triage)
   - `containment` (Isolation, blocking, segmenting)
   - `eradication` (Remediation, malware removal, patching)
   - `communication` (Briefings, notifications, escalations)
3. **Audit Chain**: Check hash integrity at any time on the Verify Chain page.
4. **Export Artifacts**: Download a standalone JSON export or review the structured incident report for post-incident reviews and compliance audits.

---

## Security & Privacy Considerations

- **Zero Telemetry**: SignalLog contains no analytics, telemetry, or external tracking scripts.
- **Client-Side Only**: All cryptographic operations execute within the client's Web Crypto runtime. No plaintext, timestamps, or hashes leave the local browser environment.
- **Auditable**: Incident JSON exports contain the entire chain of previous hashes, allowing external auditors to independently verify every hash using any SHA-256 utility.

---

## License

MIT License. Developed for secure incident response operations.
