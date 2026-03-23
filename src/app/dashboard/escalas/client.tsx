'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CARGO_PREFIX, CARGOS_SANTA_CEIA, type Obreiro, type Culto, type EscalaPeriodo, type Congregacao, type TipoCulto } from '@/types'
import { Plus, X, Check, AlertCircle, Calendar, ChevronDown, Trash2, UserPlus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃƒÂ¡b']

interface Props {
  periodos: EscalaPeriodo[]
  periodoAtualId: string | null
  cultos: any[]
  congregacoes: Congregacao[]
  obreiros: Obreiro[]
  tiposCulto: TipoCulto[]
}

export default function EscalasClient({ periodos, periodoAtualId, cultos: inicial, congregacoes, obreiros, tiposCulto }: Props) {
  const [periodoId, setPeriodoId] = useState(periodoAtualId)
  const [cultos, setCultos] = useState(inicial)
  const [modalCulto, setModalCulto] = useState(false)
  const [modalEscalar, setModalEscalar] = useState<any>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtroCong, setFiltroConk] = useState('')

  const [formCulto, setFormCulto] = useState({
    congregacao_id: congregacoes[0]?.id ?? '',
    tipo_culto_id: tiposCulto[0]?.id ?? '',
    data: '', hora: '19:30', observacoes: '',
  })
  const [obreiro1, setObreiro1] = useState('')
  const [obreiro2, setObreiro2] = useState('')

  const supabase = createClient()
  const periodoAtual = periodos.find(p => p.id === periodoId)

  // Filtra obreiros por tipo de culto selecionado (regra Santa Ceia)
  const tipoSelecionado = tiposCulto.find(t => t.id === formCulto.tipo_culto_id)
  const obreirosDisponiveis = useMemo(() => {
    if (!tipoSelecionado?.restrito_cargo) return obreiros
    return obreiros.filter(o => tipoSelecionado.cargos_permitidos.includes(o.cargo))
  }, [tipoSelecionado, obreiros])

  // Filtra obreiros para escalar (culto especÃƒÂ­fico)
  const obreirosParaEscalar = useMemo(() => {
    if (!modalEscalar) return obreiros
    const tc = modalEscalar.tipo_culto
    if (!tc?.restrito_cargo) return obreiros
    return obreiros.filter(o => tc.cargos_permitidos.includes(o.cargo))
  }, [modalEscalar, obreiros])

  // Agrupa cultos por data
  const cultosPorData = useMemo(() => {
    const grupos: Record<string, any[]> = {}
    const filtrados = filtroCong
      ? cultos.filter((c: any) => c.congregacao_id === filtroCong)
      : cultos
    filtrados.forEach((c: any) => {
      if (!grupos[c.data]) grupos[c.data] = []
      grupos[c.data].push(c)
    })
    return grupos
  }, [cultos, filtroCong])

  async function criarCulto() {
    if (!periodoId || !formCulto.data) return
    setSalvando(true)
    setErro('')

    const { data, error } = await supabase.from('cultos')
      .insert({ ...formCulto, periodo_id: periodoId, hora: formCulto.hora || null, observacoes: formCulto.observacoes || null })
      .select('*, congregacao:congregacoes(id,nome), tipo_culto:tipos_culto(id,codigo,nome,restrito_cargo,cargos_permitidos), escalados:culto_obreiros(*)')
      .single()

    if (error) { setErro(error.message); setSalvando(false); return }
    if (data) setCultos(prev => [...prev, { ...data, escalados: [] }].sort((a, b) => a.data.localeCompare(b.data)))

    setSalvando(false)
    setModalCulto(false)
    setFormCulto(p => ({ ...p, data: '', observacoes: '' }))
  }

  async function escalarObreiro(cultoId: string, obreiroId: string, funcao: string) {
    if (!obreiroId) return
    const { error } = await supabase.from('culto_obreiros')
      .insert({ culto_id: cultoId, obreiro_id: obreiroId, funcao })

    if (error) {
      // Mostra a mensagem amigÃƒÂ¡vel do banco (conflito de data ou cargo)
      const msg = error.message.includes('Conflito') ? error.message
        : error.message.includes('exige cargo') ? error.message
        : 'Erro ao escalar obreiro.'
      setErro(msg)
      return
    }

    // Recarrega o culto atualizado
    const { data: cultoAtualizado } = await supabase.from('cultos')
      .select('*, congregacao:congregacoes(id,nome), tipo_culto:tipos_culto(id,codigo,nome,restrito_cargo,cargos_permitidos), escalados:culto_obreiros(*, obreiro:obreiros(*))')
      .eq('id', cultoId).single()

    if (cultoAtualizado) setCultos(prev => prev.map(c => c.id === cultoId ? cultoAtualizado : c))
    setModalEscalar(cultoAtualizado)
  }

  async function removerEscalado(cultoObrId: string, cultoId: string) {
    await supabase.from('culto_obreiros').delete().eq('id', cultoObrId)
    const { data } = await supabase.from('cultos')
      .select('*, congregacao:congregacoes(id,nome), tipo_culto:tipos_culto(id,codigo,nome,restrito_cargo,cargos_permitidos), escalados:culto_obreiros(*, obreiro:obreiros(*))')
      .eq('id', cultoId).single()
    if (data) { setCultos(prev => prev.map(c => c.id === cultoId ? data : c)); setModalEscalar(data) }
  }

  async function deletarCulto(cultoId: string) {
    if (!confirm('Remover este culto da escala?')) return
    await supabase.from('cultos').delete().eq('id', cultoId)
    setCultos(prev => prev.filter(c => c.id !== cultoId))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Escalas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{cultos.length} culto{cultos.length !== 1 ? 's' : ''} no perÃƒÂ­odo</p>
        </div>
        <button onClick={() => setModalCulto(true)} disabled={!periodoId}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Adicionar culto
        </button>
      </div>

      {/* Seletor de perÃƒÂ­odo + filtro congregaÃƒÂ§ÃƒÂ£o */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <select value={periodoId ?? ''} onChange={e => setPeriodoId(e.target.value)}
            className="w-full appearance-none px-4 py-2.5 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 font-medium">
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative sm:w-52">
          <select value={filtroCong} onChange={e => setFiltroConk(e.target.value)}
            className="w-full appearance-none px-4 py-2.5 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
            <option value="">Todas as congregaÃƒÂ§ÃƒÂµes</option>
            {congregacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Erro global */}
      {erro && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{erro}</span>
          <button onClick={() => setErro('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Cultos agrupados por data */}
      {Object.keys(cultosPorData).length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Nenhum culto neste perÃƒÂ­odo</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Adicionar culto" para comeÃƒÂ§ar a escala</p>
        </div>
      ) : (
        Object.entries(cultosPorData).sort().map(([data, cultosData]) => (
          <div key={data} className="mb-6">
            {/* CabeÃƒÂ§alho da data */}
            <div className="flex items-center gap-3 mb-3">
              <div className="text-center bg-brand-600 text-white rounded-xl px-3 py-1.5 min-w-[60px]">
                <p className="text-xs font-medium opacity-80">{DIAS[new Date(data + 'T12:00:00').getDay()]}</p>
                <p className="text-lg font-bold leading-tight">{format(parseISO(data), 'dd')}</p>
                <p className="text-xs opacity-80">{format(parseISO(data), 'MMM', { locale: ptBR })}</p>
              </div>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Cultos do dia */}
            <div className="space-y-2 ml-0 sm:ml-[72px]">
              {(cultosData as any[]).map(c => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-medium bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                          {c.congregacao?.nome}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {c.tipo_culto?.nome}
                        </span>
                        {c.hora && <span className="text-xs text-gray-400">{c.hora}</span>}
                        {c.tipo_culto?.restrito_cargo && (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            Ã°Å¸Å½â€“ Apenas Pr./Ev./Pb.
                          </span>
                        )}
                      </div>

                      {/* Escalados */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {c.escalados?.length === 0 && (
                          <span className="text-xs text-gray-400 italic">Nenhum obreiro escalado</span>
                        )}
                        {c.escalados?.map((e: any) => (
                          <span key={e.id} className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full">
                            {CARGO_PREFIX[e.obreiro?.cargo]} {e.obreiro?.nome_completo}
                            {e.funcao === '2_pregador' && <span className="text-teal-500">(2Ã‚Â°)</span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setErro(''); setObreiro1(''); setObreiro2(''); setModalEscalar(c) }}
                        title="Escalar obreiros"
                        className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
                        <UserPlus size={15} />
                      </button>
                      <button onClick={() => deletarCulto(c.id)} title="Remover culto"
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal: adicionar culto */}
      {modalCulto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold">Adicionar culto</h2>
              <button onClick={() => setModalCulto(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
                  <input type="date" value={formCulto.data}
                    onChange={e => setFormCulto(p => ({ ...p, data: e.target.value }))}
                    min={periodoAtual?.data_inicio} max={periodoAtual?.data_fim}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">HorÃƒÂ¡rio</label>
                  <input type="time" value={formCulto.hora}
                    onChange={e => setFormCulto(p => ({ ...p, hora: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CongregaÃƒÂ§ÃƒÂ£o *</label>
                <select value={formCulto.congregacao_id}
                  onChange={e => setFormCulto(p => ({ ...p, congregacao_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {congregacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de culto *</label>
                <select value={formCulto.tipo_culto_id}
                  onChange={e => setFormCulto(p => ({ ...p, tipo_culto_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {tiposCulto.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                {tipoSelecionado?.restrito_cargo && (
                  <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} /> Santa Ceia: apenas Pastores, Evangelistas e PresbÃƒÂ­teros
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ObservaÃƒÂ§ÃƒÂµes</label>
                <input value={formCulto.observacoes}
                  onChange={e => setFormCulto(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Opcional..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setModalCulto(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={criarCulto} disabled={salvando || !formCulto.data}
                className="flex-1 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                {salvando ? 'Salvando...' : <><Check size={14} /> Criar culto</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: escalar obreiros */}
      {modalEscalar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold">Escalar obreiros</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modalEscalar.congregacao?.nome} Ã‚Â· {format(parseISO(modalEscalar.data), "dd/MM/yyyy")} Ã‚Â· {modalEscalar.tipo_culto?.nome}
                </p>
              </div>
              <button onClick={() => { setModalEscalar(null); setErro('') }}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-5">
              {/* Erro */}
              {erro && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{erro}</span>
                </div>
              )}

              {/* Escalados atuais */}
              {modalEscalar.escalados?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Escalados</p>
                  <div className="space-y-1.5">
                    {modalEscalar.escalados.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                        <span className="text-sm text-teal-800">
                          {CARGO_PREFIX[e.obreiro?.cargo]} {e.obreiro?.nome_completo}
                          <span className="text-xs text-teal-500 ml-1">
                            {e.funcao === '1_pregador' ? 'Ã‚Â· 1Ã‚Â° pregador' : e.funcao === '2_pregador' ? 'Ã‚Â· 2Ã‚Â° pregador' : 'Ã‚Â· suporte'}
                          </span>
                        </span>
                        <button onClick={() => removerEscalado(e.id, modalEscalar.id)}
                          className="text-teal-400 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adicionar obreiro */}
              {modalEscalar.tipo_culto?.restrito_cargo && (
                <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Santa Ceia: apenas Pastores, Evangelistas e PresbÃƒÂ­teros
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">1Ã‚Â° Pregador</label>
                  <div className="flex gap-2">
                    <select value={obreiro1} onChange={e => setObreiro1(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                      <option value="">Selecionar obreiro...</option>
                      {obreirosParaEscalar.map(o => (
                        <option key={o.id} value={o.id}>
                          {CARGO_PREFIX[o.cargo]} {o.nome_completo}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => { escalarObreiro(modalEscalar.id, obreiro1, '1_pregador'); setObreiro1('') }}
                      disabled={!obreiro1}
                      className="px-3 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-40 hover:bg-brand-800 transition-colors">
                      <Check size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">2Ã‚Â° Pregador (opcional)</label>
                  <div className="flex gap-2">
                    <select value={obreiro2} onChange={e => setObreiro2(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                      <option value="">Selecionar obreiro...</option>
                      {obreirosParaEscalar.map(o => (
                        <option key={o.id} value={o.id}>
                          {CARGO_PREFIX[o.cargo]} {o.nome_completo}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => { escalarObreiro(modalEscalar.id, obreiro2, '2_pregador'); setObreiro2('') }}
                      disabled={!obreiro2}
                      className="px-3 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-40 hover:bg-brand-800 transition-colors">
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0">
              <button onClick={() => { setModalEscalar(null); setErro('') }}
                className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
