import { ChatOpenAI  } from "@langchain/openai"
import { Command, Graph, GraphNode, StateSchema } from "@langchain/langgraph"
import * as z from "zod"
import { ne } from "zod/v4/locales"

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
