# uso-conta

Mod do Claude Code que mostra, numa faixa logo acima do campo de texto, quanto você está consumindo.

- **Sempre:** o custo da conversa atual em US$ e quantos tokens ela já usou.
  Ex.: `Esta conversa US$ 0,42 · 12,5 mil tokens`
- **Quando a conta informa o limite ao Claude Code:**
  - Conta pessoal (Pro/Max): a barrinha do limite da sessão de 5h, com a hora em que reinicia, e o uso semanal.
  - Conta com limite de gastos: a barrinha em US$ (ex.: `~US$ 33,00 de US$ 300,00 · 11% usado`) e a data em que reinicia.

> Contas Enterprise que não informam o limite ao Claude Code mostram só o custo da conversa.
> O total do mês continua disponível em claude.ai → Configurações → Uso.

## Como instalar

Funciona no Claude Code pelo **Terminal** (depois de instalado, aparece também na aba Code do app Claude).

1. Abra o Terminal e rode `claude`.
2. Digite:

```
/plugin install uso-conta --marketplace GuiAmaral85/claude-mod-uso-conta
```

3. Responda `y` para adicionar a loja e aperte Enter para instalar no escopo de usuário.
4. Se aparecer a tela de configuração, informe o teto de gastos da sua conta em US$ (padrão: 300).

A faixa aparece nas próximas conversas, depois da primeira resposta do Claude.

## Como mudar o teto de gastos

No Claude Code, rode `/config` e procure **Teto de gastos (US$)**.

## Como remover

```
/plugin uninstall uso-conta
```

## Observações

- Os tokens somam tudo o que o Claude processou em cada resposta, inclusive o texto relido do cache. Por isso crescem mais rápido que o valor em US$.
- O valor em US$ é o mesmo que o comando `/cost` mostra.
- Horários exibidos no fuso de Brasília (BRT).
