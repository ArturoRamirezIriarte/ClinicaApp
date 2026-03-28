import PatientRegistrationForm from '@/components/PatientRegistrationForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ClinicaApp</h1>
          <p className="text-lg text-gray-600">Dental Clinic Management System</p>
        </div>
        <PatientRegistrationForm />
      </div>
    </main>
  )
}
