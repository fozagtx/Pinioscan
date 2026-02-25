// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IPinioScan — Interface for on-chain token safety attestations
interface IPinioScan {
    struct Attestation {
        address token;
        uint8   score;
        string  riskLevel;
        string  reportCID;
        uint256 timestamp;
        address scanner;
        bool    invalidated;
    }

    event PinioScanAttestation(
        address indexed token,
        uint8           score,
        string          riskLevel,
        string          reportCID,
        address indexed scanner,
        uint256         timestamp
    );
    event ScannerAdded(address indexed scanner);
    event ScannerRemoved(address indexed scanner);
    event OwnershipProposed(address indexed current, address indexed proposed);
    event OwnershipAccepted(address indexed newOwner);
    event AttestationInvalidated(address indexed token, uint256 slotIndex);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
}

/// @title PinioScan — On-chain Token Safety Attestations (hardened)
/// @notice Stores AI-generated safety scores for Base tokens with bounded storage
/// @dev Deployed on Base (chain ID 8453)
contract PinioScan is IPinioScan {

    // ─── Constants ───────────────────────────────────────────────────────────

    uint8   public constant MAX_SCORE                 = 100;
    uint256 public constant MAX_RISK_LEVEL_LEN        = 32;
    uint256 public constant MAX_CID_LEN               = 128;
    uint256 public constant MAX_ATTESTATIONS_PER_TOKEN = 500;
    uint256 public constant RECENT_TOKENS_SIZE        = 50;

    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;
    address public pendingOwner;
    bool    public paused;

    mapping(address => bool) public authorizedScanners;

    /// @dev Ring buffer: bounded to MAX_ATTESTATIONS_PER_TOKEN slots per token
    mapping(address => Attestation[MAX_ATTESTATIONS_PER_TOKEN]) private _attestationRing;
    /// @dev How many attestations have ever been submitted for a token (capped at MAX)
    mapping(address => uint256) private _attestationCount;

    /// @dev Global scan counter
    uint256 public totalScans;

    /// @dev Fixed-size ring buffer for recent tokens
    address[RECENT_TOKENS_SIZE] private _recentTokensRing;
    uint256 private _recentTokensHead;
    uint256 private _recentTokensFilled; // tracks how many slots are populated (0..50)

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "PinioScan: not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedScanners[msg.sender], "PinioScan: not authorized scanner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "PinioScan: paused");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        // NOTE: owner is NOT auto-added as a scanner; roles are separate.
        // Call addScanner(deployerAddress) explicitly if needed.
    }

    // ─── Ownership (two-step) ─────────────────────────────────────────────────

    /// @notice Propose a new owner. The proposed address must call acceptOwnership().
    function proposeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PinioScan: zero address");
        require(newOwner != owner,      "PinioScan: already owner");
        pendingOwner = newOwner;
        emit OwnershipProposed(owner, newOwner);
    }

    /// @notice Accept ownership. Must be called by the pending owner.
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "PinioScan: not pending owner");
        address prev = owner;
        owner        = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipAccepted(owner);
    }

    // ─── Emergency controls ───────────────────────────────────────────────────

    function pause() external onlyOwner {
        require(!paused, "PinioScan: already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        require(paused, "PinioScan: not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ─── Scanner management ───────────────────────────────────────────────────

    /// @notice Add an authorized scanner (owner only)
    function addScanner(address scanner) external onlyOwner {
        require(scanner != address(0),          "PinioScan: zero address");
        require(!authorizedScanners[scanner],   "PinioScan: already scanner");
        authorizedScanners[scanner] = true;
        emit ScannerAdded(scanner);
    }

    /// @notice Remove an authorized scanner (owner only)
    function removeScanner(address scanner) external onlyOwner {
        require(authorizedScanners[scanner], "PinioScan: not a scanner");
        authorizedScanners[scanner] = false;
        emit ScannerRemoved(scanner);
    }

    // ─── Core attestation ─────────────────────────────────────────────────────

    /// @notice Submit a safety attestation for a token (authorized scanners only)
    /// @param token     ERC-20 token address on Base — must not be zero
    /// @param score     Safety score 0–100
    /// @param riskLevel Short label, max 32 bytes ("SAFE", "CAUTION", "DANGER", "CRITICAL")
    /// @param reportCID IPFS CID or hash of the full AI report, max 128 bytes
    function submitAttestation(
        address        token,
        uint8          score,
        string calldata riskLevel,
        string calldata reportCID
    ) external onlyAuthorized whenNotPaused {
        require(token  != address(0),                   "PinioScan: zero token address");
        require(score  <= MAX_SCORE,                    "PinioScan: score > 100");
        require(bytes(riskLevel).length > 0,            "PinioScan: empty riskLevel");
        require(bytes(riskLevel).length <= MAX_RISK_LEVEL_LEN, "PinioScan: riskLevel too long");
        require(bytes(reportCID).length <= MAX_CID_LEN, "PinioScan: reportCID too long");

        uint256 count = _attestationCount[token];
        uint256 slot  = count % MAX_ATTESTATIONS_PER_TOKEN;

        _attestationRing[token][slot] = Attestation({
            token:       token,
            score:       score,
            riskLevel:   riskLevel,
            reportCID:   reportCID,
            timestamp:   block.timestamp,
            scanner:     msg.sender,
            invalidated: false
        });

        // Only increment if we haven't reached the cap (prevents overflow wrap confusion)
        if (count < MAX_ATTESTATIONS_PER_TOKEN) {
            _attestationCount[token] = count + 1;
        }
        // When count >= MAX, the slot wraps and count stays at MAX (ring is full)

        totalScans++;

        // Ring buffer for recent tokens
        _recentTokensRing[_recentTokensHead] = token;
        _recentTokensHead = (_recentTokensHead + 1) % RECENT_TOKENS_SIZE;
        if (_recentTokensFilled < RECENT_TOKENS_SIZE) {
            _recentTokensFilled++;
        }

        emit PinioScanAttestation(token, score, riskLevel, reportCID, msg.sender, block.timestamp);
    }

    /// @notice Invalidate a specific attestation slot (owner only, e.g. for dispute resolution)
    function invalidateAttestation(address token, uint256 slotIndex) external onlyOwner {
        require(slotIndex < MAX_ATTESTATIONS_PER_TOKEN, "PinioScan: slot out of range");
        require(slotIndex < _attestationCount[token],   "PinioScan: slot not written");
        _attestationRing[token][slotIndex].invalidated = true;
        emit AttestationInvalidated(token, slotIndex);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Get a paginated window of attestations for a token
    /// @param offset  Starting slot index
    /// @param limit   Max number of slots to return (capped to MAX_ATTESTATIONS_PER_TOKEN)
    /// @return page   Attestation slice
    /// @return total  Total slots written for this token
    function getAttestations(
        address token,
        uint256 offset,
        uint256 limit
    ) external view returns (Attestation[] memory page, uint256 total) {
        total = _attestationCount[token];
        if (offset >= total) return (new Attestation[](0), total);

        uint256 available = total - offset;
        uint256 size      = limit < available ? limit : available;
        if (size > MAX_ATTESTATIONS_PER_TOKEN) size = MAX_ATTESTATIONS_PER_TOKEN;

        page = new Attestation[](size);
        for (uint256 i = 0; i < size; i++) {
            page[i] = _attestationRing[token][offset + i];
        }
    }

    /// @notice Get the latest (most recently written) attestation slot for a token
    function getLatestAttestation(address token)
        external view
        returns (Attestation memory attestation, bool exists)
    {
        uint256 count = _attestationCount[token];
        if (count == 0) return (attestation, false);
        uint256 latestSlot = (count - 1) % MAX_ATTESTATIONS_PER_TOKEN;
        return (_attestationRing[token][latestSlot], true);
    }

    /// @notice Get only the latest score fields (gas-efficient for frontends)
    function getLatestScore(address token)
        external view
        returns (uint8 score, string memory riskLevel, uint256 timestamp)
    {
        uint256 count = _attestationCount[token];
        require(count > 0, "PinioScan: no attestations");
        uint256 latestSlot = (count - 1) % MAX_ATTESTATIONS_PER_TOKEN;
        Attestation storage a = _attestationRing[token][latestSlot];
        return (a.score, a.riskLevel, a.timestamp);
    }

    /// @notice How many attestation slots have been written for a token
    function getAttestationCount(address token) external view returns (uint256) {
        return _attestationCount[token];
    }

    /// @notice Get the most recently scanned tokens (up to RECENT_TOKENS_SIZE)
    function getRecentTokens() external view returns (address[] memory recent) {
        uint256 filled = _recentTokensFilled;
        recent = new address[](filled);

        // Walk backwards from head to get newest-first order
        uint256 head = _recentTokensHead;
        for (uint256 i = 0; i < filled; i++) {
            uint256 idx = (head + RECENT_TOKENS_SIZE - 1 - i) % RECENT_TOKENS_SIZE;
            recent[i] = _recentTokensRing[idx];
        }
    }
}
