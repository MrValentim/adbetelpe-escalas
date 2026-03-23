import { createClient } from '@/lib/supabase/server'
import EscalasClient from './client'

export default async function EscalasPage({ searchParams }: { searchParams: { periodo?: string } }) {
  const supabase = await createClient()

  const [
    { data: periodos },
    { data: congregacoes },
    { data: obreiros },
    { data: tiposCulto },
  ] = await Promise.all([
    supabase.from('escala_periodos').select('*').order('data_inicio', { ascending: false }),
    supabase.from('congregacoes').select('*').eq('ativo', true).order('nome'),
    supabase.from('obreiros').select('*').eq('ativo', true).eq('bloqueado', false).order('cargo').order('nome_completo'),
    supabase.from('tipos_culto').select('*').eq('ativo', true).order('codigo'),
  ])

  const periodoId = searchParams.periodo ?? periodos?.[0]?.id

  const { data: cultos } = periodoId
    ? await supabase.from('cultos')
        .select('*, congregacao:congregacoes(id,nome), tipo_culto:tipos_culto(id,codigo,nome,restrito_cargo,cargos_permitidos), escalados:culto_obreiros(*, obreiro:obreiros(*))')
        .eq('periodo_id', periodoId)
        .order('data').order('congregacao_id')
    : { data: [] }

  return (
    <EscalasClient
      periodos={periodos ?? []}
      periodoAtualId={periodoId ?? null}
      cultos={cultos ?? []}
      congregacoes={congregacoes ?? []}
      obreiros={obreiros ?? []}
      tiposCulto={tiposCulto ?? []}
    />
  )
}
