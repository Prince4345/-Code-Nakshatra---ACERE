# Final Product QA

Date: 2026-04-04

## Web Checks

- `npm run test`
  - Result: passed (`9/9`)
- `npm run build`
  - Result: passed
- Firebase Hosting deploy
  - Result: passed
  - URL: `https://acere4345.web.app`
- Firestore rules deploy
  - Result: passed

## Mobile Checks

- `npm run typecheck`
  - Result: passed
- `npx expo export --platform android --output-dir dist-test`
  - Result: passed
- EAS Android preview build
  - Result: started from final hardened codebase

## Final Sweep Areas Covered

- Auth
  - Login/signup still compile and load
- Mapping
  - Native Google Maps bundle compiles successfully
  - Plot save now uses queued sync flow
- Uploading
  - Upload flow now supports queued sync with resumable progress tracking
- Offline/retry
  - Pending uploads and plot saves persist locally and can retry
- Monitoring
  - Mobile error boundary and global error handler added
  - Web error boundary and window error capture added
- Permissions
  - Firestore rules updated and redeployed for monitoring events

## Manual Device Checks To Run On Installed APK

- Log in as exporter and confirm:
  - Plot save works when online
  - Plot save queues when offline
  - Document upload shows progress
  - Failed sync item can retry
- Log in as verifier and confirm:
  - Queue opens cleanly
  - Decision modal fits small screens
- Log in as importer and confirm:
  - Package cards fit the screen
  - Document buttons open correctly

## Release Notes

- Mobile app moved to native-style bottom-tab navigation and shared data providers
- Exporter flow now uses a persistent sync queue for uploads and plot saves
- Mobile and web now include product-level error monitoring hooks
- Web UI and mobile UI received a premium dark-blue polish pass
