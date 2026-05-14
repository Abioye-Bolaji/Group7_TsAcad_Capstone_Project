# Multitenancy CBT Platform

This project provides a minimal Node.js Express backend for candidate results, admin dashboards, certificate generation, and result release notifications.

## Features

- Candidate result creation and retrieval
- Public candidate result view page
- Admin results dashboard with filtering and CSV export
- UUID-based certificate code generation
- PDF certificate generation and download
- Public certificate verification endpoint
- Admin result release with email notification via F10 notification utility

## Installation

1. Clone or copy the repository.
2. Install dependencies:

```bash
npm install
```

## Running the server

```bash
npm run dev
```

The server runs on `http://localhost:3000` by default.

## Important files

- `App.js` - API routes and server setup
- `resultStore.js` - result persistence helpers using `data/results.json`
- `certCodeGenerator.js` - unique certificate code generation and validation
- `certificateTemplate.js` - PDF certificate generation helpers
- `notificationUtil.js` - F10 release notification helper

## API Endpoints

### Public

- `GET /` - health check
- `GET /candidate-results/:candidateId/view` - HTML result page for candidate
- `GET /api/v1/certificates/verify/:certCode` - verify certificate code and return metadata

### Candidate / Results

- `POST /api/results`
  - Body: `{ candidateId, candidateName, examName, score, maxScore, email?, issuerName?, issueDate?, expiryDate?, passed?, status? }`
  - Creates or updates a candidate result
- `GET /api/results/:candidateId`
  - Returns candidate result data and certificate download URL if available

### Admin

- `GET /api/admin/results`
  - Supports filtering by `candidateName`, `email`, `examName`, `status`, `passed`, and `released`
  - Supports pagination with `page` and `limit`
- `GET /api/admin/results/dashboard`
  - Returns summary statistics and latest results
- `GET /api/admin/results/export/csv`
  - Exports filtered results as CSV
- `POST /api/admin/results/:candidateId/release`
  - Marks a candidate result as released and sends an email notification if email is present
- `POST /api/admin/results/:candidateId/certificate`
  - Generates a PDF certificate for a passed candidate
- `GET /api/admin/results/:candidateId/certificate/download`
  - Downloads the PDF certificate directly

## Data Storage

Results are stored in `data/results.json` as a simple JSON array. This project does not use a database by default.

## Environment

- `APP_BASE_URL` - optional base URL used in notification emails

## Notes

- Certificate PDF files are saved in the `certificates/` folder.
- Email notifications require the `@f10/notification` package and a valid F10 notification provider configuration.

## License

This project is provided as-is.
