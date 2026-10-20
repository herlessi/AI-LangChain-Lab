import { Command, type GraphNode } from "@langchain/langgraph";
import { EmailAgentState, EmailClassificationSchema } from "../types/types.ts";
import { ChatOpenAI, type ChatOpenAICallOptions } from "@langchain/openai";


export function createClassifyIntent(llm:ChatOpenAI<ChatOpenAICallOptions>){

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

    return classifyIntent

}