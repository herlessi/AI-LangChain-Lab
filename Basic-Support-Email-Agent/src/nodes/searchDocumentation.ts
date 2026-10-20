import { Command, type GraphNode } from "@langchain/langgraph"
import { EmailAgentState } from "../types/types.ts"

export function createSearchDocumentation(){

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

    return searchDocumentation

}