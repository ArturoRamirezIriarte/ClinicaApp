# Supabase Configuration Quick Reference

This guide helps you quickly set up and connect ClinicaApp to Supabase.

## Step 1: Create Supabase Project

1. Visit [supabase.com](https://supabase.com)
2. Click "New Project"
3. Enter project details:
   - **Name**: ClinicaApp
   - **Password**: Create a secure password
   - **Region**: Choose closest to your location
4. Click "Create new project" and wait for initialization

## Step 2: Get Your API Credentials

After project creation:

1. Go to **Settings** → **API** in the left sidebar
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Update Environment Variables

Create or update `.env.local` in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

**⚠️ Important**: 
- `NEXT_PUBLIC_*` variables are public (visible in browser)
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (server-only)
- Never commit `.env.local` to git

## Step 4: Create Patients Table

In your Supabase dashboard:

1. Click **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy and paste the SQL below
4. Click **Run** button

```sql
-- Create patients table
CREATE TABLE patients (
  id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  dpi VARCHAR(50) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_patients_dpi ON patients(dpi);
CREATE INDEX idx_patients_email ON patients(email);

-- Enable Row Level Security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert records
CREATE POLICY "Allow anonymous insert" ON patients
FOR INSERT
WITH CHECK (true);

-- Allow anonymous users to select records
CREATE POLICY "Allow anonymous select" ON patients
FOR SELECT
USING (true);
```

## Step 5: Verify Connection

In your terminal, run:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and try:
1. Fill in the patient registration form
2. Click "Register Patient"
3. Check Supabase dashboard → **Editor** → **patients** table for new records

## Troubleshooting

### Error: "Cannot connect to Supabase"
- ✓ Check `.env.local` file exists and has correct values
- ✓ Verify the project URL matches your Supabase project
- ✓ Ensure the project is not paused in Supabase settings

### Error: "Table 'patients' does not exist"
- ✓ Run the SQL schema creation commands in Supabase SQL Editor
- ✓ Wait for the command to complete successfully

### Error: "Permission denied"
- ✓ Enable Row Level Security policies (see SQL script above)
- ✓ Or, check if RLS/policies are too restrictive

### Form submissions fail silently
- ✓ Open browser console (F12) and check for error messages
- ✓ Check Supabase project Activity logs
- ✓ Verify `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` for API route

## Next: Environment Setup Complete ✅

Your ClinicaApp is now ready to:
- Register patients to the cloud database
- Extend with authentication (Supabase Auth)
- Add more features (appointments, treatments, etc.)

See [README.md](./README.md) and [SETUP_GUIDE.md](./SETUP_GUIDE.md) for more details.
