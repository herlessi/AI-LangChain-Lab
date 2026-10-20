import { type GraphNode } from "@langchain/langgraph";
import { EmailAgentState } from "../types/types.ts";

export function createSendReply(){

    const sendReply: GraphNode<typeof EmailAgentState> = async (state, config) => {
        // Send the email response
        // Integrate with email service
        console.log(`Sending reply: ${state.responseText!.substring(0, 100)}...`);
        return {};
    }

    return sendReply
}