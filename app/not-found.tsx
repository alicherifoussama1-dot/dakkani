import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div
        className="min-h-screen flex items-center justify-center px-4 py-20"
        style={{ backgroundColor: '#FFFFFF' }}
        dir="rtl"
      >
        <div className="text-center max-w-md">
          <p className="text-8xl font-black mb-4" style={{ color: '#EBEBEB', fontFamily: 'var(--font-inter)' }}>
            404
          </p>
          <h1
            className="text-2xl font-black mb-3"
            style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
          >
            الصفحة غير موجودة
          </h1>
          <p className="mb-8" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
            الصفحة التي تبحث عنها غير موجودة أو تم نقلها
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="btn btn-accent h-11 px-6 text-sm rounded-xl"
              style={{ fontFamily: 'var(--font-tajawal)' }}
            >
              لوحة التحكم
            </Link>
            <Link
              href="/"
              className="btn btn-white h-11 px-6 text-sm rounded-xl"
              style={{ fontFamily: 'var(--font-tajawal)' }}
            >
              الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
