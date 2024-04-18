// Import the OpenAI library to interact with the OpenAI API.
import OpenAI from "openai";

// Initialize the OpenAI client with your API key and configure it to allow browser-side usage,
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Enable the use of the API client directly in the browser - CONFIRM THIS!!!
});

// Define an asynchronous function to analyze security vulnerabilities in a smart contract using the OpenAI API.
export async function analyzeSecurity(contractCode, transactionHash, transactionDetails) {
  try {
    // Call to the OpenAI API to create a new chat completion.
    // The assistant's detailed analysis will be generated based on the following messages.
    const response = await openai.chat.completions.create({
      model: "gpt-3-turbo",
      messages: [
        {
          role: "system", // System message to set the context for the AI.
          content: "You are a helpful assistant trained in smart contract security. Analyze the given smart contract code and transaction details for potential security issues, vulnerabilities, or risks."
        },
        {
          role: "user", // User message containing the actual data to analyze.
          content: `Contract Code:\n${contractCode}\nTransaction Hash: ${transactionHash}\nTransaction Details:\n${transactionDetails}`
        },
        {
          role: "assistant", // Initial assistant message setting expectations of the task.
          content: "I will analyze the smart contract code and transaction details for security risks."
        }
        // The assistant's detailed analysis will be generated based on the above messages.
      ],
      temperature: 0.7, // Sets the creativity level of the responses
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    // Extract and return the assistant's analysis from the response.
    const analysis = response.data.choices[0].message.content;
    return analysis;

  } catch (error) {
    // Log and rethrow the error if the API call fails.
    console.error('Error during analysis with OpenAI:', error);
    throw error;
  }
}

