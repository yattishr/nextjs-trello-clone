import openai from "@/openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // todos in the body of the POST req
  const { todos } = await request.json();
  console.log(todos);

  // communicate with OpenAI GPT
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    temperature: 0.8,
    n: 1,
    stream: false,
    messages: [
      {
        role: "system",
        content: `When responding, welcome the user always as Good Day Human and say Welcome to the Trello Clone App! Limit the response to 200 characters`,
      },
      {
        role: "user",
        content: `Hi there, provide a summary of the following todos. Count how many todos are in each category 
        such as To do, in progress and done, then tell the user to have a productive day! 
        Here's the data: ${JSON.stringify(todos)}`,
      },
    ],
  });

  // destructure the data from the response
  const { data } = response;

  // log data to the console
  console.log(`Data is: ${data}`);
  console.log(data.choices[0].message);

  return NextResponse.json(data.choices[0].message);
}
