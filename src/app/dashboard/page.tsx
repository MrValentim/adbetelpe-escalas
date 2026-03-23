import { createClient } from '@/lib/supabase/server'
import { CalendarDays, Users, Building2, CheckSquare, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalObreiros },
    { count: totalCongregacoes },
    { data: periodoAtivo },
    { count: cultosHoje },
    { count: presencasPendentes },
  ] = await Promise.all([
    supabase.from('obreiros').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('congregacoes').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('escala_periodos').select('id, nome, data_inicio, data_fim').eq('status', 'publicado').order('data_inicio', { ascending: false }).limit(1),
    supabase.from('cultos').select('*', { count: 'exact', head: true }).eq('data', new Date().toISOString().split('T')[0]),
    supabase.from('culto_obreiros').select('*', { count: 'exact', head: true }).eq('presenca', 'pendente'),
  ])

  const cards = [
    { label: 'Obreiros ativos', value: totalObreiros ?? 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', href: '/dashboard/obreiros' },
    { label: 'Congregações', value: totalCongregacoes ?? 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', href: '/dashboard/congregacoes' },
    { label: 'Cultos hoje', value: cultosHoje ?? 0, icon: CalendarDays, color: 'text-teal-600', bg: 'bg-teal-50', href: '/dashboard/escalas' },
    { label: 'Presenças pendentes', value: presencasPendentes ?? 0, icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50', href: '/dashboard/presencas' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Início</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Período ativo */}
      {periodoAtivo && periodoAtivo[0] && (
        <div className="bg-brand-600 rounded-xl p-5 mb-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="opacity-80" />
            <span className="text-sm opacity-80">Período ativo</span>
          </div>
          <p className="text-lg font-semibold">{periodoAtivo[0].nome}</p>
          <p className="text-sm opacity-70 mt-0.5">
            {new Date(periodoAtivo[0].data_inicio).toLocaleDateString('pt-BR')} →{' '}
            {new Date(periodoAtivo[0].data_fim).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <Link key={card.label} href={card.href}>
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow cursor-pointer">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon size={20} className={card.color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Ações rápidas */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/dashboard/periodos" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50 transition-colors">
            <CalendarDays size={18} className="text-brand-600" />
            <span className="text-sm font-medium text-gray-700">Novo período</span>
          </Link>
          <Link href="/dashboard/escalas" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50 transition-colors">
            <CheckSquare size={18} className="text-brand-600" />
            <span className="text-sm font-medium text-gray-700">Registrar presença</span>
          </Link>
          <Link href="/dashboard/obreiros" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50 transition-colors">
            <Users size={18} className="text-brand-600" />
            <span className="text-sm font-medium text-gray-700">Cadastrar obreiro</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
