import { Command } from "@langchain/langgraph"
import * as readline from "node:readline/promises"
import { app } from "./graph.ts"

// Test with an urgent billing issue
const initialState = {
  emailContent: "I was charged twice for my subscription! This is urgent!",
  senderEmail: "customer@example.com",
  emailId: "email_123"
};

const config = { configurable: { thread_id: "customer" } }
const result = await app.invoke(initialState, config)

// The graph will pause at human_review
console.log(`Draft ready for review: ${result.responseText?.substring(0, 100)}...`);


// Resume execution
// Responsta humana de maneira automatica
// const finalResult = await app.invoke(
//   new Command({
//     resume: {
//       approved: true,
//       editedResponse: "We sincerely apologize for the double charge. I've initiated an immediate refund...",
//     }
//   })
//   , config);

// Cria a interface para ler o que o usuário digita no terminal
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
// Pergunta a decisão do revisor e normaliza a resposta (sem espaços, minúscula)
const opcao = (await rl.question("Aprovar, editar ou rejeitar? (a/e/r) ")).trim().toLowerCase();
// Se escolheu editar, pede o novo texto; caso contrário, fica undefined
const editedResponse = opcao === "e" ? await rl.question("Novo texto: ") : undefined;
// Fecha a interface para liberar o terminal
rl.close();

const finalResult = await app.invoke(
  new Command({ resume: { approved: opcao === "a" || opcao === "e", editedResponse } }), config);

console.log(opcao === "a" || opcao === "e" ? "Email sent successfully!" : "Rejeitado: nenhum e-mail enviado.");
