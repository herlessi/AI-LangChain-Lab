import { ChatOpenAI  } from "@langchain/openai"
import { Command, END, type GraphNode, interrupt, MemorySaver, START, StateGraph, StateSchema } from "@langchain/langgraph"
import * as z from "zod"
import { HumanMessage } from "@langchain/core/messages"
import * as readline from "node:readline/promises"

// Define the structure for email classification
const EmailClassificationSchema = z.object({
    intent: z.enum(["question", "bug", "billing", "feature", "complex"]),
    urgency: z.enum(["low", "medium", "high", "critical"]),
    topic: z.string(),
    summary: z.string()
})

const EmailAgentState = new StateSchema({
    // Raw email data
    emailContent: z.string(),
    senderEmail: z.string(),
    emailId: z.string(),

    // Classification Result
    classification: EmailClassificationSchema.optional(),

    // Raw search/API results
    // um dos nós fará busca em um documento externo para buscar respostas
    searchResults: z.array(z.string()).optional(), // List of raw document chunks
    customerHistory: z.record(z.string(), z.any()).optional(),

    responseText: z.string().optional()

})

type EmailClassificationType = z.infer<typeof EmailClassificationSchema>

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
/**********************************************************/
/**                   Nós de Leituras                     */
/**********************************************************/
/**********************************************************/


// create the readEmail node
const readEmail: GraphNode<typeof EmailAgentState> = async (state, config) => {
    // Extract and parse email content
    // In production, this would connect to your email service
    console.log(`Processing email: ${state.emailContent}`)
    return {}
}

// create the classify intent node: classify the email intent
const classifyIntent:GraphNode<typeof EmailAgentState> = async (state, config) => {
    // use LLM to classify email intent and urgency, then route accordingly

    // Create structured LLM that returns EmailClassification object
    // Este comando faz com que o llm responda da maneira que está estruturado no esquema, 
    // sem adicionar frases extras
    const structuredLLM = llm.withStructuredOutput(EmailClassificationSchema)

    // Format the prompt on-demand, not stored in state
    const classificationPrompt = `
        Analyze this customer email and classify it:

        Email: ${state.emailContent}
        From: ${state.senderEmail}

        Provide classification including intent, urgency, topic, and summary.
        `

    // Get structured response directly as object
    const classification = await structuredLLM.invoke(classificationPrompt)


    // Determine next node based on classification
    let nextNode: "searchDocumentation" | "humanReview" | "draftResponse" | "bugTracking";

    if(classification.intent === "billing" || classification.urgency === "critical"){
        nextNode = "humanReview"
    } else if (classification.intent === "question" || classification.intent === "feature"){
        nextNode = "searchDocumentation"   
    } else if (classification.intent === "bug") {
        nextNode = "bugTracking"
    } else {
        nextNode = "draftResponse"
    }

    // Store classification as a single object in state
    return new Command({
        update: { classification },
        goto: nextNode,
    })
}


/**********************************************************/
/**********************************************************/
/**                Nós de busca e tracking                */
/**********************************************************/
/**********************************************************/

const searchDocumentation: GraphNode<typeof EmailAgentState> = async (state, config) =>{
    // Search knowledge base for relevant information

    // Build search query from classification 
    // já deve ter sido classificado no nó classifyIntent
    const classification = state.classification
    const query = `${classification?.intent} ${classification?.topic}`

    let searchResults: string[]

    try {
        // implement the search logic here
        // Store raw search results, not formatted text
        searchResults = [
            "Reset password via Settings > Security > Change Password",
            "Password must be at least 12 characters",
            "Include uppercase, lowercase, numbers, and symbols",
        ]

    } catch (error) {
        // For recoverable search erros, store erro and continue
        searchResults = [`Search temporarily unavailable: ${error}`];
    }

    return new Command({
            update:{ searchResults },
            goto: "draftResponse"
        })
}


