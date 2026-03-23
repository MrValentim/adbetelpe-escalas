import { createClient } from '@/lib/supabase/server'
import PresencasClient from './client'

export default async function PresencasPage() {
  const supabase = await createClient()

  const { data: periodos } = await supabase
    .from('escala_periodos').select('*')
    .in('status', ['publicado', 'fechado'])
    .order('data_inicio', { ascending: false })

  const periodoId = periodos?.[0]?.id

  const { data: cultos } = periodoId
    ? await supabase.from('cultos')
        .select('*, congregacao:congregacoes(id,nome), tipo_culto:tipos_culto(id,nome), escalados:culto_obreiros(*, obreiro:obreiros(id,nome_completo,cargo))')
        .eq('periodo_id', periodoId)
        .lte('data', new Date().toISOString().split('T')[0])
        .order('data', { ascending: false })
    : { data: [] }

  return <PresencasClient periodos={periodos ?? []} cultos={cultos ?? []} periodoAtualId={periodoId ?? null} />
}
