import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-dakkani-50 to-white">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-black text-dakkani-600">دكاني</h1>
        <p className="text-xl text-gray-600 max-w-md">
          منصة التجارة الإلكترونية الجزائرية متعددة المتاجر
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-dakkani-500 hover:bg-dakkani-600 text-white px-8 py-3 rounded-lg font-bold transition"
          >
            ابدأ مجاناً
          </Link>
          <Link
            href="/login"
            className="border border-dakkani-500 text-dakkani-600 hover:bg-dakkani-50 px-8 py-3 rounded-lg font-bold transition"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </main>
  )
}
