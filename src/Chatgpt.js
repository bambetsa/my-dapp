import OpenAI from "openai";

// Initialize the OpenAI client with your API key and configure it to allow browser-side usage,
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY, 
  dangerouslyAllowBrowser: true // Enable the use of the API client directly in the browser - CONFIRM THIS!!!
});

// Define an asynchronous function to analyze security vulnerabilities in a smart contract using the OpenAI API.
export async function analyzeSecurity(contractCode, transactionHash, transactionDetails, modelVersion) {
  try {
    const response = await openai.chat.completions.create({
      model: modelVersion,  // Use the model version passed as a parameter
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant trained and highly skilled in smart contract security analysis. I need you to list potential security issues found in the provided smart contract code, formatted as follows: Start each issue with a number followed by a colon and the title of the issue, followed again by a colon. Describe the issue succinctly. End each issue description with a severity level in square brackets (e.g., '[3]'). The severity levels range from 0 (negligible) to 5 (critical). Then, provide the next issue separated by a paragraph. That is, for each issue, format it as follows:\n\n" +
          
          "\"Number: Title: Description [Severity]\"\n\n" +
          
          "Do not include any headers, footers, or additional text. Use a single line for each issue and ensure there is a clear separation between the description and severity by a single space before the severity level, enclosed in squared brackets"
        },
        {
          role: "user",
          content: `Contract Code:\n${contractCode}\n
                    Transaction Hash: ${transactionHash}\n
                    Transaction Details:\n${transactionDetails}`
        },
        {
          role: "assistant", // Initial assistant message setting expectations of the task.
          content: "Analyzing the smart contract code and transaction details for security risks. I will provide a list of issues with their respective security threat levels."
        }
      ],
      temperature: 0.4,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0.1,
      presence_penalty: 0.2,
    });
    
    console.log("API Response:", JSON.stringify(response, null, 2));
    return response.choices[0].message.content;

  } catch (error) {
    console.error('Error during analysis with OpenAI:', error);
    throw error;
  }
}



