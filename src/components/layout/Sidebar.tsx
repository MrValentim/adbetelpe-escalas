'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CARGO_PREFIX, ROLE_LABELS } from '@/types'
import {
  CalendarDays, Users, Building2, ClipboardList,
  CheckSquare, BarChart3, Megaphone, Settings, LogOut, ChevronRight
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Início', icon: CalendarDays, exact: true },
  { href: '/dashboard/periodos', label: 'Períodos', icon: ClipboardList },
  { href: '/dashboard/escalas', label: 'Escalas', icon: CalendarDays },
  { href: '/dashboard/presencas', label: 'Presenças', icon: CheckSquare },
  { href: '/dashboard/ranking', label: 'Ranking', icon: BarChart3 },
  { href: '/dashboard/obreiros', label: 'Obreiros', icon: Users },
  { href: '/dashboard/congregacoes', label: 'Congregações', icon: Building2 },
  { href: '/dashboard/avisos', label: 'Avisos', icon: Megaphone },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
]

export default function Sidebar({ usuario }: { usuario: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const nomeObreiro = usuario?.obreiro
    ? `${CARGO_PREFIX[usuario.obreiro.cargo as keyof typeof CARGO_PREFIX] ?? ''} ${usuario.obreiro.nome_completo}`.trim()
    : usuario?.email ?? 'Usuário'

  const role = usuario?.role ? ROLE_LABELS[usuario.role as keyof typeof ROLE_LABELS] : ''

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">AD</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">ADBETELPE</p>
            <p className="text-xs text-gray-400">Escalas de Culto</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="space-y-0.5">
          {navItems.map(item => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== '/dashboard'
                ? true
                : pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-800 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon size={16} className={isActive ? 'text-brand-600' : 'text-gray-400'} />
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto text-brand-400" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Usuário logado */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-700 text-xs font-semibold">
              {nomeObreiro.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{nomeObreiro}</p>
            <p className="text-xs text-gray-400">{role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
