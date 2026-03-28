# ClinicaApp

A modern dental clinic management SaaS application built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables** (`.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Create the database schema** in Supabase SQL Editor:
   ```sql
   CREATE TABLE patients (
     id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
     first_name varchar(255) NOT NULL,
     last_name varchar(255) NOT NULL,
     dpi varchar(50) NOT NULL UNIQUE,
     phone varchar(20) NOT NULL,
     email varchar(255) NOT NULL,
     date_of_birth date NOT NULL,
     created_at timestamp DEFAULT NOW(),
     updated_at timestamp DEFAULT NOW()
   );
   
   CREATE INDEX idx_patients_dpi ON patients(dpi);
   CREATE INDEX idx_patients_email ON patients(email);
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser** and visit [http://localhost:3000](http://localhost:3000)

## Features

✅ Patient Registration Form
- First Name, Last Name, DPI, Phone, Email, Date of Birth
- Form validation and error handling
- Success notifications

✅ Supabase Integration
- PostgreSQL database for patient records
- Secure API endpoints

✅ Modern Tech Stack
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- ESLint for code quality

## Project Structure

```
app/                    # Next.js app directory
├── api/                # API routes
│   └── patients/
├── layout.tsx          # Root layout
└── page.tsx            # Home page

components/            # React components
├── PatientRegistrationForm.tsx

lib/                   # Utility functions
├── supabase.ts        # Supabase client

.env.local             # Environment variables (create this)
```

## Available Scripts

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Documentation

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup instructions, troubleshooting, and next steps.

## Technology Stack

- **Frontend**: Next.js 14, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js API routes
- **Database**: Supabase (PostgreSQL)
- **Tools**: ESLint, npm

## Getting Help

For detailed setup and troubleshooting, refer to [SETUP_GUIDE.md](./SETUP_GUIDE.md).
