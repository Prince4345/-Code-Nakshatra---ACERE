# CarbonTrace AI

CarbonTrace AI is a role-based compliance platform for exporter, verifier, and importer workflows across EUDR and CBAM readiness. The current app includes:

- Firebase Auth, Firestore, and Storage
- exporter workspaces for profile, suppliers, plots, uploads, facilities, production, extractions, shipments, reports, audit, and help
- verifier queue with linked evidence review
- importer readiness and approved shipment handoff
- Flask + Google Earth Engine backend for plot screening

## Local Development

### Frontend

1. Install dependencies:
   `npm install`
2. Copy [.env.example](C:/Users/pincu/Downloads/aerce_core-compliance-engine/.env.example) to `.env.local` if you want env-based overrides.
3. Set `VITE_GOOGLE_MAPS_API_KEY` in `.env.local` to enable the Google Maps plot builder and preview maps.
4. Start the frontend:
   `npm run dev`

### Backend

1. Create a Python environment inside `backend` if needed.
2. Install backend packages:
   `pip install -r backend/requirements.txt`
3. Copy [backend/.env.example](C:/Users/pincu/Downloads/aerce_core-compliance-engine/backend/.env.example) to `backend/.env` or set the environment variables in your shell.
4. Start the Flask API:
   `python backend/server.py`

### Full Demo Mode

Run both together:

`npm run demo`

## Testing

The project now includes automated tests with Vitest and Testing Library.

- Run once:
  `npm run test`
- Run in watch mode:
  `npm run test:watch`

The current suite covers:

- compliance engine helper functions
- auth screen rendering and interaction
- report card rendering and download actions

## Frontend Deployment

The frontend is set up for Firebase Hosting.

### One-time setup

1. Install the Firebase CLI:
   `npm install -g firebase-tools`
2. Log in:
   `firebase login`

### Deploy

1. Build the app:
   `npm run build`
2. Deploy hosting and rules:
   `firebase deploy --only hosting,firestore:rules,storage`

The hosting configuration is in:

- [firebase.json](C:/Users/pincu/Downloads/aerce_core-compliance-engine/firebase.json)
- [.firebaserc](C:/Users/pincu/Downloads/aerce_core-compliance-engine/.firebaserc)
- [firestore.rules](C:/Users/pincu/Downloads/aerce_core-compliance-engine/firestore.rules)
- [storage.rules](C:/Users/pincu/Downloads/aerce_core-compliance-engine/storage.rules)

## Backend Deployment

The Flask + Earth Engine service is deployed on Cloud Run.

Live backend URL:

- [carbontrace-gee-backend](https://carbontrace-gee-backend-450480666281.asia-south1.run.app)

Files used for deployment:

- [backend/Dockerfile](C:/Users/pincu/Downloads/aerce_core-compliance-engine/backend/Dockerfile)
- [backend/server.py](C:/Users/pincu/Downloads/aerce_core-compliance-engine/backend/server.py)
- [backend/gee_analysis.py](C:/Users/pincu/Downloads/aerce_core-compliance-engine/backend/gee_analysis.py)
- [backend/cloudrun.env.yaml](C:/Users/pincu/Downloads/aerce_core-compliance-engine/backend/cloudrun.env.yaml)

### Required backend environment variables

- `PORT`
- `FRONTEND_ORIGINS`
- `GEE_SERVICE_ACCOUNT_PATH`
- `GEE_SERVICE_ACCOUNT_JSON`

### Health check

The backend exposes:

- [GET /api/health](https://carbontrace-gee-backend-450480666281.asia-south1.run.app/api/health)

## Firebase Functions

Email notifications now run through Firebase Functions instead of Flask.

Files:

- [functions/package.json](C:/Users/pincu/Downloads/aerce_core-compliance-engine/functions/package.json)
- [functions/index.js](C:/Users/pincu/Downloads/aerce_core-compliance-engine/functions/index.js)
- [functions/.env.example](C:/Users/pincu/Downloads/aerce_core-compliance-engine/functions/.env.example)

### Functions setup

1. Install dependencies:
   `cd functions && npm install`
2. Copy [functions/.env.example](C:/Users/pincu/Downloads/aerce_core-compliance-engine/functions/.env.example) to `functions/.env`
3. Deploy:
   `firebase deploy --only functions`

## Environment Variables

### Frontend

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_FUNCTIONS_REGION`
- `VITE_GEE_API_URL`
- `VITE_APP_BASE_URL`

### Backend

- `PORT`
- `FRONTEND_ORIGINS`
- `GEE_SERVICE_ACCOUNT_PATH`

### Firebase Functions

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `SMTP_USE_TLS`

## Notes

- Keep the Earth Engine service account JSON private.
- Firebase web config can live in the frontend, but Firestore and Storage rules should be reviewed before public deployment.
- The app uses SPA rewrites, so direct deep links like `/app/exporter/shipments` work correctly on Firebase Hosting.
- Email notifications are now supported through Firebase Functions. If SMTP is not configured there, in-app notifications still work and email delivery will be skipped safely.
- Current live frontend:
  [https://acere4345.web.app](https://acere4345.web.app)
