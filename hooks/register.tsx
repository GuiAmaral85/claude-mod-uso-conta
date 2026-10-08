import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Usage } from '../types'

// Teto padrão do limite de gastos, em US$ (a API só informa a %); configurável.
const DEFAULT_SPEND_CAP_USD = 300
const BAR_CELLS = 24
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

function cells(percent: number): number {
  const filled = Math.round((Math.min(percent, 100) / 100) * BAR_CELLS)
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

    const bar = (percent: number) => {
      const filled = cells(percent)
      return (
        <Text>
          <Text color={barColor(percent)}>{'█'.repeat(filled)}</Text>
          <Text color={TRACK}>{'█'.repeat(BAR_CELLS - filled)}</Text>
        </Text>
      )
    }

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
          <Box>
            <Text bold>Enterprise </Text>
            <Text>~US$ {formatUsd(usd)} de US$ {formatUsd(spendCapUsd)} </Text>
            {bar(spend.percentUsed)}
            <Text> {Math.round(spend.percentUsed)}% usado</Text>
          </Box>
          {spend.resetsAt ? (
            <Text dimColor>Limite de gastos · Reinicia {formatDay(spend.resetsAt)} BRT</Text>
          ) : null}
        </Box>
      )
    }

    const session = find(list, 'five_hour')
    const week = find(list, 'seven_day')
    if (!session && !week) {
      return (
        <Box>
          <Text bold>Esta conversa </Text>
          <Text>US$ {formatUsd(current.costUsd ?? 0)}</Text>
          <Text dimColor> · {formatTokens(tokenCount)} tokens</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {session ? (
          <Box>
            <Text bold>Sessão (5h) </Text>
            {bar(session.percentUsed)}
            <Text> {Math.round(session.percentUsed)}% usado</Text>
            {session.resetsAt ? <Text dimColor> · reinicia {formatTime(session.resetsAt)}</Text> : null}
          </Box>
        ) : null}
        {week ? (
          <Text dimColor>
            Semanal: {Math.round(week.percentUsed)}% usado
            {week.resetsAt ? ` · reinicia ${formatDay(week.resetsAt)}` : ''}
          </Text>
        ) : null}
      </Box>
    )
  })
}
