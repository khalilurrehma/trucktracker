# LoadIQ v1

LoadIQ v1 is a full-stack fleet operations platform built around live GPS tracking, dispatch workflows, geofence-driven operations, and operational reporting. The repository combines a React frontend and an Express/MySQL backend, then extends the base tracking stack with LoadIQ-specific planning, dashboards, calculators, and case-management flows.

This codebase is not a simple tracking dashboard. It includes:

- Real-time fleet monitoring with map views, device status, replay, and event inspection
- LoadIQ operation design with geofences, zones, map layers, device assignment, live KPIs, and split-map views
- Dispatch case handling with quoting, service assignment, suggested-service approvals, Rimac reporting, and photo uploads
- Reporting for trips, routes, stops, summaries, statistics, logs, and calculator-driven custom reports
- Administration for users, devices, drivers, groups, geofences, calculators, realms, subaccounts, notifications, shifts, and usage-control rules
- Background jobs for shift automation, daily backups, odometer reminders, and driver blocking

## Architecture

### Frontend

The frontend lives in [`client/`](client/) and is built with React 18, Vite, Material UI, Tailwind CSS, Redux Toolkit, React Query, MapLibre/Mapbox, Leaflet, and charting/reporting libraries.

Primary UI areas exposed by the route tree include:

- Fleet tracking and status views
- LoadIQ operations and operation dashboards
- Dispatch and assistance workflows
- Reporting and calculator-driven analytics
- Settings and administrative management

### Backend

The backend lives in [`server/`](server/) and is built with Express, MySQL, JWT authentication, MQTT, WebSocket, AWS S3 SDK, cron jobs, and several external-service integrations.

The API surface is organized around:

- Core entities such as devices, drivers, groups, geofences, users, permissions, and reports
- LoadIQ operations, zones, operation layers, and device assignments
- Dispatch case creation, case tracking, service pricing, Rimac workflows, and report submission
- Session, authentication, calculator, notification, usage-control, shift, and subaccount features

### Real-time flow

The system uses multiple real-time channels:

- MQTT subscriptions for Flespi telemetry, interval calculators, geofence updates, and notification topics
- WebSocket broadcasting for browser and driver clients
- Live map and alert updates in the operations and dispatch views

## Main Functional Areas

### 1. Fleet tracking

- Live device map and list views
- Device detail and status cards
- Position, event, replay, and network views
- Geofence and telemetry-related monitoring

### 2. LoadIQ operations

- Multi-step operation wizard
- Zone setup for queue areas, load pads, dump areas, and zone areas
- Device assignment to operations and zones
- Operation duplication and operation-layer management
- Geofence dashboards and device dashboards
- Live operation alerts fed by MQTT/WebSocket streams

### 3. Dispatch and assistance workflows

- New case intake and quote creation
- Service catalogs, subservices, tow-car pricing, and approvals
- Search history and case progression
- Rimac case reporting and submission workflows
- Driver-facing protected actions
- Photo upload pipeline backed by S3-compatible object storage

### 4. Reporting and calculators

- Trip, route, stop, summary, chart, event, scheduled, and statistics reports
- Custom reports linked to calculator definitions
- Usage-control and driver-behaviour reporting
- Cron logs and scheduled-device logs
- Flespi calculator integration for operational KPIs

### 5. Administration and tenant management

- Users, devices, drivers, groups, and geofences
- Notifications, permissions, attributes, and commands
- Shifts, attendance, and usage-control policies
- Realms, realm users, subaccounts, and calculator assignment

## Repository Structure

```text
.
|-- client/                 # React + Vite frontend
|-- server/                 # Express + MySQL backend
|   |-- controllers/        # API controllers
|   |-- routes/             # Route registration
|   |-- model/              # Data-access layer
|   |-- services/           # Integrations and domain services
|   |-- jobs/               # Scheduled jobs
|   |-- websocket/          # WebSocket server
|   |-- mqtt/               # MQTT client and topic handlers
|   `-- calculators/        # Calculator templates and definitions
`-- README.md
```

## Technology Stack

- Frontend: React 18, Vite, Material UI, Tailwind CSS, Redux Toolkit, React Query
- Mapping: MapLibre GL, Mapbox GL, Leaflet, Turf
- Backend: Node.js, Express, MySQL, JWT
- Realtime: MQTT, WebSocket
- Storage and files: Contabo S3-compatible object storage via AWS SDK
- Integrations: Traccar, Flespi, Google Maps, Firebase Cloud Messaging, Knack, email delivery

