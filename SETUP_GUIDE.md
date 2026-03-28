# ClinicaApp - Dental Clinic Management System

A modern Next.js 14 application for managing dental clinic operations with patient registration.

## Features

- **Patient Registration Form**: Simple form to register new patients with the following fields:
  - First Name
  - Last Name
  - DPI (ID Number)
  - Phone
  - Email
  - Date of Birth

- **Supabase Integration**: PostgreSQL database integration for secure patient data storage
- **TypeScript**: Full TypeScript support for type safety
- **Tailwind CSS**: Modern styling with utility-first CSS
- **App Router**: Next.js 14 app router for improved performance

## Project Structure

```
clinicaapp/
├── app/
│   ├── api/
│   │   └── patients/          # Patient registration API route
│   │       └── route.ts
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page with form
│   └── globals.css            # Global styles
├── components/
│   └── PatientRegistrationForm.tsx  # Patient registration form component
├── lib/
│   └── supabase.ts            # Supabase client initialization
├── .env.local                 # Environment variables (not committed)
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Setup Instructions

### 1. Install Dependencies

Run the following command to install all required packages:

```bash
npm install
```

This will install:
- `next@16.2.1` - React framework
- `react@19.2.4` and `react-dom@19.2.4` - React library
- `@supabase/supabase-js@^2.45.0` - Supabase client
- Development dependencies for TypeScript, Tailwind CSS, and ESLint

### 2. Configure Supabase

#### a. Create a Supabase Account and Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Create a new project
4. Wait for the project to be initialized

#### b. Get Your Credentials

Once your Supabase project is ready:
1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy your **Project URL** and **Anon Key**

#### c. Set Environment Variables

Edit `.env.local` in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Note:** Replace the values with your actual credentials from the Supabase dashboard.

### 3. Create Database Schema

In your Supabase dashboard, go to the **SQL Editor** and run the following SQL to create the patients table:

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

-- Create an index on DPI for faster lookups
CREATE INDEX idx_patients_dpi ON patients(dpi);

-- Create an index on email for faster lookups
CREATE INDEX idx_patients_email ON patients(email);
```

### 4. Run the Development Server

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## API Endpoints

### POST /api/patients

Register a new patient.

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dpi": "1234567890123",
  "phone": "+502-1234-5678",
  "email": "john.doe@example.com",
  "dateOfBirth": "1990-05-15"
}
```

**Response:**

```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "dpi": "1234567890123",
  "phone": "+502-1234-5678",
  "email": "john.doe@example.com",
  "date_of_birth": "1990-05-15",
  "created_at": "2024-03-27T12:00:00Z"
}
```

## Build for Production

To build the application for production:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Troubleshooting

### Common Issues

1. **"Cannot find module '@supabase/supabase-js'"**
   - Solution: Run `npm install` to install all dependencies

2. **"Environment variables not defined"**
   - Solution: Make sure `.env.local` is created with valid Supabase credentials

3. **"Database table does not exist"**
   - Solution: Run the SQL commands in Supabase SQL Editor to create the schema

4. **"CORS errors when submitting form"**
   - Solution: Check Row Level Security (RLS) policies in Supabase. Ensure insert, select policies are enabled for anon users or use the service role key for server-side operations.

## Next Steps

To extend ClinicaApp, you can:

1. **Add Authentication**: Integrate Supabase Auth for user management
2. **Patient Management**: Create pages to view, edit, and delete patient records
3. **Appointments**: Add appointment scheduling functionality
4. **Treatments**: Create a treatment tracking system
5. **Reports**: Generate reports and analytics
6. **Admin Dashboard**: Build an admin interface for clinic staff

## Technologies Used

- **Next.js 14** - React framework with app router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - PostgreSQL database and backend services
- **React** - UI library

## License

This project is open source and available for use in dental clinic management.
