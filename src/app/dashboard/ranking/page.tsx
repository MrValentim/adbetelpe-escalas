import { createClient } from '@/lib/supabase/server'
import { CARGO_LABELS, CARGO_PREFIX } from '@/types'

export default async function RankingPage() {
  const supabase = await createClient()

  const { data: periodos } = await supabase
    .from('escala_periodos').select('*')
    .in('status', ['publicado', 'fechado'])
    .order('data_inicio', { ascending: false })

  const periodoId = periodos?.[0]?.id

  const { data: ranking } = periodoId
    ? await supabase.from('vw_ranking_obreiros')
        .select('*')
        .eq('periodo_id', periodoId)
        .order('total_escalas', { ascending: false })
    : { data: [] }

  const maisEscalados = [...(ranking ?? [])].sort((a, b) => b.total_escalas - a.total_escalas).slice(0, 10)
  const menosEscalados = [...(ranking ?? [])].filter(r => r.total_escalas > 0).sort((a, b) => a.total_escalas - b.total_escalas).slice(0, 10)
  const maisAssiduos = [...(ranking ?? [])].filter(r => r.total_escalas > 0).sort((a, b) => b.percentual_assiduidade - a.percentual_assiduidade).slice(0, 10)
  const maisFaltosos = [...(ranking ?? [])].filter(r => r.total_faltas > 0).sort((a, b) => b.total_faltas - a.total_faltas).slice(0, 10)

  const periodo = periodos?.find(p => p.id === periodoId)

  function RankingCard({ titulo, cor, lista, campo, sufixo }: any) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className={`px-5 py-3 ${cor} border-b`}>
          <h3 className="text-sm font-semibold">{titulo}</h3>
        </div>
        {lista.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400 italic">Nenhum dado ainda</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {lista.map((r: any, i: number) => (
              <div key={r.obreiro_id} className="flex items-center gap-3 px-5 py-2.5">
                <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-brand-600' : 'text-gray-300'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {CARGO_PREFIX[r.cargo as keyof typeof CARGO_PREFIX]} {r.nome_completo}
                  </p>
                  <p className="text-xs text-gray-400">{CARGO_LABELS[r.cargo as keyof typeof CARGO_LABELS]}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {r[campo]}{sufixo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Ranking</h1>
        {periodo && (
          <p className="text-gray-500 text-sm mt-0.5">
            Período: <span className="font-medium text-gray-700">{periodo.nome}</span>
          </p>
        )}
      </div>

      {!periodoId ? (
        <div className="text-center py-16 text-gray-400">
          <p>Nenhum período publicado para exibir ranking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <RankingCard titulo="🏆 Mais escalados" cor="bg-purple-50 text-purple-800 border-purple-100"
            lista={maisEscalados} campo="total_escalas" sufixo=" escalas" />
          <RankingCard titulo="📉 Menos escalados" cor="bg-gray-50 text-gray-700 border-gray-100"
            lista={menosEscalados} campo="total_escalas" sufixo=" escalas" />
          <RankingCard titulo="✅ Mais assíduos" cor="bg-green-50 text-green-800 border-green-100"
            lista={maisAssiduos} campo="percentual_assiduidade" sufixo="%" />
          <RankingCard titulo="❌ Mais faltosos" cor="bg-red-50 text-red-800 border-red-100"
            lista={maisFaltosos} campo="total_faltas" sufixo=" faltas" />
        </div>
      )}
    </div>
  )
}
