import Link from 'next/link'
import LogoutButton from '@/components/seller/LogoutButton'

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col">
      {/* Top header */}
      <header className="bg-white border-b border-[#EBEBEB] sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-['Playfair_Display'] text-xl font-bold text-[#0F0F0F] tracking-tight">
              Swipely
            </span>
            <span className="text-[11px] font-semibold text-white bg-[#0F0F0F] px-2 py-0.5 rounded-full tracking-wide">
              Продавец
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="bg-white border-b border-[#EBEBEB]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-1">
            <NavTab href="/dashboard" label="Обзор" />
            <NavTab href="/items" label="Товары" />
            <NavTab href="/analytics" label="Аналитика" />
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}

function NavTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-3 text-[13px] font-medium text-[#6B6B6B] hover:text-[#0F0F0F] border-b-2 border-transparent hover:border-[#0F0F0F] transition-all whitespace-nowrap"
    >
      {label}
    </Link>
  )
}
