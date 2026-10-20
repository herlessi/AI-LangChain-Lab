import { tool } from "@langchain/core/tools"
import { ChatOpenAI  } from "@langchain/openai"
import * as z from 'zod'

// Definido o modelo
const model = new ChatOpenAI( { model: 'gpt-4' } )


// Definindo tools
// ADD
const add = tool( ({a,b})=>{a + b},{
    name:'add',
    description:'Add two numbers',
    schema: z.object({
        a: z.number().describe('First Number'),
        b: z.number().describe('Second Number'),
    })
})

// MULTIPLY
const multiply = tool ( ({a, b})=>{ a*b }, {
    name: 'multiply',
    description: 'Multiply two numbers',
    schema: z.object({
        a: z.number().describe('First Number'),
        b: z.number().describe('Second Number'),
    })
})

// DIVISION
const divide = tool( ()=>{} , {
    name: 'divide',
    description: 'Divide two numbers',
    schema: z.object({
        a: z.number().describe('First Number'),
        b: z.number().describe('Second Number'),
    })
})


// constroi um objeto das tools com os labels dinamicos
const toolsByName = {
    [add.name]: add,
    [multiply.name]: multiply,
    [divide.name]: divide,
}

// monta um array contendo só as funções tools
const tools = Object.values(toolsByName)

// faz o bind do modelo com as tools
const modelWithtools = model.bindTools(tools)