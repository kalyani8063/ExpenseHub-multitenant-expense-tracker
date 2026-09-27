# ExpenseHub

A multi-tenant SaaS expense tracking application built to demonstrate core cloud
computing concepts — tenant-isolated data architecture, containerized deployment,
managed cloud storage, IAM-based access control, and network security.

Built as a course project for [Your Course Name], demonstrating the practical
application of IaaS, PaaS, and SaaS layers in a real deployed system.

![ExpenseHub Dashboard](./docs/screenshots/dashboard.png)

## What it does

ExpenseHub allows multiple organizations to use the same deployed application
while keeping each organization's financial data completely isolated from every
other organization. Each org can:

- Track and categorize expenses, with optional receipt images
- Invite team members with role-based access: admins see and manage every
  expense in the organization, members see only their own
- View organization-scoped expense history and monthly summaries

## Tech Stack

- **Frontend/Backend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Authentication & Organizations**: Clerk
- **Database**: PostgreSQL via Drizzle ORM
- **Deployment**: Docker, Google Cloud Platform (Compute Engine, Cloud SQL,
  Cloud Storage, Artifact Registry, Cloud Build)
- **CI**: GitHub Actions (lint, type checks, unit, Storybook and E2E tests)

## Cloud Architecture

Full details, diagrams and design decisions are in the
[architecture document](./docs/architecture.md). The project maps to the course
units as follows:

| Unit | Concept | Implementation |
|------|---------|-----------------|
| Unit I | IaaS / PaaS / SaaS layers | ExpenseHub is the SaaS; Cloud SQL, Cloud Storage and Cloud Build are PaaS; the Compute Engine VM and VPC are IaaS ([architecture §1](./docs/architecture.md#1-system-overview)) |
| Unit II | Compute & Virtualization | Dockerized app running on a GCP Compute Engine VM |
| Unit III | Cloud Services | Multi-stage Docker build ([Dockerfile](./Dockerfile)); images built with Cloud Build and stored in Artifact Registry; project, billing and APIs managed with the GCP Console and Cloud SDK |
| Unit IV | Cloud Storage | Transaction data in Cloud SQL (tenant-isolated by `organization_id`); receipts in a private Cloud Storage bucket, served through short-lived signed URLs ([architecture §4](./docs/architecture.md#4-storage)) |
| Unit V | Service Management | Shared responsibility model, default encryption at rest and in transit, least-privilege service account with Cloud IAM, role-based access in the app, budget alerts, and a GitHub Actions DevOps pipeline ([architecture §5–7](./docs/architecture.md#5-security)) |

## Running locally

See [HANDOVER.md](./HANDOVER.md) for step-by-step local setup.

## Team

- [Team member name]

## License

Distributed under the [MIT License](./LICENSE).
