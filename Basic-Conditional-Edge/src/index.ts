import { END, START, StateGraph, StateSchema, type GraphNode } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";

const llm = new ChatOpenAI({model: 'gpt-4'})

const classificacaoEnum = z.enum(['lowercase','uppercase','unknown']).describe('possiveis comandos a ser executado') 

const AgentState = new StateSchema({
    input: z.string().describe('Entrada humana'),
    classificacao: classificacaoEnum,
    output: z.string().describe('Resposta final')
})

const structuredOutput = z.object({
    classificacao: classificacaoEnum,
})

const classificacaoNode: GraphNode<typeof AgentState> = async (state) =>{
    const structuredLLM = llm.withStructuredOutput(structuredOutput)
    const prompt = `qual tipo de ação na string o usuario deseja ao enviar a frase a seguir:
    ${state.input}`
    const classificacao = (await structuredLLM.invoke(prompt)).classificacao

    return {
        ...state,
        classificacao
    }
}

const toUpperCaseNode: GraphNode<typeof AgentState> = (state) =>{
    return {
        ...state,
        output: state.input.toUpperCase()
    }
}

const toLowerCaseNode: GraphNode<typeof AgentState> = (state) =>{
    return {
        ...state,
        output: state.input.toLowerCase()
    }
}


const fallbackNode: GraphNode<typeof AgentState> = (state) =>{
    return {
        ...state,
        output: `a mensagem não foi alterada: ${state.input}`
    }
}

const responseNode: GraphNode<typeof AgentState> = (state) => {
    console.log(state.output)
    return {}
}


const workflow = new StateGraph(AgentState)
    // Adicionando os nodes
    .addNode('classificacaoNode', classificacaoNode)
    .addNode('toLowerCaseNode', toLowerCaseNode)
    .addNode('toUpperCaseNode', toUpperCaseNode)
    .addNode('fallbackNode', fallbackNode)
    .addNode('responseNode', responseNode)
    // Agora adicionando as arestas (edges)
    .addEdge(START, 'classificacaoNode')
    // Adicionando a aresta condicional ( Conditional Edges )
    .addConditionalEdges(
        "classificacaoNode",
        (state: typeof AgentState.State) => {
            switch(state.classificacao){
                case 'lowercase':
                    return 'toLowerCaseNode'
                case 'uppercase':
                    return 'toUpperCaseNode'
                default: 
                    return 'fallbackNode'
            }
        },
        {
            "toLowerCaseNode":"toLowerCaseNode",
            "toUpperCaseNode":"toUpperCaseNode",
            "fallbackNode":"fallbackNode"
        }
    )
    .addEdge('toLowerCaseNode', 'responseNode')
    .addEdge('toUpperCaseNode', 'responseNode')
    .addEdge('fallbackNode', 'responseNode')
    .addEdge('responseNode', END)


const initialState = {
    input: 'coloque esta FRASE EM MINUSCULO'
    // input: 'coloque esta FRASE EM MAISCULO'
    // input: 'coloque esta de qualquer jeito.'
}


const grafo = workflow.compile()
grafo.invoke(initialState)
