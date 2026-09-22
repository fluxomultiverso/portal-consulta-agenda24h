import type { EmpresaGestao } from '@/types/gestao'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export async function consultarEmpresaGestao(
  empresaId: string
): Promise<{ sucesso: boolean; dados?: EmpresaGestao; erro?: string }> {
  if (!isSupabaseConfigured()) {
    return { sucesso: false, erro: 'A conexão com o Supabase não está configurada.' }
  }

  try {
    const { data, error } = await supabase.rpc('consultar_gestao_portal')
    if (error) return { sucesso: false, erro: error.message }
    if (!data || typeof data !== 'object') {
      return { sucesso: false, erro: 'A empresa vinculada não foi encontrada.' }
    }

    const recebida = data as unknown as EmpresaGestao
    const capacidadePadrao = recebida.plano?.codigo === 'empresa' ? 2 : recebida.plano?.codigo === 'equipe' ? 1 : 0
    const empresa: EmpresaGestao = {
      ...recebida,
      profissionais: recebida.profissionais ?? [],
      recepcionistas: recebida.recepcionistas ?? [],
      servicos: recebida.servicos ?? [],
      plano: {
        ...recebida.plano,
        capacidadeRecepcionistas: recebida.plano?.capacidadeRecepcionistas ?? capacidadePadrao,
      },
    }
    if (empresa.id !== empresaId) {
      return { sucesso: false, erro: 'O vínculo autenticado não permite acessar esta empresa.' }
    }
    return { sucesso: true, dados: empresa }
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Não foi possível consultar a gestão.',
    }
  }
}
