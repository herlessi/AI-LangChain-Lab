import { Command, END, type GraphNode, interrupt } from "@langchain/langgraph";
import { EmailAgentState } from "../types/types.ts";

export function createHumanReview () {

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

    return humanReview

}