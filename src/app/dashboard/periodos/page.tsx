import { createClient } from '@/lib/supabase/server'
import PeriodosClient from './client'

export default async function PeriodosPage() {
  const supabase = await createClient()
  const { data: periodos } = await supabase
    .from('escala_periodos')
    .select('*')
    .order('data_inicio', { ascending: false })

  return <PeriodosClient periodos={periodos ?? []} />
}
