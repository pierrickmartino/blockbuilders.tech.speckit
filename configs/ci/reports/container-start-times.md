# Container Cold-Start Timings

Measured during GitHub Actions `Containers` workflow. Capture time from image start to passing health check for each service.

| Service | Image | Cold Start (s) | Healthcheck Command | Evidence | Notes |
|---------|-------|----------------|---------------------|----------|-------|
| Frontend | `blockbuilders/frontend-dev:ci` | n/a | `curl -f http://localhost:3000` | Workflow run log (step `healthcheck`) | Pending initial GitHub Actions `Containers` run. |
| Backend | `blockbuilders/backend-dev:ci` | n/a | `curl -f http://localhost:8000/health` | Workflow run log (step `healthcheck`) | Pending initial GitHub Actions `Containers` run. |

## How to Refresh Measurements

1. Trigger the `Containers` workflow (`workflow_dispatch` or push/PR).
2. Inspect the job logs for each service and note the duration between container start and successful health check.
3. Update the table above with the observed timings and add annotations if health checks required retries.
