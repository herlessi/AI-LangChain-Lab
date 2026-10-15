import { ChatOpenAI  } from "@langchain/openai"
import { GraphNode, StateSchema } from "@langchain/langgraph"
import * as z from "zod"

// Define the structure for email classification
const EmailClassificationSchema = z.object({
    intent: z.enum(["question", "bug", "billing", "feature", "complex"]),
    urgency: z.enum(["low", "medium", "high", "critical"]),
    topic: z.string(),
    summary: z.string()
})

const emailAgentState = new StateSchema({
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
// const readEmail: GraphNode<typeof EmailAgentState>;