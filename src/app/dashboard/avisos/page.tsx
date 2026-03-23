import { createClient } from '@/lib/supabase/server'
import AvisosClient from './client'

export default async function AvisosPage() {
  const supabase = await createClient()
  const { data: avisos } = await supabase
    .from('avisos').select('*, autor:usuarios(obreiro:obreiros(nome_completo,cargo))')
    .or(`expira_em.is.null,expira_em.gte.${new Date().toISOString().split('T')[0]}`)
    .order('criado_em', { ascending: false })
  return <AvisosClient avisos={avisos ?? []} />
}
