// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PinioScan — On-chain Token Safety Attestations
/// @notice Stores AI-generated safety scores for Base tokens
/// @dev Deployed on Base for cheap attestation storage
contract PinioScan {
    struct Attestation {
        address token;         // Token contract address (on Base)
        uint8 score;           // Safety score 0-100
        string riskLevel;      // "SAFE", "CAUTION", "DANGER", "CRITICAL"
        string reportCID;      // IPFS CID or content hash of full report
        uint256 timestamp;
        address scanner;       // Who initiated the scan
    }

    // Access control
    address public owner;
    mapping(address => bool) public authorizedScanners;

    // token address => array of attestations
    mapping(address => Attestation[]) public tokenAttestations;
    
    // Global scan counter
    uint256 public totalScans;
    
    // Recent scans (circular buffer of last 50)
    address[] public recentTokens;
    
    // Events
    event PinioScanAttestation(
        address indexed token,
        uint8 score,
        string riskLevel,
        string reportCID,
        address indexed scanner,
        uint256 timestamp
    );
    event ScannerAdded(address indexed scanner);
    event ScannerRemoved(address indexed scanner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedScanners[msg.sender], "Not authorized scanner");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedScanners[msg.sender] = true;
        emit ScannerAdded(msg.sender);
    }

    /// @notice Add an authorized scanner (owner only)
    function addScanner(address scanner) external onlyOwner {
        authorizedScanners[scanner] = true;
        emit ScannerAdded(scanner);
    }

    /// @notice Remove an authorized scanner (owner only)
    function removeScanner(address scanner) external onlyOwner {
        authorizedScanners[scanner] = false;
        emit ScannerRemoved(scanner);
    }

    /// @notice Submit a safety attestation for a token (authorized scanners only)
    function submitAttestation(
        address token,
        uint8 score,
        string calldata riskLevel,
        string calldata reportCID
    ) external onlyAuthorized {
        require(score <= 100, "Score must be 0-100");
        
        tokenAttestations[token].push(Attestation({
            token: token,
            score: score,
            riskLevel: riskLevel,
            reportCID: reportCID,
            timestamp: block.timestamp,
            scanner: msg.sender
        }));
        
        totalScans++;
        recentTokens.push(token);
        
        emit PinioScanAttestation(token, score, riskLevel, reportCID, msg.sender, block.timestamp);
    }

    /// @notice Get all attestations for a token
    function getAttestations(address token) external view returns (Attestation[] memory) {
        return tokenAttestations[token];
    }

    /// @notice Get the latest safety score for a token
    function getLatestScore(address token) external view returns (uint8 score, string memory riskLevel, uint256 timestamp) {
        Attestation[] storage a = tokenAttestations[token];
        require(a.length > 0, "No attestations");
        Attestation storage latest = a[a.length - 1];
        return (latest.score, latest.riskLevel, latest.timestamp);
    }

    /// @notice Get number of attestations for a token
    function getAttestationCount(address token) external view returns (uint256) {
        return tokenAttestations[token].length;
    }

    /// @notice Get recent scanned tokens (last N)
    function getRecentTokens(uint256 count) external view returns (address[] memory) {
        uint256 len = recentTokens.length;
        if (count > len) count = len;
        address[] memory recent = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = recentTokens[len - count + i];
        }
        return recent;
    }
}
