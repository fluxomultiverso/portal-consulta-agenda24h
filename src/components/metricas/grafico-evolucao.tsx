import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { DadosGrafico } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface GraficoEvolucaoProps {
  dados: DadosGrafico[]
}

export function GraficoEvolucao({ dados }: GraficoEvolucaoProps) {
  const dadosFormatados = dados.map((d) => ({
    ...d,
    dataLabel: format(parseISO(d.data), 'dd/MM', { locale: ptBR }),
  }))

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Evolução diária
      </h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dadosFormatados} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="corAgendamentos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="corConcluidos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dataLabel"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            <Area
              type="monotone"
              dataKey="agendamentos"
              name="Agendamentos"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#corAgendamentos)"
            />
            <Area
              type="monotone"
              dataKey="concluidos"
              name="Concluídos"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#corConcluidos)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
