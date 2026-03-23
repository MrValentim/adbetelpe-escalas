import { createClient } from '@/lib/supabase/server'
import { Settings } from 'lucide-react'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios').select('*, obreiro:obreiros(*)').eq('id', user?.id ?? '').single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-0.5">Configurações da sua conta</p>
      </div>
      <div className="max-w-lg space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Sua conta</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">E-mail</span>
              <span className="text-gray-800 font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Perfil</span>
              <span className="text-gray-800 font-medium capitalize">{usuario?.role?.replace('_', ' ')}</span>
            </div>
            {usuario?.obreiro && (
              <div className="flex justify-between">
                <span className="text-gray-500">Nome</span>
                <span className="text-gray-800 font-medium">{usuario.obreiro.nome_completo}</span>
              </div>
            )}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <div className="flex items-start gap-2">
            <Settings size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Gerenciamento de usuários</p>
              <p>Para criar logins para outros obreiros, acesse o painel do Supabase → Authentication → Users e adicione o e-mail. Depois vincule o usuário ao obreiro na tabela <code className="bg-amber-100 px-1 rounded">usuarios</code>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
