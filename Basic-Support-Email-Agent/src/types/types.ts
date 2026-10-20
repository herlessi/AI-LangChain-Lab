import { StateSchema } from "@langchain/langgraph"
import * as z from "zod"

// Define the structure for email classification
export const EmailClassificationSchema = z.object({
    intent: z.enum(["question", "bug", "billing", "feature", "complex"]),
    urgency: z.enum(["low", "medium", "high", "critical"]),
    topic: z.string(),
    summary: z.string()
})

export const EmailAgentState = new StateSchema({
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