const bugTracking: GraphNode<typeof EmailAgentState> = async (state, config) =>{
    // Create or update bug tracking ticket
    // Crie ou atualize um registro de bug (no banco por exemplo via api)

    // Create ticket in your bug tracking system
    // apos o registro do banco, recuperar o id do ticket
    const ticketId = "BUG-12345";  // Would be created via API

    return new Command({
        update: { searchResults: [`Bug ticket ${ticketId} created`] },
        goto: "draftResponse",
    })
}


/**********************************************************/
/**********************************************************/
/**                    Nós de Respostas                   */
/**********************************************************/
/**********************************************************/
const draftResponse: GraphNode<typeof EmailAgentState> = async (state, config) => {
  // Generate response using context and route based on quality

  const classification = state.classification!;

  // Format context from raw state data on-demand
  const contextSections: string[] = [];

  if (state.searchResults) {
    // Format search results for the prompt
    const formattedDocs = state.searchResults.map(doc => `- ${doc}`).join("\n");
    contextSections.push(`Relevant documentation:\n${formattedDocs}`);
  }

  if (state.customerHistory) {
    // Format customer data for the prompt
    contextSections.push(`Customer tier: ${state.customerHistory.tier ?? "standard"}`);
  }

  // Build the prompt with formatted context
  const draftPrompt = `
  Draft a response to this customer email:
  ${state.emailContent}

  Email intent: ${classification.intent}
  Urgency level: ${classification.urgency}

  ${contextSections.join("\n\n")}

  Guidelines:
  - Be professional and helpful
  - Address their specific concern
  - Use the provided documentation when relevant
  `;

  const response = await llm.invoke([new HumanMessage(draftPrompt)]);

  // Determine if human review needed based on urgency and intent
  const needsReview = (
    classification.urgency === "high" ||
    classification.urgency === "critical" ||
    classification.intent === "complex"
  );

  // Route to appropriate next node
  const nextNode = needsReview ? "humanReview" : "sendReply";

  return new Command({
    update: { responseText: response.content.toString() },  // Store only the raw response
    goto: nextNode,
  });
}

const humanReview: GraphNode<typeof EmailAgentState> = async (state, config) => {
  // Pause for human review using interrupt and route based on decision
  const classification = state.classification!;

  // interrupt() must come first - any code before it will re-run on resume
  //interação com o ser humano, deve vir logo no começo,pois depois da interação
  // O langgraph irá reiniciar a execução do node, então todo trecho antes do interrupt()
  // irá rodar novamente.
  const humanDecision = interrupt({
    emailId: state.emailId,
    originalEmail: state.emailContent,
    draftResponse: state.responseText,
    urgency: classification.urgency,
    intent: classification.intent,
    action: "Please review and approve/edit this response",
  });

  // Now process the human's decision
  if (humanDecision.approved) {
    return new Command({
      update: { responseText: humanDecision.editedResponse || state.responseText },
      goto: "sendReply",
    });
  } else {
    // Rejection means human will handle directly
    return new Command({ update: {}, goto: END });
  }
}

const sendReply: GraphNode<typeof EmailAgentState> = async (state, config) => {
  // Send the email response
  // Integrate with email service
  console.log(`Sending reply: ${state.responseText!.substring(0, 100)}...`);
  return {};
}

// o new StateGraph cria um grafo vazio
// os nodes (nós) e edges (arestas, linhas) controem o grafo
// que é armazenado na constante workflow
// Esse grafo construido ainda não é executavel, é como se fosse a planta do que será executavel
// O grafo se tornará executavel somente apos o compile
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
  // Add only the essential edges
  .addEdge(START, "readEmail")
  .addEdge("readEmail", "classifyIntent")
  .addEdge("sendReply", END);

  
// Compile with checkpointer for persistence
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

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const opcao = (await rl.question("Aprovar, editar ou rejeitar? (a/e/r) ")).trim().toLowerCase();
const editedResponse = opcao === "e" ? await rl.question("Novo texto: ") : undefined;
rl.close();

const finalResult = await app.invoke(
  new Command({ resume: { approved: opcao === "a" || opcao === "e", editedResponse } }), config);

console.log(opcao === "a" || opcao === "e" ? "Email sent successfully!" : "Rejeitado: nenhum e-mail enviado.");