## Local Development Setup

### Prerequisites

- Node.js 18+ recommended
- npm
- MySQL with both application and Traccar-related databases available
- Valid credentials for the third-party services you intend to use

### 1. Install dependencies

Run installs separately for the frontend and backend:

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure environment files

Copy the example files and fill them with real values:

- [`server/.env.example`](server/.env.example)
- [`client/.env.example`](client/.env.example)

Important backend configuration groups:

| Area | Required variables |
| --- | --- |
| App server | `PORT` |
| Primary database | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| Traccar database/API | `DB_TRACCAR`, `TraccarPort`, `TraccarToken` |
| Auth | `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRES_IN` |
| Optional web auth override | `WEB_ACCESS_TOKEN_SECRET`, `WEB_ACCESS_TOKEN_EXPIRES_IN` |
| Flespi and MQTT | `FlespiToken`, `MQTT_URL` or `MQTT_BROKER`, `MQTT_USERNAME` or `MQTT_TOKEN`, `MQTT_PASSWORD`, `MQTT_CLIENT_ID` |
| S3-compatible storage | `CONTABO_ACCESS_KEY_ID`, `CONTABO_SECRET_ACCESS_KEY`, `CONTABO_ENDPOINT`, `CONTABO_BUCKET_NAME`, `CONTABO_BACKUP_BUCKET_NAME`, `CONTABO_BUCKET_ADDRESS`, `CONTABO_PUBLIC_BASE`, `CONTABO_REGION`, `authKey` |
| Other integrations | `KNACK_APP_ID`, `KNACK_API_KEY`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `GMAIL_USER` |

Important frontend configuration:

| Variable | Purpose |
| --- | --- |
| `VITE_GOOGLE_MAP_API` | Google Maps integrations |
| `VITE_MAPBOX_TOKEN` | Mapbox/MapLibre token-backed features |
| `VITE_DEV_BACKEND_URL` | Development API base URL |
| `VITE_PROD_BACKEND_URL` | Production API base URL |
| `authKey` | Storage URL rewriting support |

If you use Firebase push notifications, the backend also expects a service-account file at [`server/firebase/firebase-admin.json`](server/firebase/firebase-admin.json).

### 3. Align the development ports

The frontend dev server is configured in [`client/vite.config.js`](client/vite.config.js) to proxy:

- `/api` to `http://localhost:8082`
- `/api/socket` to `ws://localhost:8082`

To avoid proxy issues during development, either:

- Run the backend on port `8082`, or
- Update the proxy target in [`client/vite.config.js`](client/vite.config.js) to match your backend `PORT`

### 4. Start the backend

```bash
cd server
npm start
```

This runs `nodemon server.js`.

### 5. Start the frontend

```bash
cd client
npm start
```

The Vite development server runs on port `3000` by default.

## Background Jobs and Operations

The backend includes scheduled and event-driven automation for:

- Shift start/end scheduling and attendance logging
- Device command execution based on shift rules
- Daily Flespi message backups to S3-compatible storage
- Odometer reminder notifications
- Automatic driver blocking for missing odometer submissions

There is also a PM2 configuration at [`server/pm2.config.js`](server/pm2.config.js) for running the main API server and the cron worker.

## Build and Deployment

Frontend production build:

```bash
cd client
npm run build
```

The output is written to `client/build`.

Backend deployment notes:

- Ensure WebSocket traffic is forwarded through your reverse proxy
- Ensure MQTT connectivity to the configured broker is allowed
- Ensure the MySQL schema already exists before starting the server
- Ensure Contabo/S3 buckets and permissions are correctly configured before using uploads or backups

## Important Repository Notes

- This repository currently does not include a root-level database migration or schema bootstrap process, so an existing MySQL schema is required.
- The frontend still contains upstream Traccar-derived assets and legacy code under [`client/legacy/`](client/legacy/).
- If you redistribute or reuse the frontend portion, review the licensing notice in [`client/LICENSE.txt`](client/LICENSE.txt).

## Summary

LoadIQ v1 is a customized operations platform that combines fleet tracking, dispatch orchestration, geofence-aware workflows, and operational analytics in a single codebase. For teams working with Traccar/Flespi-backed vehicle data and dispatch-heavy operations, this repository provides both the management interface and the supporting API infrastructure needed to run the system end to end.
