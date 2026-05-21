export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #F8F9FA 0%, #EBF5FF 50%, #F8F9FA 100%)' }}
    >
      {children}
    </div>
  )
}
