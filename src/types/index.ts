// ────────────────────────────────────────────────────
// Tipos globais do sistema ADBETELPE
// ────────────────────────────────────────────────────

export type Cargo = 'Pr' | 'Ev' | 'Pb' | 'Dc' | 'Ax' | 'Ir'

export const CARGO_LABELS: Record<Cargo, string> = {
  Pr: 'Pastor',
  Ev: 'Evangelista',
  Pb: 'Presbítero',
  Dc: 'Diácono',
  Ax: 'Auxiliar',
  Ir: 'Irmã',
}

export const CARGO_PREFIX: Record<Cargo, string> = {
  Pr: 'Pr.',
  Ev: 'Ev.',
  Pb: 'Pb.',
  Dc: 'Dc.',
  Ax: 'Ax.',
  Ir: 'Ir.',
}

// Cargos que podem ministrar Santa Ceia
export const CARGOS_SANTA_CEIA: Cargo[] = ['Pr', 'Ev', 'Pb']

export type Role = 'super_admin' | 'gestor_regional' | 'lider_local' | 'obreiro'

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  gestor_regional: 'Gestor Regional',
  lider_local: 'Líder Local',
  obreiro: 'Obreiro',
}

export type PeriodoStatus = 'rascunho' | 'publicado' | 'fechado'
export type CultoStatus = 'agendado' | 'realizado' | 'cancelado'
export type PresencaStatus = 'confirmado' | 'ausente' | 'substituido' | 'pendente'
export type DisponibilidadeTipo = 'dia_semana' | 'data_especifica' | 'periodo'

// ─── ENTIDADES ─────────────────────────────────────

export interface Obreiro {
  id: string
  nome_completo: string
  cargo: Cargo
  telefone: string | null
  email: string | null
  foto_url: string | null
  ativo: boolean
  bloqueado: boolean
  bloqueio_motivo: string | null
  bloqueio_ate: string | null // ISO date
  criado_em: string
  atualizado_em: string
}

export interface Congregacao {
  id: string
  nome: string
  endereco: string
  cep: string | null
  bairro: string | null
  cidade: string
  estado: string
  lat: number | null
  lng: number | null
  lider_id: string | null
  lider?: Obreiro
  telefone: string | null
  horarios: HorarioCulto[]
  ativo: boolean
  criado_em: string
}

export interface HorarioCulto {
  dia_semana: number // 0=Dom, 1=Seg, ..., 6=Sáb
  hora: string // "19:30"
}

export interface TipoCulto {
  id: string
  codigo: number
  nome: string
  restrito_cargo: boolean
  cargos_permitidos: Cargo[]
}

export interface EscalaPeriodo {
  id: string
  nome: string
  data_inicio: string // ISO date
  data_fim: string // ISO date
  status: PeriodoStatus
  observacoes: string | null
  criado_por: string
  criado_em: string
}

export interface Culto {
  id: string
  periodo_id: string
  periodo?: EscalaPeriodo
  congregacao_id: string
  congregacao?: Congregacao
  tipo_culto_id: string
  tipo_culto?: TipoCulto
  data: string // ISO date "2025-04-07"
  dia_semana: number
  hora: string | null
  status: CultoStatus
  observacoes: string | null
  escalados?: CultoObreiro[]
}

export interface CultoObreiro {
  id: string
  culto_id: string
  culto?: Culto
  obreiro_id: string
  obreiro?: Obreiro
  funcao: '1_pregador' | '2_pregador' | 'suporte'
  presenca: PresencaStatus
  justificativa_falta: string | null
  substituto_id: string | null
  substituto?: Obreiro
  registrado_em: string | null
  registrado_por: string | null
}

export interface Disponibilidade {
  id: string
  obreiro_id: string
  obreiro?: Obreiro
  periodo_id: string
  tipo: DisponibilidadeTipo
  disponivel: boolean
  dias_semana: number[] | null   // [1,3,5] = seg, qua, sex
  data_inicio_restricao: string | null
  data_fim_restricao: string | null
  motivo: string | null
  coletado_em: string
}

export interface NotaPrivada {
  id: string
  autor_id: string
  autor?: Obreiro
  obreiro_id: string | null
  culto_id: string | null
  conteudo: string
  visivel_para: Role[]
  criado_em: string
}

export interface Aviso {
  id: string
  titulo: string
  conteudo: string
  publico: boolean
  visivel_para_roles: Role[]
  congregacao_id: string | null
  criado_por: string
  expira_em: string | null
  criado_em: string
}

export interface Usuario {
  id: string
  obreiro_id: string | null
  obreiro?: Obreiro
  role: Role
  congregacao_id: string | null
  congregacao?: Congregacao
  ativo: boolean
}

// ─── RANKING ───────────────────────────────────────

export interface RankingObreiro {
  obreiro_id: string
  obreiro: Obreiro
  total_escalas: number
  total_presencas: number
  total_faltas: number
  percentual_assiduidade: number
}

// ─── FORMULÁRIOS ───────────────────────────────────

export interface ObreiroFormData {
  nome_completo: string
  cargo: Cargo
  telefone: string
  email: string
  ativo: boolean
  bloqueado: boolean
  bloqueio_motivo: string
  bloqueio_ate: string
}

export interface CultoFormData {
  congregacao_id: string
  tipo_culto_id: string
  data: string
  hora: string
  observacoes: string
}

export interface PresencaFormData {
  presenca: PresencaStatus
  justificativa_falta: string
  substituto_id: string
}
