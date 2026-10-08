export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

export type Usage = {
  limits: RateLimit[]
  costUsd: number | null
} | null

declare module 'claude-code' {
  interface PluginState {
    'uso-conta': { usage: Usage; tokens: number }
  }
}
