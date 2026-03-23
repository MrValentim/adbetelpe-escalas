'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Check, Megaphone, Globe, Lock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AvisosClient({ avisos: inicial }: { avisos: any[] }) {
  const [avisos, setAvisos] = useState(inicial)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ titulo: '', conteudo: '', publico: true, expira_em: '' })
  const supabase = createClient()

  async function salvar() {
    if (!form.titulo || !form.conteudo) return
    setSalvando(true)
    const { data: user } = await supabase.auth.getUser()
    const { data } = await supabase.from('avisos')
      .insert({ ...form, criado_por: user.user?.id, expira_em: form.expira_em || null })
      .select('*, autor:usuarios(obreiro:obreiros(nome_completo,cargo))').single()
    if (data) setAvisos(prev => [data, ...prev])
    setSalvando(false)
    setModal(false)
    setForm({ titulo: '', conteudo: '', publico: true, expira_em: '' })
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este aviso?')) return
    await supabase.from('avisos').delete().eq('id', id)
    setAvisos(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Avisos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Comunicados para a equipe</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Novo aviso
        </button>
      </div>

      <div className="space-y-3">
        {avisos.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
            <Megaphone size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nenhum aviso publicado</p>
          </div>
        )}
        {avisos.map(a => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.publico ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {a.publico ? <Globe size={10} /> : <Lock size={10} />}
                    {a.publico ? 'Público' : 'Privado'}
                  </span>
                  {a.expira_em && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Expira {format(parseISO(a.expira_em), "dd/MM/yyyy")}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{a.titulo}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{a.conteudo}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {format(parseISO(a.criado_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <button onClick={() => excluir(a.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold">Novo aviso</h2>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
                <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Reunião de obreiros em 15/05"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem *</label>
                <textarea value={form.conteudo} onChange={e => setForm(p => ({ ...p, conteudo: e.target.value }))}
                  placeholder="Conteúdo do aviso..." rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.publico}
                    onChange={e => setForm(p => ({ ...p, publico: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">Visível a todos</span>
                </label>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expira em (opcional)</label>
                  <input type="date" value={form.expira_em}
                    onChange={e => setForm(p => ({ ...p, expira_em: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.titulo || !form.conteudo}
                className="flex-1 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                {salvando ? 'Publicando...' : <><Check size={14} /> Publicar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
