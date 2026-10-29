import { ChatOpenAI  } from "@langchain/openai"
import { END, type GraphNode, MemorySaver, START, StateGraph } from "@langchain/langgraph"
import { createReadEmailNode } from "./nodes/readEmail.ts"
import { EmailAgentState } from "./types/types.ts"
import { createClassifyIntent } from "./nodes/classifyIntent.ts"
import { createSearchDocumentation } from "./nodes/searchDocumentation.ts"
import { creatBugTracking } from "./nodes/bugTracking.ts"
import { createDraftResponse } from "./nodes/draftResponse.ts"
import { createHumanReview } from "./nodes/humanReview.ts"
import { createSendReply } from "./nodes/sendReply.ts"

const llm = new ChatOpenAI({model: 'gpt-4'})

/**
 * Em langgraph vc separa o problema (o serviço) em steps menores,
 * Cada step será uma função e serão chamados de 'nodes'.
 *
 * Cada node (nó) deve retornar a atualização para
 * um de um estado centralizado(que é compartilhado entre todos os nós)
 *    return new Comand({ update: { propriedade:novovalor } })
 *
 * Cada node (nó) pode retornar o destino a seguir, qual será o proximo nó do grafo
 * que será executado: usando o goto.
 *    return new Command({
 *          update: { propriedade:novovalor }
 *          goto: 'nomeDoProximoNó'
 *      })
 *
 */


/**********************************************************/
/**                   Nós de Leituras                     */
/**********************************************************/
const readEmail: GraphNode<typeof EmailAgentState> = createReadEmailNode()
const classifyIntent:GraphNode<typeof EmailAgentState> = createClassifyIntent(llm)


/**********************************************************/
/**                Nós de busca e tracking                */
/**********************************************************/
const searchDocumentation: GraphNode<typeof EmailAgentState> = createSearchDocumentation()
const bugTracking: GraphNode<typeof EmailAgentState> = creatBugTracking()


/**********************************************************/
/**                    Nós de Respostas                   */
/**********************************************************/
const draftResponse: GraphNode<typeof EmailAgentState> = createDraftResponse(llm)
const humanReview: GraphNode<typeof EmailAgentState> = createHumanReview()
const sendReply: GraphNode<typeof EmailAgentState> = createSendReply()


/*
  -----           CONSTRUINDO O GRAFO          -----
  O new StateGraph cria um grafo vazio
  os nodes (nós) e edges (arestas, linhas) controem o grafo
  que é armazenado na constante workflow
  Esse grafo construido ainda não é executavel, é como se fosse a planta do que será executavel
  O grafo se tornará executavel somente apos o compile
*/
const workflow = new StateGraph(EmailAgentState)
  .addNode("readEmail", readEmail)
  .addNode("classifyIntent", classifyIntent, { ends: ["humanReview", "searchDocumentation", "bugTracking", "draftResponse"] })
  .addNode("searchDocumentation", searchDocumentation,
            {retryPolicy: { maxAttempts:3 } }
  )
  .addNode("bugTracking", bugTracking)
  .addNode("draftResponse", draftResponse)
  .addNode("humanReview", humanReview, { ends: ["sendReply", END] })
  .addNode("sendReply", sendReply)
  // Add only the essential edges: As arestas somente para os nodes que não fizeram o direcionamento por si só
  .addEdge(START, "readEmail")
  .addEdge("readEmail", "classifyIntent")
  .addEdge("sendReply", END);


// um checkpointer, persistencia do estado do grafo em memoria ram
const memory = new MemorySaver()

// fazemos o bind do grafo com o checkpointer e o compilamos em um grafo executavel
export const app = workflow.compile({ checkpointer: memory })
