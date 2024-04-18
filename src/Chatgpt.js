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
    console.log("Received contract code:", contractCode);
    console.log("Received transaction hash:", transactionHash);
    console.log("Received transaction details:", transactionDetails);
    // Call to the OpenAI API to create a new chat completion.
    // The assistant's detailed analysis will be generated based on the following messages.
    var longString = ` 
    Directions: put response in the following format: 
    Transaction Details:\n
    - From: \n
    - To: \n
    - Value: \n
    - Gas Used: \n
    - Gas Price: \n
    - Transaction Type: \n\n
    
    Input Validation:\n\n\n
   
    Gas Limit Consideration:\n\n\n
    
    Attack Risks: list of risks of certain attacks, include whether risk of phishing attack\n\n\n   
    
    Recommendation: security recommendation\n
    
    return as plain text. insert new line where \n`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", // System message to set the context for the AI.
          content: longString
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
    console.log("API Response:", JSON.stringify(response, null, 2));
    // Extract and return the assistant's analysis from the response.
    // const analysis = response.data.choices[0].message.content;
    // return analysis;
    console.log("Received response from OpenAI:", response); // Immediately after receiving the response
    const messages = response.choices[0].message.content;
    console.log("Prepared messages for OpenAI:", messages); // After setting up messages array
    // const assistantMessages = messages.filter(m => m.role === 'assistant');
    // console.log("Filtered assistant messages:", assistantMessages); // After filtering messages
    // const lastMessage = assistantMessages[assistantMessages.length - 1];
    // console.log("Extracted analysis:", messages.content);
    return messages;

  } catch (error) {
    // Log and rethrow the error if the API call fails.
    console.error('Error during analysis with OpenAI:', error);
    throw error;
  }
}


