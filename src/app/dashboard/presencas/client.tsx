'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CARGO_PREFIX } from '@/types'
import { CheckCircle, XCircle, RefreshCw, ChevronDown, AlertCircle, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PRESENCA_CONFIG = {
  pendente:    { label: 'Pendente',    color: 'bg-gray-100 text-gray-600',   icon: '⏳' },
  confirmado:  { label: 'Presente',    color: 'bg-green-100 text-green-700', icon: '✅' },
  ausente:     { label: 'Ausente',     color: 'bg-red-100 text-red-700',     icon: '❌' },
  substituido: { label: 'Substituído', color: 'bg-amber-100 text-amber-700', icon: '🔄' },
}

export default function PresencasClient({ periodos, cultos: inicial, periodoAtualId }: any) {
  const [periodoId, setPeriodoId] = useState(periodoAtualId)
  const [cultos, setCultos] = useState(inicial)
  const [modalAberto, setModalAberto] = useState<any>(null) // { cultoObreiro, culto }
  const [form, setForm] = useState({ presenca: '', justificativa: '', substituto_id: '' })
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  async function mudarPresenca(co: any, novaPresenca: string, justificativa = '', substitutoId = '') {
    if (novaPresenca === 'ausente' && !justificativa) {
      setModalAberto({ co, novaPresenca })
      setForm({ presenca: novaPresenca, justificativa: '', substituto_id: '' })
      return
    }

    setSalvando(true)
    const { error } = await supabase.from('culto_obreiros').update({
      presenca: novaPresenca,
      justificativa_falta: novaPresenca === 'ausente' ? justificativa : null,
      substituto_id: novaPresenca === 'substituido' ? substitutoId || null : null,
      registrado_em: new Date().toISOString(),
    }).eq('id', co.id)

    if (!error) {
      setCultos((prev: any[]) => prev.map(c => ({
        ...c,
        escalados: c.escalados.map((e: any) =>
          e.id === co.id ? { ...e, presenca: novaPresenca, justificativa_falta: justificativa } : e
        )
      })))
    }
    setSalvando(false)
    setModalAberto(null)
  }

  async function salvarModal() {
    if (!form.justificativa.trim()) return
    setSalvando(true)
    await mudarPresenca(modalAberto.co, form.presenca, form.justificativa, form.substituto_id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Presenças</h1>
          <p className="text-gray-500 text-sm mt-0.5">Registre a presença após cada culto</p>
        </div>
      </div>

      {/* Seletor de período */}
      <div className="relative mb-5 max-w-sm">
        <select value={periodoId ?? ''} onChange={e => setPeriodoId(e.target.value)}
          className="w-full appearance-none px-4 py-2.5 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 font-medium">
          {periodos.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {/* Lista de cultos passados */}
      <div className="space-y-4">
        {cultos.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhum culto passado encontrado neste período</p>
          </div>
        )}

        {cultos.map((c: any) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header do culto */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  {format(parseISO(c.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
                <span className="text-xs text-gray-400 ml-2">·</span>
                <span className="text-xs text-gray-500 ml-2">{c.congregacao?.nome}</span>
                <span className="text-xs text-gray-400 ml-2">·</span>
                <span className="text-xs text-gray-500 ml-2">{c.tipo_culto?.nome}</span>
              </div>
            </div>

            {/* Escalados e presenças */}
            {c.escalados?.length === 0 ? (
              <div className="px-5 py-4 text-sm text-gray-400 italic">Nenhum obreiro escalado</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {c.escalados?.map((e: any) => {
                  const cfg = PRESENCA_CONFIG[e.presenca as keyof typeof PRESENCA_CONFIG]
                  return (
                    <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {CARGO_PREFIX[e.obreiro?.cargo]} {e.obreiro?.nome_completo}
                        </p>
                        {e.justificativa_falta && (
                          <p className="text-xs text-red-600 mt-0.5 italic">{e.justificativa_falta}</p>
                        )}
                      </div>

                      {/* Status atual */}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>

                      {/* Botões de ação */}
                      <div className="flex gap-1">
                        <button onClick={() => mudarPresenca(e, 'confirmado')} title="Presente"
                          className={`p-1.5 rounded-lg transition-colors ${e.presenca === 'confirmado' ? 'bg-green-100 text-green-600' : 'text-gray-300 hover:text-green-500 hover:bg-green-50'}`}>
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => mudarPresenca(e, 'ausente')} title="Ausente"
                          className={`p-1.5 rounded-lg transition-colors ${e.presenca === 'ausente' ? 'bg-red-100 text-red-600' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}>
                          <XCircle size={16} />
                        </button>
                        <button onClick={() => mudarPresenca(e, 'substituido')} title="Substituído"
                          className={`p-1.5 rounded-lg transition-colors ${e.presenca === 'substituido' ? 'bg-amber-100 text-amber-600' : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'}`}>
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal: justificativa de falta */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500" />
                <h2 className="text-base font-semibold text-gray-900">Registrar ausência</h2>
              </div>
              <button onClick={() => setModalAberto(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">
                Informe o motivo da ausência de{' '}
                <strong>{CARGO_PREFIX[modalAberto.co?.obreiro?.cargo]} {modalAberto.co?.obreiro?.nome_completo}</strong>.
              </p>
              <textarea
                value={form.justificativa}
                onChange={e => setForm(p => ({ ...p, justificativa: e.target.value }))}
                placeholder="Ex: Viagem, doença, compromisso de trabalho..."
                rows={3} autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
              <p className="text-xs text-gray-400">* Campo obrigatório para registrar falta</p>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setModalAberto(null)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvarModal} disabled={salvando || !form.justificativa.trim()}
                className="flex-1 px-4 py-2 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
                {salvando ? 'Salvando...' : 'Confirmar falta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
