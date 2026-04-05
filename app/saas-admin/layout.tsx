// Layout independiente para el panel SaaS — sin Sidebar ni NavbarTop
export default function LayoutSaasAdmin({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f7faff' }}>
      {children}
    </div>
  )
}
