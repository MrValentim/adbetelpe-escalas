'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CARGO_LABELS, CARGO_PREFIX, type Obreiro, type Cargo } from '@/types'
import { Search, Plus, Lock, Unlock, UserCheck, UserX, Phone, Mail, X, Check } from 'lucide-react'

const CARGOS: Cargo[] = ['Pr', 'Ev', 'Pb', 'Dc', 'Ax', 'Ir']

const CARGO_COLORS: Record<Cargo, string> = {
  Pr: 'bg-purple-100 text-purple-800',
  Ev: 'bg-blue-100 text-blue-800',
  Pb: 'bg-teal-100 text-teal-800',
  Dc: 'bg-amber-100 text-amber-800',
  Ax: 'bg-gray-100 text-gray-700',
  Ir: 'bg-pink-100 text-pink-800',
}

export default function ObreirosClient({ obreiros: inicial }: { obreiros: Obreiro[] }) {
  const [obreiros, setObreiros] = useState(inicial)
  const [busca, setBusca] = useState('')
  const [filtrosCargo, setFiltrosCargo] = useState<Cargo[]>([])
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'bloqueados'>('ativos')
  const [modalAberto, setModalAberto] = useState(false)
  const [obreiroEditando, setObreiroEditando] = useState<Obreiro | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome_completo: '', cargo: 'Pb' as Cargo,
    telefone: '', email: '', bloqueado: false,
    bloqueio_motivo: '', bloqueio_ate: '',
  })

  const supabase = createClient()

  const obreirosFiltrados = obreiros.filter(o => {
    const nomeMatch = o.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      `${CARGO_PREFIX[o.cargo as keyof typeof CARGO_PREFIX]} ${o.nome_completo}`.toLowerCase().includes(busca.toLowerCase())
    const cargoMatch = filtrosCargo.length === 0 || filtrosCargo.includes(o.cargo)
    const statusMatch =
      filtroStatus === 'todos' ? true :
      filtroStatus === 'ativos' ? (!o.bloqueado && o.ativo) :
      o.bloqueado
    return nomeMatch && cargoMatch && statusMatch
  })

  // Agrupa por cargo
  const porCargo = CARGOS.reduce((acc, cargo) => {
    const lista = obreirosFiltrados.filter(o => o.cargo === cargo)
    if (lista.length > 0) acc[cargo] = lista
    return acc
  }, {} as Record<Cargo, Obreiro[]>)

  function abrirNovo() {
    setObreiroEditando(null)
    setForm({ nome_completo: '', cargo: 'Pb', telefone: '', email: '', bloqueado: false, bloqueio_motivo: '', bloqueio_ate: '' })
    setModalAberto(true)
  }

  function abrirEditar(o: Obreiro) {
    setObreiroEditando(o)
    setForm({
      nome_completo: o.nome_completo, cargo: o.cargo,
      telefone: o.telefone ?? '', email: o.email ?? '',
      bloqueado: o.bloqueado, bloqueio_motivo: o.bloqueio_motivo ?? '',
      bloqueio_ate: o.bloqueio_ate ?? '',
    })
    setModalAberto(true)
  }

  async function salvar() {
    if (!form.nome_completo.trim()) return
    setSalvando(true)

    const dados = {
      nome_completo: form.nome_completo.trim(),
      cargo: form.cargo,
      telefone: form.telefone || null,
      email: form.email || null,
      bloqueado: form.bloqueado,
      bloqueio_motivo: form.bloqueado ? form.bloqueio_motivo || null : null,
      bloqueio_ate: form.bloqueado && form.bloqueio_ate ? form.bloqueio_ate : null,
    }

    if (obreiroEditando) {
      const { data } = await supabase.from('obreiros').update(dados).eq('id', obreiroEditando.id).select().single()
      if (data) setObreiros(prev => prev.map(o => o.id === data.id ? data : o))
    } else {
      const { data } = await supabase.from('obreiros').insert({ ...dados, ativo: true }).select().single()
      if (data) setObreiros(prev => [...prev, data])
    }

    setSalvando(false)
    setModalAberto(false)
  }

  async function toggleBloqueio(o: Obreiro) {
    const { data } = await supabase.from('obreiros')
      .update({ bloqueado: !o.bloqueado, bloqueio_motivo: o.bloqueado ? null : o.bloqueio_motivo })
      .eq('id', o.id).select().single()
    if (data) setObreiros(prev => prev.map(x => x.id === data.id ? data : x))
  }

  const toggleCargo = (c: Cargo) =>
    setFiltrosCargo(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Obreiros</h1>
          <p className="text-gray-500 text-sm mt-0.5">{obreiros.filter(o => o.ativo).length} cadastrados</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Novo obreiro
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou cargo..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['todos', 'ativos', 'bloqueados'] as const).map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filtroStatus === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap mt-3">
          {CARGOS.map(c => (
            <button key={c} onClick={() => toggleCargo(c)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                filtrosCargo.includes(c) ? CARGO_COLORS[c] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {CARGO_LABELS[c as keyof typeof CARGO_LABELS]}
            </button>
          ))}
        </div>
      </div>

      {/* Lista por cargo */}
      {Object.entries(porCargo).map(([cargo, lista]) => (
        <div key={cargo} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CARGO_COLORS[cargo as Cargo]}`}>
              {CARGO_LABELS[cargo as keyof typeof CARGO_LABELS]}s
            </span>
            <span className="text-xs text-gray-400">{lista.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lista.map(o => (
              <div key={o.id}
                onClick={() => abrirEditar(o)}
                className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all ${
                  o.bloqueado ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${CARGO_COLORS[o.cargo]}`}>
                        {CARGO_PREFIX[o.cargo as keyof typeof CARGO_PREFIX]}
                      </span>
                      {o.bloqueado && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                          Bloqueado
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{o.nome_completo}</p>
                    {o.telefone && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Phone size={10} /> {o.telefone}
                      </p>
                    )}
                    {o.email && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                        <Mail size={10} /> {o.email}
                      </p>
                    )}
                    {o.bloqueado && o.bloqueio_motivo && (
                      <p className="text-xs text-red-600 mt-1 italic truncate">{o.bloqueio_motivo}</p>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleBloqueio(o) }}
                    title={o.bloqueado ? 'Desbloquear' : 'Bloquear'}
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                      o.bloqueado ? 'text-red-500 hover:bg-red-100' : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'}`}>
                    {o.bloqueado ? <Unlock size={14} /> : <Lock size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {obreirosFiltrados.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <UserX size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum obreiro encontrado</p>
        </div>
      )}

      {/* Modal cadastro/edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {obreiroEditando ? 'Editar obreiro' : 'Novo obreiro'}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo *</label>
                <input value={form.nome_completo} onChange={e => setForm(p => ({ ...p, nome_completo: e.target.value }))}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cargo *</label>
                <select value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value as Cargo }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {CARGOS.map(c => (
                    <option key={c} value={c}>{CARGO_PREFIX[c as keyof typeof CARGO_PREFIX]} {CARGO_LABELS[c as keyof typeof CARGO_LABELS]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefone / WhatsApp</label>
                  <input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="(81) 99999-9999"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>

              {/* Bloqueio */}
              <div className="border border-gray-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.bloqueado}
                    onChange={e => setForm(p => ({ ...p, bloqueado: e.target.checked }))}
                    className="rounded" />
                  <span className="text-sm font-medium text-gray-700">Bloquear para escala</span>
                </label>
                {form.bloqueado && (
                  <div className="mt-3 space-y-2">
                    <input value={form.bloqueio_motivo}
                      onChange={e => setForm(p => ({ ...p, bloqueio_motivo: e.target.value }))}
                      placeholder="Motivo do bloqueio..."
                      className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300" />
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Bloqueado até (opcional)</label>
                      <input type="date" value={form.bloqueio_ate}
                        onChange={e => setForm(p => ({ ...p, bloqueio_ate: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !form.nome_completo.trim()}
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
