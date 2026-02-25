import { ethers } from 'ethers';
import { PINIOSCAN_ABI } from './chain';
import type { PinioscanReport } from './types';

const BASE_RPC = 'https://mainnet.base.org';
const BASE_CHAIN_ID = 8453;

/**
 * Submit an attestation to the PinioScan contract on Base.
 * Runs server-side with the deployer key.
 */
export async function submitAttestation(
  report: PinioscanReport,
  contractAddress: string
): Promise<string> {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!privateKey) throw new Error('DEPLOYER_PRIVATE_KEY not set');
  if (!contractAddress) throw new Error('PINIOSCAN_CONTRACT_ADDRESS not set');

  const provider = new ethers.JsonRpcProvider(BASE_RPC, BASE_CHAIN_ID);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, PINIOSCAN_ABI, wallet);

  const reportJson = JSON.stringify({
    score: report.overallScore,
    riskLevel: report.riskLevel,
    summary: report.summary,
    categories: report.categories,
    flags: report.flags,
    recommendation: report.recommendation,
    timestamp: report.timestamp,
  });
  const reportCID = ethers.keccak256(ethers.toUtf8Bytes(reportJson));

  const tx = await contract.submitAttestation(
    report.token.address,
    report.overallScore,
    report.riskLevel,
    reportCID
  );

  const receipt = await tx.wait();
  return receipt.hash;
}
