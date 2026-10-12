import { createAgent, tool } from 'langchain'
import * as z from "zod"

type Input = {
    city: string;
}

// Create a custom tool that the agent can call
const getWeather = tool(
    (input: Input) => `It's always sunny in ${input.city}`, // The function that runs when the model calls this tool
    {
        name:"get_weather", // how the model can call the tool
        description: "Get the weather for a given city", // Tells the model what this tool does, so it knows when to call it
        schema: z.object({
            city:z.string().describe("The city to get the weather for")
        })
    }
)

//Creating the agent
const agent = createAgent({
    model:'gpt-5.5',
    tools: [getWeather] // Bind the tools the agent can call
})


const response = await agent.invoke({
    messages: [
        { role:'user', content:"What's the weather in San Francisco?" }
    ]
})

console.log('respose body: ', response)
console.log('respose: ', response.messages[3].content)


//When you run the code and prompt the agent to tell you about the weather in San Francisco, 
//  the agent uses that input and its available context. 
// The agent understands that you are asking about the weather for the city San Francisco and therefore 
// calls the weather tool with the provided city name.