# Advocase

Advocase is a modern cloud-based Legal Practice Management platform built for solo advocates, law firms, and legal teams.

It enables advocates to manage clients, cases, hearings, organizations, and day-to-day legal operations through a secure, scalable, and intuitive web application.

---

## Features

### Authentication
- Secure email/password authentication with Supabase Auth
- Email verification
- Protected routes
- Persistent user sessions

### Organization Management
- Create a law firm (Organization)
- Generate a unique organization code
- Join an existing organization using the organization code
- Owner approval workflow for new members
- Multi-user organization support
- Role-based member management

### Client Management
- Add, edit and delete clients
- Store contact details and district information
- Client notes
- Search clients by name, mobile number and district
- View complete client profile
- View all cases linked to a client

### Case Management
- Add, edit and delete cases
- Associate cases with clients
- Court details
- Case type
- Filing date
- Next hearing date
- Case status management
- Case description
- Search and filter cases
- View complete case details

### Dashboard
- Practice overview
- Recent clients
- Recent cases
- Upcoming hearings
- Quick actions

### Security
- Supabase Row Level Security (RLS)
- Organization-based data isolation
- Secure authentication middleware
- Role-based access control

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Radix UI
- Lucide Icons

### Backend

- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

---

## Project Structure

```text
src
├── components
├── hooks
├── integrations
│   └── supabase
├── lib
├── routes
├── styles
└── utils
```

---

## Installation

Clone the repository

```bash
git clone <repository-url>
```

Install dependencies

```bash
npm install
```

Configure environment variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Run the development server

```bash
npm run dev
```

Build for production

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

---

## Roadmap

- Hearing history
- Document management
- PDF generation
- Calendar view
- Global search
- AI legal assistant
- WhatsApp reminders
- Notification system
- Billing & subscriptions
- Mobile optimization

---

## License

Private Project

Copyright © 2026 Advocase.
All rights reserved.