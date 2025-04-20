import * as dotenv from "dotenv";
dotenv.config();
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "hardhat-deploy-ethers";

// Optional: if you're using a script to generate TypeScript ABIs
// import generateTsAbis from "./scripts/generateTsAbis";

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

const providerApiKey = process.env.ALCHEMY_API_KEY || "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";
const etherscanApiKey = process.env.ETHERSCAN_MAINNET_API_KEY || "DNXJA8RX2Q3VZ4URQIWP7Z68CJXQZSC6AW";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "sepolia",
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  networks: {
    sepolia: {
      // url: `https://eth-sepolia.g.alchemy.com/v2/oKxs-03sij-U_N0iOlrSsZFr29-IqbuF`,
      url: 'https://eth-sepolia.public.blastapi.io',
      accounts: [deployerPrivateKey],
    },
  },
  // etherscan: {
  //   apiKey: `${etherscanApiKey}`,
  // },
  etherscan: {
    apiKey: {
      'sepolia': 'empty'
    },
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://eth-sepolia.blockscout.com/api",
          browserURL: "https://eth-sepolia.blockscout.com"
        }
      }
    ]
  },
  // verify: {
  //   etherscan: {
  //     apiKey: `${etherscanApiKey}`,
  //   },
  // },
  sourcify: {
    enabled: false,
  },
};

task("deploy").setAction(async (args, hre, runSuper) => {
  await runSuper(args);
  // await generateTsAbis(hre); // Uncomment if you're using ABI generation
});

export default config;
