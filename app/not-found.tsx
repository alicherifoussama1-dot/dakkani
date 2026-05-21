import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-20"
      style={{ backgroundColor: '#FFFFFF' }}
      dir="rtl"
    >
      <div className="text-center max-w-md">
        <p
          className="font-black mb-4"
          style={{ fontSize: '96px', lineHeight: '1', color: '#EBEBEB', fontFamily: 'var(--font-inter)' }}
        >
          404
        </p>
        <h1
          className="text-2xl font-black mb-3"
          style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
        >
          الصفحة غير موجودة
        </h1>
        <p
          className="mb-8 text-sm"
          style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
        >
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center font-bold rounded-xl h-11 px-6 text-sm text-white transition-all"
            style={{ backgroundColor: '#0D6EFD', fontFamily: 'var(--font-tajawal)' }}
          >
            لوحة التحكم
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center font-medium rounded-xl h-11 px-6 text-sm border transition-all"
            style={{ color: '#111111', borderColor: '#EBEBEB', fontFamily: 'var(--font-tajawal)' }}
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}
