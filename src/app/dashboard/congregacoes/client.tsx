'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CARGO_PREFIX } from '@/types'
import { Plus, X, Check, Building2, MapPin, Phone, User } from 'lucide-react'

export default function CongregacoesClient({ congregacoes: inicial }: { congregacoes: any[] }) {
  const [congregacoes, setCongregacoes] = useState(inicial)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', endereco: '', bairro: '', cidade: 'Olinda', estado: 'PE', cep: '', telefone: '' })
  const supabase = createClient()

  async function salvar() {
    if (!form.nome || !form.endereco) return
    setSalvando(true)
    const { data } = await supabase.from('congregacoes')
      .insert({ ...form, ativo: true })
      .select('*, lider:obreiros(id,nome_completo,cargo,telefone)')
      .single()
    if (data) setCongregacoes(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    setSalvando(false)
    setModal(false)
    setForm({ nome: '', endereco: '', bairro: '', cidade: 'Olinda', estado: 'PE', cep: '', telefone: '' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CongregaÃ§Ãµes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{congregacoes.length} cadastradas</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nova congregaÃ§Ã£o
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {congregacoes.map(c => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{c.nome}</h3>
                <div className="mt-1.5 space-y-1">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{c.endereco}{c.bairro ? `, ${c.bairro}` : ''} â€” {c.cidade}/{c.estado}</span>
                  </p>
                  {c.telefone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Phone size={11} className="text-gray-400" /> {c.telefone}
                    </p>
                  )}
                  {c.lider && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <User size={11} className="text-gray-400" />
                      {CARGO_PREFIX[c.lider.cargo as keyof typeof CARGO_PREFIX]} {c.lider.nome_completo}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold">Nova congregaÃ§Ã£o</h2>
              <button onClick={() => setModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Sede, Janga, Tabajara..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">EndereÃ§o *</label>
                <input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))}
                  placeholder="Rua, nÃºmero..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
                  <input value={form.bairro} onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
                  <input value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                <input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                  placeholder="(81) 99999-9999"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !form.nome || !form.endereco}
                className="flex-1 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                {salvando ? 'Salvando...' : <><Check size={14} /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
