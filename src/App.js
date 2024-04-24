import "./App.css";
// import MetaMaskSDK from "@metamask/sdk";
import { useEffect, useState } from "react";
// Import the analyze function
import { analyzeSecurity } from "./Chatgpt";

// MetaMask SDK initialization
// const MMSDK = new MetaMaskSDK();
// const ethereum = MMSDK.getProvider(); // You can also access via window.ethereum

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [checkingTransaction, setCheckingTransaction] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [structuredIssues, setStructuredIssues] = useState([]);
  const [modelVersion, setModelVersion] = useState(null);  // State to hold the selected model version
  const [activeModel, setActiveModel] = useState(null);  // Track active model button
  const [riskScore, setRiskScore] = useState(0);
  const [error, setError] = useState('');

  const [dynamicContent, setDynamicContent] = useState(null);

  // Function to initiate connection with MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          setIsConnected(true);
          setError(`Connected: ${accounts[0]}`);
        } else {
          setError("No accounts found. Please ensure MetaMask is unlocked.");
        }
      } catch (error) {
        setError("Failed to connect to MetaMask. Please try again.");
        console.error("MetaMask connection error:", error);
      }
    } else {
      setError("MetaMask is not detected. Please install MetaMask.");
    }
  };

  // Function to handle model selection
  const handleModelSelection = (version) => {
    setModelVersion(version);
    setActiveModel(version);  // Set active model for visual feedback
  };

  // Check if MetaMask is connected and fetch the current account
  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      try {
        if (!window.ethereum) {
          alert("MetaMask is not detected. Please install MetaMask.");
          return;
        }
        
        // Informing the user that the connection is being attempted
        setError("Connecting to MetaMask");
        setDynamicContent(<span className="loading-dots">...</span>);
        // setError(<>Connecting to MetaMask<div className="spinner"></div></>);
        setIsConnected(false);

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          setIsConnected(true);
          setError(`Connected to ${accounts[0]}`);
          setDynamicContent(null);
        } else {
          setError("No accounts found. Please ensure MetaMask is unlocked.");
        }
      } catch (error) {
        console.error("Failed to connect to MetaMask", error);
        setError("Failed to connect to MetaMask. Please ensure MetaMask is unlocked and refresh the page.");
      }
  };

  checkIfWalletIsConnected();
}, []);

  // Function to handle form submission, fetch transaction details and security analysis
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isConnected) {
      setError("Please connect to MetaMask first.");
      return;
    }
    setCheckingTransaction(true);
    setTransactionDetails(null);
    setAnalysisResult('');
    setStructuredIssues([]);
    setRiskScore(0);
    setError('');
  
    const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY;
    const transactionUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${ETHERSCAN_API_KEY}`;
  
    try {
      const response = await fetch(transactionUrl);
      const data = await response.json();
      // Uncomment the line below to view OpenAI transaction on console, if necessary
      // console.log("API Response:", JSON.stringify(response, null, 2));
  
      if (data.result) {
        setTransactionDetails(data.result);
        
        // If the transaction has a 'to' address, attempt to fetch the contract source code
        if (data.result.to) {
          const contractSourceUrl = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${data.result.to}&apikey=${ETHERSCAN_API_KEY}`;
          const contractSourceResponse = await fetch(contractSourceUrl);
          const contractSourceData = await contractSourceResponse.json();
  
          if (contractSourceData.result && contractSourceData.result[0].SourceCode !== '0x') {
            // Parse the source code, removing surrounding array characters if they exist
            let sourceCode = contractSourceData.result[0].SourceCode;
            console.log(sourceCode);
            if (sourceCode.startsWith('[') && sourceCode.endsWith(']')) {
              sourceCode = JSON.parse(sourceCode)[0];
            }
  
            // Perform security analysis on the source code
            
            const analysis = await analyzeSecurity(sourceCode, transactionHash, JSON.stringify(data.result), modelVersion);
            setAnalysisResult(analysis);

            // Parsing the analysis result
            // Assuming `analysisResult` is a string containing all issues separated by double newlines
            const issues = analysis.split('\n\n')
            .map(issue => {
              // Regex to extract number, title, description, and severity
              const match = issue.match(/^(\d+): (.*?): (.*) \[(\d+)\]$/);
              if (match) {
                const [_, number, title, description, severity] = match
                return {
                  number: parseInt(number),              // Issue number
                  title: title.trim(),                   // Issue title
                  description: description.trim(),       // Issue description
                  severity: parseInt(severity)           // Severity level
                };
              }
              return null;
            }).filter(issue => issue !== null);
            setStructuredIssues(issues);

            // Calculate the average risk score from the analysis result
            const matches = analysis.match(/\[\d+\]/g);
            const riskLevels = matches ? matches.map(level => parseInt(level.replace(/[\[\]]/g, ''))) : [];
            
            if (riskLevels.length > 0) {
              const averageRisk = riskLevels.reduce((acc, curr) => acc + curr, 0) / riskLevels.length;
              setRiskScore(Math.round(averageRisk * 4) / 4); // Rounding to the nearest 0.25
            } else {
              setRiskScore(0); // Set a default or fallback risk score if no risk levels are found
            }
          } else {
            setAnalysisResult("No verified source code found at this address or it's not a contract.");
          }
        } else {
          setError("Transaction details not found.");
          setAnalysisResult("Unable to perform security analysis.");
        }
      } else {
        setError("Transaction details not found.");
        setAnalysisResult("Unable to perform security analysis.");
      }
    } catch (error) {
      console.error("Failed to fetch transaction details:", error);
      setError("Failed to fetch transaction details", error.message);
      setAnalysisResult("Analysis failed due to network error. Please try again.");
    } finally {
      setCheckingTransaction(false);
    }
  };

  // CSS for the risk indicator bar
  const riskIndicatorPosition = `${(riskScore / 5) * 100}%`; // Converts the risk score to a percentage for positioning

  
  return (
    <div className="container">
      <h1>Transaction Security Checker</h1>
      {!isConnected && (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={transactionHash}
          onChange={(e) => setTransactionHash(e.target.value)}
          placeholder="Enter transaction hash"
        />
        {error && <p className="status-message error">{error}</p>}
        <div className="button-group">
          <button
            type="button"
            className={`model-button purple ${activeModel === "gpt-3.5-turbo" ? "active" : ""}`}
            onClick={() => handleModelSelection("gpt-3.5-turbo")}
          >
            Select ChatGPT 3.5
          </button>
          <button
            type="button"
            className={`model-button green ${activeModel === "gpt-4" ? "active" : ""}`}
            onClick={() => handleModelSelection("gpt-4")}
          >
            Select ChatGPT 4
          </button>
        </div>
        <button type="submit" disabled={checkingTransaction || !isConnected}>Check Transaction</button>
      </form>
      
      {checkingTransaction && <p className="status-message">Checking transaction
      <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></p>}
      {transactionDetails && (
        <div className="transaction-details">
          <h2>Transaction Details:</h2>
          <p>Block Number: {transactionDetails.blockNumber}</p>
          {/* Display other details as needed */}
        </div>
      )}
      {structuredIssues.length > 0 && (
        <div>
          <h2>Analysis Result:</h2>
          <p>The level of risk of this contract is: {riskScore}</p>
          <div className="risk-indicator-bar">
            <div className="risk-indicator" style={{ left: riskIndicatorPosition }}></div>
          </div>
          <div className="analysis-issues">
            <h3>Identified Issues:</h3>
            {structuredIssues.map((issue, index) => (
              <div key={index} className="issue-box">
                <p>{issue.title}: {issue.description}</p>
                <p>Severity: <strong>{issue.severity}</strong></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;