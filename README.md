# VCA Applicant Review Platform

A Next.js 14 application for reviewing VCA applicants with a dual-reviewer scoring system, admin management, and results dashboard.

## Features

- **Dual-Reviewer System**: Each application is reviewed by multiple reviewers
- **Blind Reviews**: Reviewers cannot see other reviewers' scores until reviews are complete
- **4-Point Scale Rating**: Initiative, Collaboration, Curiosity, and Commitment
- **Auto-Save Drafts**: Work is automatically saved as you review
- **Admin Dashboard**: Upload applications, manage users, view analytics
- **Results Dashboard**: Sortable rankings with percentile coloring
- **Score Discrepancy Detection**: Highlights applications with significant reviewer disagreement
- **CSV Import/Export**: Bulk upload applications and export results

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Actions)
- **Auth**: NextAuth.js v5 (Auth.js)
- **Database**: Neon Postgres with Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui components
- **Validation**: Zod
- **CSV Parsing**: PapaParse
- **File Upload**: react-dropzone

## Getting Started

### Prerequisites

- Node.js 18+
- A Neon Postgres database (or any PostgreSQL database)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vca-review
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL=postgres://user:password@host/database?sslmode=require
AUTH_SECRET=your-secret-key-generate-with-openssl-rand-base64-32
AUTH_URL=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
```

4. Push the database schema:
```bash
npm run db:push
```

5. Seed the admin user:
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Database Scripts

- `npm run db:generate` - Generate migration files from schema changes
- `npm run db:push` - Push schema changes directly to database
- `npm run db:migrate` - Run pending migrations
- `npm run db:studio` - Open Drizzle Studio to browse database
- `npm run db:seed` - Seed the admin user

## Project Structure

```
vca-review/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── forgot-password/
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── review/          # Reviewer interface
│   │   ├── results/         # Results dashboard
│   │   └── admin/           # Admin pages
│   └── api/auth/            # NextAuth API routes
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── *.tsx                # Feature components
├── lib/
│   ├── db/                  # Database schema and connection
│   ├── actions/             # Server actions
│   ├── auth.ts              # NextAuth configuration
│   └── utils.ts             # Utility functions
└── middleware.ts            # Route protection
```

## User Roles

### Admin
- Upload applications via CSV
- Manage users (create, edit, delete reviewers)
- View all applications and reviews
- Access analytics dashboard
- Export results

### Reviewer
- View and rate assigned applications
- Cannot see other reviewers' scores (blind review)
- View completed results (only fully reviewed applications)

## CSV Format for Importing Applications

Required columns:
- `fullName` or `full_name` - Applicant's full name
- `email` - Email address (used for duplicate detection)

Optional columns:
- `phoneNumber` or `phone`
- `university` or `school`
- `major`
- `graduationYear` or `graduation_year`
- `linkedinUrl` or `linkedin`
- `resumeUrl` or `resume`
- `question1`, `question2`, `question3` - Response fields

## Rating Scale

Each applicant is rated on four criteria (1-4 scale):
- **Initiative**: Self-starter, proactive, takes ownership
- **Collaboration**: Team player, communication skills, empathy
- **Curiosity**: Eager to learn, asks questions, explores
- **Commitment**: Dedicated, reliable, follows through

Total score range: 4-16 points

## Deployment

The application is designed to be deployed on Vercel with Neon Postgres.

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## License

Private - All rights reserved
