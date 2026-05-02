import Link from 'next/link';

export function Nav() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6 text-sm font-medium">
        <Link href="/" className="text-brand-600 font-bold text-lg">
          🥗 eat-cook-enjoy
        </Link>
        <Link href="/" className="hover:text-brand-600">
          היום
        </Link>
        <Link href="/progress" className="hover:text-brand-600">
          התקדמות
        </Link>
        <Link href="/meals" className="hover:text-brand-600">
          ארוחות
        </Link>
        <Link href="/workouts" className="hover:text-brand-600">
          אימונים
        </Link>
        <Link href="/settings" className="hover:text-brand-600 ms-auto">
          הגדרות
        </Link>
      </div>
    </nav>
  );
}
