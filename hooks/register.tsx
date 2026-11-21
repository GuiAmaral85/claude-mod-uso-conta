import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Usage } from '../types'

// Teto padrão do limite de gastos, em US$ (a API só informa a %); configurável.
const DEFAULT_SPEND_CAP_USD = 300
const BAR_CELLS = 20
const MIN_BAR_CELLS = 10
const LABEL_WIDTH = 12
const BLUE = '#2F80ED'
const TRACK = '#C9DFF7'

const usage = atom({ plugin: 'uso-conta', key: 'usage' } as const, null)
const tokens = atom({ plugin: 'uso-conta', key: 'tokens' } as const, 0)

const WEEKDAYS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']
const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']

// Horário de Brasília (UTC-3, sem horário de verão).
function toBrt(iso: string): Date {
  return new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDay(iso: string): string {
  const d = toBrt(iso)
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

function formatTime(iso: string): string {
  const d = toBrt(iso)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

function formatUsd(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

// 12.345 → "12,3 mil"; 1.234.567 → "1,2 mi"
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',')} mil`
  return `${n}`
}

function barColor(percent: number): string {
  if (percent >= 90) return '#D93025'
  if (percent >= 75) return '#E8A33D'
  return BLUE
}

function cells(percent: number, total: number): number {
  const filled = Math.round((Math.min(percent, 100) / 100) * total)
  return percent > 0 ? Math.max(filled, 1) : 0
}

function find(list: SessionRateLimit[], kind: string): SessionRateLimit | undefined {
  return list.find(l => l.kind === kind)
}

// Lê limites e custo da conversa; grava mesmo sem limites, para a faixa
// sair do "aguardando" e mostrar o que houver.
async function refresh($: EngineInterface, requireData: boolean) {
  const u = await $.session.usage()
  const costUsd = u.cost?.usd ?? null
  if (requireData && u.rateLimits.length === 0 && !costUsd) return
  await update($, usage, (): Usage => ({ limits: u.rateLimits, costUsd }))
}

export const register: Register = (on, options) => {
  const spendCapUsd =
    typeof options.spendCapUsd === 'number' && options.spendCapUsd > 0 ? options.spendCapUsd : DEFAULT_SPEND_CAP_USD

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($, true)
    return result
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await refresh($, false)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const u = e.usage
    if (u) {
      const turnTokens = u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      await update($, tokens, n => (n ?? 0) + turnTokens)
    }
    await refresh($, false)
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const current = await read($, usage)
    const tokenCount = await read($, tokens)

    // A barra encolhe em painéis estreitos (ex.: aba Code do app) para cada
    // linha caber inteira, sem quebrar o texto em colunas espremidas.
    const barCells = Math.max(MIN_BAR_CELLS, Math.min(BAR_CELLS, (e.props.bodyColumns ?? 80) - 40))

    const bar = (percent: number) => {
      const filled = cells(percent, barCells)
      return (
        <Text>
          <Text color={barColor(percent)}>{'━'.repeat(filled)}</Text>
          <Text color={TRACK}>{'━'.repeat(barCells - filled)}</Text>
        </Text>
      )
    }

    // Uma linha = um único Text: o conjunto quebra como texto corrido, e as
    // barras de Sessão e Semanal ficam alinhadas pelo rótulo de largura fixa.
    const limitRow = (label: string, limit: SessionRateLimit, reset: string | null) => (
      <Text>
        <Text bold>{label.padEnd(LABEL_WIDTH)}</Text>
        {bar(limit.percentUsed)}
        <Text bold color={barColor(limit.percentUsed)}> {`${Math.round(limit.percentUsed)}%`.padStart(4)}</Text>
        {reset ? <Text dimColor> · reinicia {reset}</Text> : null}
      </Text>
    )

    if (current === null) {
      return (
        <Box>
          <Text dimColor>Consumo: aguardando a primeira resposta do Claude…</Text>
        </Box>
      )
    }

    const list = current.limits
    const spend = find(list, 'spend_limit')
    if (spend) {
      const usd = (spend.percentUsed / 100) * spendCapUsd
      return (
        <Box flexDirection="column">
          <Text>
            <Text bold>{'Gastos'.padEnd(LABEL_WIDTH)}</Text>
            {bar(spend.percentUsed)}
            <Text bold color={barColor(spend.percentUsed)}> {`${Math.round(spend.percentUsed)}%`.padStart(4)}</Text>
          </Text>
          <Text dimColor>
            ~US$ {formatUsd(usd)} de US$ {formatUsd(spendCapUsd)}
            {spend.resetsAt ? ` · reinicia ${formatDay(spend.resetsAt)} (BRT)` : ''}
          </Text>
        </Box>
      )
    }

    const session = find(list, 'five_hour')
    const week = find(list, 'seven_day')
    if (!session && !week) {
      return (
        <Box>
          <Text>
            <Text bold>Esta conversa </Text>
            <Text>US$ {formatUsd(current.costUsd ?? 0)}</Text>
            <Text dimColor> · {formatTokens(tokenCount)} tokens</Text>
          </Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {session ? limitRow('Sessão (5h)', session, session.resetsAt ? formatTime(session.resetsAt) : null) : null}
        {week ? limitRow('Semanal', week, week.resetsAt ? formatDay(week.resetsAt) : null) : null}
        <Text dimColor>{formatTokens(tokenCount)} tokens nesta conversa</Text>
      </Box>
    )
  })
}
