# uso-conta

Mod do Claude Code que mostra, numa faixa logo acima do campo de texto, quanto você está consumindo.

- **Sempre:** o custo da conversa atual em US$ e quantos tokens ela já usou.
  Ex.: `Esta conversa US$ 0,42 · 12,5 mil tokens`
- **Quando a conta informa o limite ao Claude Code:**
  - Conta pessoal (Pro/Max): uma barra para a sessão de 5h e outra para o uso semanal, alinhadas, cada uma com a hora em que reinicia; abaixo, os tokens da conversa.
    ```
    Sessão (5h) ━━━━━━━━━━━━━━━━━━━━  42% · reinicia 15:30
    Semanal     ━━━━━━━━━━━━━━━━━━━━   7% · reinicia sex., 27 de nov., 05:00
    1,5 mil tokens nesta conversa
    ```
  - Conta com limite de gastos: a barra com a % usada e, abaixo, o valor em US$ (ex.: `~US$ 33,00 de US$ 300,00`) e a data em que reinicia.
- A barra encolhe em painéis estreitos (como a aba Code do app Claude), para cada linha caber inteira.

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
