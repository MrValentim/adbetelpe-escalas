'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EscalaPeriodo } from '@/types'
import { Plus, X, Check, Calendar, Lock, Send, FileText } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_CONFIG = {
  rascunho:  { label: 'Rascunho',  color: 'bg-gray-100 text-gray-600',   icon: FileText },
  publicado: { label: 'Publicado', color: 'bg-green-100 text-green-700', icon: Send },
  fechado:   { label: 'Fechado',   color: 'bg-blue-100 text-blue-700',   icon: Lock },
}

export default function PeriodosClient({ periodos: inicial }: { periodos: EscalaPeriodo[] }) {
  const [periodos, setPeriodos] = useState(inicial)
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', data_inicio: '', data_fim: '', observacoes: '' })
  const supabase = createClient()

  async function salvar() {
    if (!form.nome || !form.data_inicio || !form.data_fim) return
    setSalvando(true)
    const { data } = await supabase.from('escala_periodos')
      .insert({ ...form, status: 'rascunho', observacoes: form.observacoes || null })
      .select().single()
    if (data) setPeriodos(prev => [data, ...prev])
    setSalvando(false)
    setModalAberto(false)
    setForm({ nome: '', data_inicio: '', data_fim: '', observacoes: '' })
  }

  async function mudarStatus(p: EscalaPeriodo, novoStatus: EscalaPeriodo['status']) {
    const { data } = await supabase.from('escala_periodos')
      .update({ status: novoStatus }).eq('id', p.id).select().single()
    if (data) setPeriodos(prev => prev.map(x => x.id === data.id ? data : x))
  }

  function formatarPeriodo(p: EscalaPeriodo) {
    const ini = format(parseISO(p.data_inicio), "dd 'de' MMMM", { locale: ptBR })
    const fim = format(parseISO(p.data_fim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    return `${ini} → ${fim}`
  }

  function diasRestantes(p: EscalaPeriodo) {
    const hoje = new Date()
    const fim = parseISO(p.data_fim)
    const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return null
    if (diff === 0) return 'Termina hoje'
    return `${diff} dias restantes`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Períodos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Cada período equivale a uma planilha de escala</p>
        </div>
        <button onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Novo período
        </button>
      </div>

      {/* Lista de períodos */}
      <div className="space-y-3">
        {periodos.map(p => {
          const cfg = STATUS_CONFIG[p.status]
          const StatusIcon = cfg.icon
          const diasR = diasRestantes(p)

          return (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                      <StatusIcon size={11} /> {cfg.label}
                    </span>
                    {diasR && p.status === 'publicado' && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {diasR}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{p.nome}</h2>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                    <Calendar size={13} />
                    {formatarPeriodo(p)}
                  </div>
                  {p.observacoes && (
                    <p className="text-xs text-gray-400 mt-1.5 italic">{p.observacoes}</p>
                  )}
                </div>

                {/* Ações por status */}
                <div className="flex gap-2 flex-shrink-0">
                  {p.status === 'rascunho' && (
                    <>
                      <a href={`/dashboard/escalas?periodo=${p.id}`}
                        className="text-xs px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 font-medium transition-colors">
                        Gerar escala
                      </a>
                      <button onClick={() => mudarStatus(p, 'publicado')}
                        className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium transition-colors">
                        Publicar
                      </button>
                    </>
                  )}
                  {p.status === 'publicado' && (
                    <button onClick={() => mudarStatus(p, 'fechado')}
                      className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                      Fechar período
                    </button>
                  )}
                  {p.status === 'fechado' && (
                    <span className="text-xs text-gray-400 italic py-1.5">Histórico</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {periodos.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">Nenhum período criado ainda</p>
            <p className="text-gray-400 text-sm mt-1">Crie o primeiro período para começar a gerar escalas</p>
            <button onClick={() => setModalAberto(true)}
              className="mt-4 text-sm text-brand-600 hover:text-brand-800 font-medium">
              Criar primeiro período →
            </button>
          </div>
        )}
      </div>

      {/* Modal novo período */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Novo período de escala</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome do período *</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Abril – Maio 2025"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data início *</label>
                  <input type="date" value={form.data_inicio}
                    onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data fim *</label>
                  <input type="date" value={form.data_fim}
                    onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observações (opcional)</label>
                <textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Alguma observação sobre este período..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              </div>

              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                💡 Após criar, clique em <strong>"Gerar escala"</strong> para adicionar os cultos e escalar os obreiros.
              </div>
            </div>

            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !form.nome || !form.data_inicio || !form.data_fim}
                className="flex-1 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                {salvando ? 'Criando...' : <><Check size={14} /> Criar período</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
