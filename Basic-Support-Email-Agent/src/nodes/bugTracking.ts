import { Command, type GraphNode } from "@langchain/langgraph";
import { EmailAgentState } from "../types/types.ts";

export function creatBugTracking(){

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

    return bugTracking
}