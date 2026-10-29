# Basic Support Email Agent

Agente de suporte por e-mail feito com LangGraph.js. Ele lê o e-mail do cliente, classifica a intenção, busca documentação ou abre um bug, escreve um rascunho de resposta e pausa para uma pessoa revisar antes de enviar.

## Fluxo do grafo

```
START → readEmail → classifyIntent ─┬→ searchDocumentation ─┐
                                    ├→ bugTracking ─────────┤
                                    ├→ draftResponse ←──────┘
                                    └→ humanReview
draftResponse ─┬→ humanReview ─┬→ sendReply → END
               │               └→ END (rejeitado)
               └→ sendReply (quando não precisa de revisão)
```

Os nodes `classifyIntent`, `searchDocumentation`, `bugTracking`, `draftResponse` e `humanReview` escolhem o próximo node sozinhos (via `Command({ goto })`). Por isso, no grafo, só existem as arestas fixas: `START → readEmail → classifyIntent` e `sendReply → END`.

## Estrutura

| Arquivo | Papel |
|---|---|
| `src/graph.ts` | Monta e exporta o grafo (`export const app`). Não executa nada. |
| `src/index.ts` | Teste no terminal: roda o grafo com um e-mail de exemplo e pede a revisão humana. |
| `src/nodes/` | Um arquivo por node do grafo. |
| `src/types/` | O estado compartilhado (`EmailAgentState`). |
| `langgraph.json` | Configuração do servidor do LangGraph: aponta para `./src/graph.ts:app`. |

O grafo fica separado do teste porque importar um arquivo executa o arquivo inteiro. Se o servidor importasse o `index.ts`, ele rodaria o teste e travaria esperando alguém digitar no terminal.

## Pré-requisitos

- Node.js 22 ou superior (o projeto roda os arquivos `.ts` direto, sem build).
- Uma chave da OpenAI.
- Uma chave do LangSmith, para usar o LangGraph Studio.

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um arquivo `.env` na raiz deste projeto:

   ```bash
   OPENAI_API_KEY=sk-...
   LANGSMITH_API_KEY=lsv2_...
   LANGSMITH_TRACING=true
   ```

   O `.env` está no `.gitignore` e não vai para o repositório.

## Rodando o servidor (LangGraph Studio)

1. Suba o servidor local:

   ```bash
   npm run studio
   ```

   Esse script roda `npx @langchain/langgraph-cli dev`. O servidor lê o `langgraph.json`, carrega o grafo `app` do `src/graph.ts` e as variáveis do `.env`.

2. Espere o terminal mostrar que a API está no ar em `http://localhost:2024`. O próprio CLI imprime o link do Studio e costuma abrir o navegador.

3. Se o navegador não abrir, acesse:

   ```
   https://smith.langchain.com/studio/?baseUrl=http://localhost:2024
   ```

4. No Studio, escolha o grafo `app` e envie uma entrada, por exemplo:

   ```json
   {
     "emailContent": "I was charged twice for my subscription! This is urgent!",
     "senderEmail": "customer@example.com",
     "emailId": "email_123"
   }
   ```

   O grafo pausa no node `humanReview`. Para continuar, retome a execução pelo Studio enviando a decisão:

   ```json
   { "approved": true }
   ```

   Para editar o texto antes de enviar, inclua o campo `editedResponse`. Para rejeitar, envie `{ "approved": false }`.

Para parar o servidor, use `Ctrl + C` no terminal.

### Problemas comuns

- **"Failed to initialize Studio / Failed to fetch"**: o servidor não está rodando. Confira se o `npm run studio` continua aberto no terminal e se a porta 2024 responde em `http://localhost:2024/ok`.
- **O servidor está rodando, mas o erro continua**: alguns navegadores (Brave, Safari) bloqueiam uma página https de acessar o `localhost`. Use Chrome ou Edge, ou suba o servidor com túnel e abra o link que ele imprimir:

  ```bash
  npx @langchain/langgraph-cli dev --tunnel
  ```

## Rodando o teste no terminal

```bash
npm run start
```

O `src/index.ts` envia um e-mail de exemplo, mostra o rascunho e pergunta `Aprovar, editar ou rejeitar? (a/e/r)`. Com `npm run dev`, o mesmo teste roda de novo sempre que um arquivo muda.
