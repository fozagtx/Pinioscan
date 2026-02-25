import { ethers } from "ethers";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import "dotenv/config";

// Compile with solc
console.log("Compiling PinioScan.sol...");
const solcOutput = execSync(
  `npx solcjs --optimize --bin --abi --base-path . contracts/PinioScan.sol -o build/`,
  { encoding: "utf-8" }
);
console.log("Compiled.");

// Read artifacts
const bin = readFileSync("build/contracts_PinioScan_sol_PinioScan.bin", "utf-8");
const abi = JSON.parse(readFileSync("build/contracts_PinioScan_sol_PinioScan.abi", "utf-8"));

const NETWORK = process.argv[2] || "mainnet";
const BASE_RPC = "https://mainnet.base.org";
const BASE_CHAIN_ID = 8453;

async function main() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC, BASE_CHAIN_ID);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`\nNetwork: Base (chain ${BASE_CHAIN_ID})`);
  console.log("Deployer:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("\n❌ No gas! Bridge ETH to Base at https://bridge.base.org");
    process.exit(1);
  }

  console.log("\nDeploying...");
  const factory = new ethers.ContractFactory(abi, "0x" + bin, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ PinioScan deployed to:", address);
  console.log(`\nExplorer: https://basescan.org/address/${address}`);
  console.log(`\nAdd to .env:\nPINIOSCAN_CONTRACT_ADDRESS=${address}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
