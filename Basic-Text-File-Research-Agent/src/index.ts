import { tool } from "@langchain/core/tools"
import { createAgent, initChatModel, toolStrategy } from "langchain"
import * as z from "zod"
import { MemorySaver } from "@langchain/langgraph"
import { createDeepAgent } from "deepagents";
import { fetchContent } from "./fetch-content-service.ts"
import { SYSTEM_PROMPT, userPrompt } from "./prompts.ts"

// Criando a ferramenta (tool) que será usada pelo agente, a função que faz o fetch do arquivo de texto
// Create a tool by passing a function and a fields object (name, description, schema), 
// which the model needs to know how to call the tool
const fetchTextFromUrl = tool(
    fetchContent,
    {
        name:"fetch_text_from_url",
        description:"Fetch the text document from a url",
        schema: z.object(
            { url:z.string()} // esse objeto será passado como parametro para a função que executa no run do tool
        )
    }
)


// Iniciando um modelo
// Depending on the model and provider chosen, initialization parameters may vary; 
// refer to their reference pages for details.
const model = await initChatModel('gpt-5.5',{
    temperature: 1, //o modelo 'gpt-5.5'  só aceita a temperatura padrão = 1
    timeout:300_000,
    maxTokens:25_000
})



// Add memory to your agent to maintain state across interactions. 
// This allows the agent to remember previous conversations and context.
// In production, use a persistent checkpointer that saves message history to a database
const checkpointer = new MemorySaver()



//This example sends the entire text of The book 'The Gift of the Magi' to the model 
// and may take a minute or two to respond.
async function main() {

    /**
     * Um LangChain Agent é um agente de IA de propósito geral que utiliza um LLM para tomar decisões, 
     * executar ferramentas e responder a solicitações. 
     * 
     * Já um Deep Agent é uma abstração de nível mais alto, construída sobre o ecossistema LangChain/LangGraph, 
     * projetada para tarefas mais complexas e de longa duração.
     * 
     *  Em resumo: LangChain Agent oferece maior simplicidade e flexibilidade, 
     *  enquanto Deep Agent fornece uma estrutura mais completa para executar fluxos de trabalho complexos e com múltiplas etapas.
     */

    /*****************************************/
    /*****************************************/
    /********  CRIANDO OS AGENTES ************/
    /*****************************************/
    /*****************************************/
    // Criando um resposta formatada para que o agente devolva os dados de maneira formatada
    const ResultSchema = z.object({
        della_line_count: z.number().nullable(),
        first_jim_line_number: z.number().nullable(),
        synopsis: z.string(),
        how_you_computed_counts: z.string(),
    })

    // Langchain Agent
    const langchainAgent = createAgent({
        model, // o modelo já iniciado
        tools: [fetchTextFromUrl], // tool criada por nós
        systemPrompt: SYSTEM_PROMPT, // o prompt que define o comportamento do agente
        checkpointer, // a memoria
        responseFormat: ResultSchema
    })


    // Deep Agent
    const deepAgent = createDeepAgent({
        model, // o modelo já iniciado
        tools:[fetchTextFromUrl], // tool criada por nós
        systemPrompt: SYSTEM_PROMPT, // o prompt que define o comportamento do agente
        checkpointer, // a memoria
        responseFormat: toolStrategy(ResultSchema)
    })

    // Acima: responseFormat: toolStrategy(ResultSchema)
    // formato da resposta: o createDeepAgent não aceita o schema Zod direto, precisa de uma "estratégia".
    // toolStrategy cria uma tool extra com o schema, que o modelo chama para entregar a resposta final
    // (fica em deepAgentResult.structuredResponse).
    // Não usamos providerStrategy porque ele liga strict: true em TODAS as tools, e a OpenAI então
    // rejeita tools com campos opcionais, como a tool 'glob' que já vem embutida no deep agent.


    
    /*****************************************/
    /*****************************************/
    /******  EXECUTANDO OS AGENTES  **********/
    /*****************************************/
    /*****************************************/

    //executando o langchain agent
    console.log("Running createAgent (Langchain Agent) ");
    const langChainAgentResult = await langchainAgent.invoke(
        { messages:[{role:'user', content: userPrompt}] },
        { configurable: { thread_id: "great-gatsby-lc" } }
    )

    //executando o deep agent
    console.log("Running createDeepAgent (Deep Agent) ");
    const deepAgentResult = await deepAgent.invoke(
        { messages: [{ role: 'user', content: userPrompt }] },
        { configurable: { thread_id: "great-gatsby-da" } }
    )


    /*****************************************/
    /*****************************************/
    /* Recuperando as respostas dos agentes  */
    /*****************************************/
    /*****************************************/

    
    //recuperando as mensagens obtidas da execução dos agentes
    const langChainAgentMessages = langChainAgentResult.messages
    const deepAgentMessages = deepAgentResult.messages

    console.log("LangChain Agent:")
    console.log(langChainAgentMessages[langChainAgentMessages.length-1]!.contentBlocks)
    // console.log(langChainAgentMessages[langChainAgentMessages.length-1]!.contentBlocks)

    console.log("Deep Agent:")
    console.log(deepAgentMessages[deepAgentMessages.length-1]!.contentBlocks)
    // console.log(deepAgentMessages[deepAgentMessages.length-1]!.contentBlocks)


}


main().catch(error => {
    console.error(error)
    process.exitCode = 1
})

