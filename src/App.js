import "./App.css";
import { useEffect, useState } from "react";
import { analyzeSecurity } from "./Chatgpt";
import openAiIcon from './openai_icon.png';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const [contractDetails, setContractDetails] = useState(null);
  const [checkingContract, setCheckingContract] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [structuredIssues, setStructuredIssues] = useState([]);
  const [modelVersion, setModelVersion] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [error, setStatus] = useState('');

  const [statusType, setStatusType] = useState('');
  const [dynamicContent, setDynamicContent] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setCurrentAccount(accounts.length > 0 ? accounts[0] : null);
        setIsConnected(accounts.length > 0);
        setStatus(`Connected to account: ${accounts[0]}`);
        setStatusType('success');
      } catch (error) {
        setStatus("Failed to connect to MetaMask. Please try again.");
        setStatusType('error');
        console.error("MetaMask connection error:", error);
      }
    } else {
      setStatus("MetaMask is not detected. Please install MetaMask.");
      setStatusType('error');
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
    }
  }, []);

  const handleModelSelection = (version) => {
    setModelVersion(version);
    setActiveModel(version);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isConnected) {
      setStatus("Please connect to MetaMask first.");
      setStatusType('error');
      return;
    }

    setCheckingContract(true);
    setContractDetails(null);
    setAnalysisResult('');
    setStructuredIssues([]);
    setRiskScore(0);
    setStatus('');
    setStatusType('');
    // setDynamicContent(<span className="loading-dots">...</span>);

    const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY;
    const contractSourceUrl = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;

    try {
      const contractSourceResponse = await fetch(contractSourceUrl);
      const contractSourceData = await contractSourceResponse.json();

      if (contractSourceData.result && contractSourceData.result[0].SourceCode !== '0x') {
        let sourceCode = contractSourceData.result[0].SourceCode;
        if (sourceCode.startsWith('[') && sourceCode.endsWith(']')) {
          sourceCode = JSON.parse(sourceCode)[0];
        }

        setContractDetails(sourceCode);
        const analysis = await analyzeSecurity(sourceCode, contractAddress, JSON.stringify(contractSourceData.result[0]), modelVersion);
        setAnalysisResult(analysis);

        const issues = analysis.split('\n\n')
          .map(issue => {
            const match = issue.match(/^(\d+): (.*?): (.*) \[(\d+)\]$/);
            if (match) {
              const [_, number, title, description, severity] = match;
              return {
                number: parseInt(number),
                title: title.trim(),
                description: description.trim(),
                severity: parseInt(severity)
              };
            }
            return null;
          }).filter(issue => issue !== null);
        setStructuredIssues(issues);

        const riskLevels = analysis.match(/\[\d+\]/g)?.map(level => parseInt(level.replace(/[\[\]]/g, ''))) || [];
        if (riskLevels.length > 0) {
          const averageRisk = riskLevels.reduce((acc, curr) => acc + curr, 0) / riskLevels.length;
          setRiskScore(Math.round(averageRisk * 4) / 4);
        } else {
          setRiskScore(0);
        }
        setStatusType('success');
        setDynamicContent(null);
      } else {
        setStatus("Failed to fetch contract code or contract is not verified.");
        setStatusType('error');
      }
    } catch (error) {
      console.error("Failed to fetch contract details:", error);
      setStatus("Failed to fetch contract details.");
      setStatusType('error');
      setAnalysisResult("Analysis failed due to network error. Please try again.");
    } finally {
      setCheckingContract(false);
      setDynamicContent(null);
    }
  };

  return (
    <div className="container">
      <h1>Contract Security Checker</h1>
      {isConnected && currentAccount && (
        <p className={`status-message ${statusType}`}>{error}</p>
      )}
      {!isConnected && (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          placeholder="Enter contract address"
        />
        {dynamicContent}
        <div className="button-group">
          <button
            type="button"
            className={`model-button purple ${activeModel === "gpt-4-turbo" ? "active" : ""}`}
            onClick={() => handleModelSelection("gpt-4-turbo")}
          >
            Select ChatGPT <strong>4</strong>
            <img src={openAiIcon} alt="OpenAI Icon" style={{width: '18px', verticalAlign: 'middle',  marginLeft: '6px'}} />
          </button>
          <button
            type="button"
            className={`model-button green ${activeModel === "gpt-3.5-turbo" ? "active" : ""}`}
            onClick={() => handleModelSelection("gpt-3.5-turbo")}
          >
            Select ChatGPT <strong>3.5</strong>
            <img src={openAiIcon} alt="OpenAI Icon" style={{width: '18px', verticalAlign: 'middle', marginLeft: '6px'}} />
          </button>
          <button type="submit" disabled={checkingContract || !isConnected || !activeModel}>Analyze Contract</button>
        </div>
      </form>
      {checkingContract && <p className="status-message">Checking contract
      <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></p>}
      {structuredIssues.length > 0 && (
        <div>
          <h2>Analysis Result:</h2>
          <p>The level of risk of this contract is: {riskScore}</p>
          <div className="risk-indicator-bar">
            <div className="risk-indicator" style={{ left: `${(riskScore / 5) * 100}%` }}></div>
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
