import Sidebar from '@/components/Sidebar'
import NavbarTop from '@/components/NavbarTop'

export default function LayoutContabilidad({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <NavbarTop titulo="Clínica Dental Ejemplo" />
        <main style={{ flex: 1, padding: 24, background: '#f7faff', maxWidth: 1200, width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
