import { ChatOpenAI  } from "@langchain/openai"
import { Command, END, type GraphNode, interrupt, MemorySaver, START, StateGraph, StateSchema } from "@langchain/langgraph"
import * as readline from "node:readline/promises"
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
const app = workflow.compile({ checkpointer: memory })



// Test with an urgent billing issue
const initialState = {
  emailContent: "I was charged twice for my subscription! This is urgent!",
  senderEmail: "customer@example.com",
  emailId: "email_123"
};

const config = { configurable: { thread_id: "customer" } }
const result = await app.invoke(initialState, config)

// The graph will pause at human_review
console.log(`Draft ready for review: ${result.responseText?.substring(0, 100)}...`);


// Resume execution
// Responsta humana de maneira automatica
// const finalResult = await app.invoke(
//   new Command({
//     resume: {
//       approved: true,
//       editedResponse: "We sincerely apologize for the double charge. I've initiated an immediate refund...",
//     }
//   })
//   , config);

// Cria a interface para ler o que o usuário digita no terminal
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
// Pergunta a decisão do revisor e normaliza a resposta (sem espaços, minúscula)
const opcao = (await rl.question("Aprovar, editar ou rejeitar? (a/e/r) ")).trim().toLowerCase();
// Se escolheu editar, pede o novo texto; caso contrário, fica undefined
const editedResponse = opcao === "e" ? await rl.question("Novo texto: ") : undefined;
// Fecha a interface para liberar o terminal
rl.close();

const finalResult = await app.invoke(
  new Command({ resume: { approved: opcao === "a" || opcao === "e", editedResponse } }), config);

console.log(opcao === "a" || opcao === "e" ? "Email sent successfully!" : "Rejeitado: nenhum e-mail enviado.");