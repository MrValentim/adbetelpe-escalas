import { createClient } from '@/lib/supabase/server'
import CongregacoesClient from './client'

export default async function CongregacoesPage() {
  const supabase = await createClient()
  const { data: congregacoes } = await supabase
    .from('congregacoes')
    .select('*, lider:obreiros(id,nome_completo,cargo,telefone)')
    .order('nome')
  return <CongregacoesClient congregacoes={congregacoes ?? []} />
}
