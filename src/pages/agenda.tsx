import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { api } from '@/services/api'
import type { Atendimento, Profissional } from '@/types'
import { AtendimentoCard } from '@/components/agenda/atendimento-card'
import { SeletorData } from '@/components/agenda/seletor-data'
import { FiltroProfissional } from '@/components/agenda/filtro-profissional'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state'

export function AgendaPage() {
  const [data, setData] = useState(new Date())
  const [profissionalId, setProfissionalId] = useState<string | null>(null)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const dataStr = format(data, 'yyyy-MM-dd')
      const [atts, profs] = await Promise.all([
        api.getAtendimentos(dataStr, profissionalId ?? undefined),
        api.getProfissionais(),
      ])
      setAtendimentos(atts)
      setProfissionais(profs)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar a agenda.')
    } finally {
      setLoading(false)
    }
  }, [data, profissionalId])

  useEffect(() => {
    // O carregamento assíncrono é reiniciado quando a data ou o filtro mudam.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  const handleAtualizar = (atualizado: Atendimento) => {
    setAtendimentos((prev) =>
      prev.map((a) => (a.id === atualizado.id ? atualizado : a))
    )
  }

  const totalAtendimentos = atendimentos.length
  const concluidos = atendimentos.filter(
    (a) => a.situacao === 'atendimento_concluido'
  ).length

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Agenda</h2>
        <p className="text-sm text-muted-foreground">
          {totalAtendimentos > 0
            ? `${totalAtendimentos} atendimento${totalAtendimentos > 1 ? 's' : ''} · ${concluidos} concluído${concluidos !== 1 ? 's' : ''}`
            : 'Nenhum atendimento'}
        </p>
      </div>

      <SeletorData data={data} onChange={setData} />

      <FiltroProfissional
        profissionais={profissionais}
        selecionado={profissionalId}
        onChange={setProfissionalId}
      />

      {loading ? (
        <LoadingState message="Carregando atendimentos..." />
      ) : erro ? (
        <ErrorState title="Não foi possível carregar a agenda" description={erro} action={{ label: 'Tentar novamente', onClick: carregar }} />
      ) : atendimentos.length === 0 ? (
        <EmptyState
          title="Nenhum atendimento neste dia"
          description="Não há atendimentos agendados para a data selecionada."
        />
      ) : (
        <div className="space-y-3">
          {atendimentos.map((att) => (
            <AtendimentoCard
              key={att.id}
              atendimento={att}
              onAtualizar={handleAtualizar}
            />
          ))}
        </div>
      )}
    </div>
  )
}
