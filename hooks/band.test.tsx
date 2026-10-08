import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'uso-conta',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as any

const SURFACES = ['terminal', 'desktop'] as const

test('mostra aguardando antes da primeira resposta', async $ => {
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /aguardando/ })).toBeDefined()
    await ui.unmount()
  }
})

test('enterprise: barra em US$ a partir do spend_limit', async ($, on) => {
  on('session.usage', () => ({ value: {
    startedAt: 0,
    context: {} as any,
    rateLimits: [{ kind: 'spend_limit', percentUsed: 11, resetsAt: '2026-11-01T00:00:00Z' }],
    cost: { usd: 0.5 },
  } }) as any)
  on('session.measure', (_$, e) => ({ changed: e.changed }) as any)
  await $.session.measure({ rateLimits: [], changed: ['rateLimits'] } as any)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /US\$ 33,00 de US\$ 300,00/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /sáb\., 31 de out\., 21:00/ })).toBeDefined()
    await ui.unmount()
  }
})

test('pessoal: limite da sessão de 5h', async ($, on) => {
  on('session.usage', () => ({ value: {
    startedAt: 0,
    context: {} as any,
    rateLimits: [
      { kind: 'five_hour', percentUsed: 42, resetsAt: '2026-10-08T18:30:00Z' },
      { kind: 'seven_day', percentUsed: 7 },
    ],
    cost: { usd: 1 },
  } }) as any)
  on('session.measure', (_$, e) => ({ changed: e.changed }) as any)
  await $.session.measure({ rateLimits: [], changed: ['rateLimits'] } as any)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /Sessão \(5h\)/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /reinicia 15:30/ })).toBeDefined()
    await ui.unmount()
  }
})

test('sem limites: mostra custo da conversa', async ($, on) => {
  on('session.usage', () => ({ value: { startedAt: 0, context: {} as any, rateLimits: [], cost: { usd: 0.42 } } }) as any)
  on('turn.complete', () => ({ text: '' }) as any)
  await $.turn.complete({ answer: '',
    usage: { model: 'x', input_tokens: 300, output_tokens: 200, cache_read_input_tokens: 12000, cache_creation_input_tokens: 0 },
  } as any)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /US\$ 0,42/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /12,5 mil tokens/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /não informa/ })).toBeUndefined()
    await ui.unmount()
  }
})
