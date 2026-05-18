import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center max-w-md px-6">
        <div className="w-24 h-24 bg-dakkani-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🔍</span>
        </div>
        <h1 className="text-6xl font-black text-dakkani-500 mb-2">404</h1>
        <h2 className="text-2xl font-black text-gray-900 mb-3">الصفحة غير موجودة</h2>
        <p className="text-gray-500 mb-8">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="bg-dakkani-500 hover:bg-dakkani-600 text-white font-bold px-6 py-3 rounded-xl transition"
          >
            لوحة التحكم
          </Link>
          <Link
            href="/"
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-6 py-3 rounded-xl transition"
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}
