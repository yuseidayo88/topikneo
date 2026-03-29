# Release Monitoring Runbook

## Goal
- Detect critical issues quickly within 24 hours after release.
- Minimize user impact by defining clear owners and response timing.

## Dashboards to Watch
- Sentry Issues (`environment=production`)
- Sentry Performance (optional if tracing enabled)
- App Store Connect TestFlight feedback and crash reports

## First 24 Hours Checklist
- **T+0 to T+1h**
  - Check Sentry every 10-15 minutes.
  - Confirm no spike in new crashes after rollout.
  - Verify login, lesson load, and subscription screen on 1 real device.
- **T+1h to T+6h**
  - Check Sentry every 30 minutes.
  - Triage all new `Unhandled` or `Fatal` issues.
- **T+6h to T+24h**
  - Check Sentry every 2-3 hours.
  - Confirm top issues have owner + mitigation note.

## Alert Rules (Recommended)
- New issue with `level=error` in `production` (immediate)
- Error count spike (e.g. >20 events / 10min)
- New crash-free session rate drop

## Severity and Response
- **P0**
  - App cannot launch / login broken / lesson cannot load
  - Response: hotfix decision within 30 minutes
- **P1**
  - Major feature degraded, workaround exists
  - Response: fix plan within same day
- **P2**
  - Minor UX or non-blocking issue
  - Response: include in next patch

## Incident Template
- What happened:
- Impacted users:
- First seen:
- Root cause:
- Mitigation:
- Permanent fix:

## Notes for This Project
- Sentry release/dist are set from app version/build number in `app/_layout.tsx`.
- Manual test event name: `manual_sentry_test_exception`.
