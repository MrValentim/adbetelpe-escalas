import { createClient } from '@/lib/supabase/server'
import { CARGO_LABELS, CARGO_PREFIX } from '@/types'
import ObreirosClient from './client'

export default async function ObreirosPage() {
  const supabase = await createClient()

  const { data: obreiros } = await supabase
    .from('obreiros')
    .select('*')
    .order('cargo')
    .order('nome_completo')

  return <ObreirosClient obreiros={obreiros ?? []} />
}
