import { tool } from "@langchain/core/tools"
import { createAgent, initChatModel} from "langchain"
import * as z from "zod"

// The system prompt defines your agent’s role and behavior. Keep it specific and actionable:
const SYSTEM_PROMPT = `You are a literary data assistant.

## Capabilities

- \`fetch_text_from_url\`: loads document text from a URL into the conversation.
Do not guess line counts or positions—ground them in tool results from the saved file.`;

// Fetches the text content of a URL (used as the tool's implementation)
// o type de url é '{url:string}' pq é o valor recebido ao criar o tool
const fetchContent = async ({url}:{url:string}): Promise<string> =>{
 
    // controlar o timeout da requisição
    const controller = new AbortController()
    const timeoutId = setTimeout(() =>controller.abort(),120_000)

    try {
        //fazendo a requisição, o fetch responde assim que o servidor responda, mesmo que o download ainda
        // esteja acontecendo, por isso precisaremos de outro await em resp.text()
        const resp = await fetch(url,{
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; quickstart-research/1.0)",
            },
            signal: controller.signal //faz o bind com o controller para que, se necessario, o abort seja executado.
        })

        if(!resp.ok){
            return `Fetch Failed: HTTP ${resp.status} ${resp.statusText}`
        }

        // só resolve a promisse quando todo o texto for lido
        return await resp.text();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message: String(error)
        return `Fetch Failed: ${errorMessage}`
    } finally{
        clearTimeout(timeoutId)
    }

}

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