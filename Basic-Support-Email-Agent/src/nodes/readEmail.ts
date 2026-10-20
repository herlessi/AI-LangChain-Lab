import { type GraphNode } from "@langchain/langgraph";
import { EmailAgentState } from "../types/types.ts";

// create the readEmail node
export function createReadEmailNode(){
    
    const readEmail: GraphNode<typeof EmailAgentState> = async (state, config) => {
        // Extract and parse email content
        // In production, this would connect to your email service
        console.log(`Processing email: ${state.emailContent}`)
        return {}
    }

    return readEmail;
}