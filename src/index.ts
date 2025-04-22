// Import necessary dependencies
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createPublicClient, createWalletClient, formatUnits, http, parseUnits, parseEventLogs, ParseEventLogsReturnType,getAddress } from "viem";
import { monadTestnet } from "viem/chains";

import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

// Load environment variables from .env file
const envPath = "/home/username/monad-mpc-mission/.env";
console.error(`[DEBUG] Loading .env file from: ${envPath}`);
dotenv.config({ path: envPath });

// Validate environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`; // Assert type as 0x${string}
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found in .env file");
}

// Validate PRIVATE_KEY format
if (!PRIVATE_KEY.startsWith("0x")) {
    throw new Error("PRIVATE_KEY must start with 0x");
}

// Create a public client to interact with the Monad testnet
const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(MONAD_RPC_URL),
});

// Create a wallet client for signing transactions
const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(MONAD_RPC_URL),
});

// Placeholder addresses (replace with actual addresses)
const WETH_ADDRESS = "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37" as `0x${string}`; 
const COVENANT_ADDRESS = "0x1d30392503203dd42f5516B32dACA6b2e11F71d7" as `0x${string}`; 
let WETHX2_ADDRESS: string | null = null; // Explicitly typed as string | null
let DEBT_TOKEN_ADDRESS: string | null = null; // Explicitly typed as string | null
const MARKET_ID = 0; //  marketId 0 for WETHX2;



// Type for a parsed log with args
interface ParsedLog<T> {
    args?: T; 
}

interface MarketConfig {
    baseToken: string;
    quoteToken: string;
    aToken: string;
    zToken: string;
    oracle: string;
    liquidExchangeModel: string;
    duration: bigint;
}

interface MarketState {
    baseTokenSupply: bigint;
    updateTimestamp: bigint;
    baseTokenPrice: bigint;
    debtNotionalPrice: bigint;
    unlocked: boolean;
}

interface LexState {
    targetLTV: bigint;
    currentLTV: bigint;
    balancedDebtPriceDiscount: bigint;
    currentDebtPriceDiscount: bigint;
}

interface PreviewMintResult {
    aTokenAmountOut: bigint;
    zTokenAmountOut: bigint;
    afterDiscountPrice: bigint;
}

interface PreviewSwapResult {
    amountCalc: bigint;
    afterDiscountPrice: bigint;
}


// Type definitions for event arguments
interface MintEventArgs {
    marketId: bigint;
    baseAmountIn: bigint;
    sender: `0x${string}`;
    receiver: `0x${string}`;
    aTokenAmountOut: bigint;
    zTokenAmountOut: bigint;
    lexState: {
        baseTokenSupply: bigint;
        aTokenSupply: bigint;
        zTokenSupply: bigint;
        baseTokenPrice: bigint;
        debtNotionalPrice: bigint;
    };
    aTokenPrice: bigint;
    zTokenPrice: bigint;
}

interface SwapEventArgs {
    marketId: bigint;
    tokenAddressIn: `0x${string}`;
    tokenAddressOut: `0x${string}`;
    amountIn: bigint;
    amountOut: bigint;
    sender: `0x${string}`;
    receiver: `0x${string}`;
    lexState: {
        baseTokenSupply: bigint;
        aTokenSupply: bigint;
        zTokenSupply: bigint;
        baseTokenPrice: bigint;
        debtNotionalPrice: bigint;
    };
    aTokenPrice: bigint;
    zTokenPrice: bigint;
}

interface RedeemEventArgs {
    marketId: bigint;
    aTokenAmountIn: bigint;
    zTokenAmountIn: bigint;
    sender: `0x${string}`;
    receiver: `0x${string}`;
    amountOut: bigint;
    lexState: {
        baseTokenSupply: bigint;
        aTokenSupply: bigint;
        zTokenSupply: bigint;
        baseTokenPrice: bigint;
        debtNotionalPrice: bigint;
    };
    aTokenPrice: bigint;
    zTokenPrice: bigint;
}




// Standard ERC20 ABI for WETH, WETHX2, and debt token approvals
const erc20Abi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];


// Covenant Finance ABI 
const covenantAbi = [
    // Events
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "marketId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "baseAmountIn",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "receiver",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "aTokenAmountOut",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "zTokenAmountOut",
                "type": "uint256"
            },
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "baseTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "aTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "zTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "baseTokenPrice",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "debtNotionalPrice",
                        "type": "uint256"
                    }
                ],
                "indexed": false,
                "internalType": "struct LEXParams",
                "name": "lexState",
                "type": "tuple"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "aTokenPrice",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "zTokenPrice",
                "type": "uint256"
            }
        ],
        "name": "Mint",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "marketId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "aTokenAmountIn",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "zTokenAmountIn",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "receiver",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amountOut",
                "type": "uint256"
            },
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "baseTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "aTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "zTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "baseTokenPrice",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "debtNotionalPrice",
                        "type": "uint256"
                    }
                ],
                "indexed": false,
                "internalType": "struct LEXParams",
                "name": "lexState",
                "type": "tuple"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "aTokenPrice",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "zTokenPrice",
                "type": "uint256"
            }
        ],
        "name": "Redeem",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "marketId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "tokenAddressIn",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "tokenAddressOut",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amountIn",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amountOut",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "receiver",
                "type": "address"
            },
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "baseTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "aTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "zTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "baseTokenPrice",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "debtNotionalPrice",
                        "type": "uint256"
                    }
                ],
                "indexed": false,
                "internalType": "struct LEXParams",
                "name": "lexState",
                "type": "tuple"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "aTokenPrice",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "zTokenPrice",
                "type": "uint256"
            }
        ],
        "name": "Swap",
        "type": "event"
    },
    // Functions
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "marketId",
                "type": "uint256"
            },
            
            {
                "internalType": "bool",
                "name": "getRawState",
                "type": "bool"
            }
        ],
        
        "name": "getLexState",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "targetLTV",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "currentLTV",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "balancedDebtPriceDiscount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "currentDebtPriceDiscount",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct LexState",
                "name": "lexState",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTotalMarkets",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "marketId",
                "type": "uint256"
            }
        ],
        "name": "getMarketConfig",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "contract IERC20",
                        "name": "baseToken",
                        "type": "address"
                    },
                    {
                        "internalType": "contract IERC20",
                        "name": "quoteToken",
                        "type": "address"
                    },
                    {
                        "internalType": "contract ISynthToken",
                        "name": "aToken",
                        "type": "address"
                    },
                    {
                        "internalType": "contract ISynthToken",
                        "name": "zToken",
                        "type": "address"
                    },
                    {
                        "internalType": "contract IPriceOracle",
                        "name": "oracle",
                        "type": "address"
                    },
                    {
                        "internalType": "contract ILiquidExchangeModel",
                        "name": "liquidExchangeModel",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "duration",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct MarketConfig",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "marketId",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "getRawState",
                "type": "bool"
            }
        ],
        "name": "getMarketState",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "baseTokenSupply",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "updateTimestamp",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "baseTokenPrice",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "debtNotionalPrice",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bool",
                        "name": "unlocked",
                        "type": "bool"
                    }
                ],
                "internalType": "struct MarketState",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "marketId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "baseAmountIn",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "onBehalfOf",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "minATokenAmountOut",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "minZTokenAmountOut",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct MintParams",
                "name": "mintParams",
                "type": "tuple"
            }
        ],
        "name": "mint",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "aTokenAmountOut",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "zTokenAmountOut",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "marketId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "baseAmountIn",
                "type": "uint256"
            }
        ],
        "name": "previewMint",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "aTokenAmountOut",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "zTokenAmountOut",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "afterDiscountPrice",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "marketId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "assetIn",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "assetOut",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amountSpecified",
                "type": "uint256"
            },
            {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
            }
        ],
        "name": "previewSwap",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "amountCalc",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "afterDiscountPrice",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "marketId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "aTokenAmountIn",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "zTokenAmountIn",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "onBehalfOf",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "minAmountOut",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct RedeemParams",
                "name": "redeemParams",
                "type": "tuple"
            }
        ],
        "name": "redeem",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "amountOut",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "marketId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "assetIn",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "assetOut",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "onBehalfOf",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amountLimit",
                        "type": "uint256"
                    },
                    {
                        "internalType": "enum SwapType",
                        "name": "swapType",
                        "type": "uint8"
                    }
                ],
                "internalType": "struct SwapParams",
                "name": "swapParams",
                "type": "tuple"
            }
        ],
        "name": "swap",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];


// Initialize the MCP server
const server = new McpServer({
    name: "covenant-finance-strategy",
    version: "0.0.1",
    capabilities: ["initialize-token-addresses", "check-weth-balance-and-allocate", "fetch-leverage-and-debt-rate", "mint-positions",
         "trade-on-dex","rebalance-market-sentiment", "exit-positions",  "list-markets", "calculate-profit-loss","assess-liquidation-risk",
         "suggest-strategy", ],
});
console.error("[DEBUG] McpServer initialized");

// Helper function to fetch token addresses
async function fetchTokenAddresses(): Promise<{ WETHX2_ADDRESS: string; DEBT_TOKEN_ADDRESS: string }> {
    try {
        const marketConfig = await publicClient.readContract({
            address: COVENANT_ADDRESS,
            abi: covenantAbi,
            functionName: "getMarketConfig",
            args: [MARKET_ID],
        }) as MarketConfig;

        WETHX2_ADDRESS = marketConfig.aToken; // aToken
        DEBT_TOKEN_ADDRESS = marketConfig.zToken; // zToken

        if (!WETHX2_ADDRESS || !DEBT_TOKEN_ADDRESS) {
            throw new Error("Failed to fetch valid token addresses");
        }

        return { WETHX2_ADDRESS, DEBT_TOKEN_ADDRESS };
    } catch (error) {
        throw new Error(`Failed to fetch token addresses: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Helper function to approve tokens
async function approveToken(tokenAddress: string, amount: string): Promise<void> {
    const formattedAmount = parseUnits(amount, 18);
    const approveTx = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`, // Assert the address as 0x${string}
        abi: erc20Abi,
        functionName: "approve",
        args: [COVENANT_ADDRESS, formattedAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
}

// Step 0: Initialize token addresses
server.tool(
    "initialize-token-addresses",
    "Fetch WETHX2 and debt token addresses for the market",
    {},
    async () => {
        try {
            const { WETHX2_ADDRESS: wethx2, DEBT_TOKEN_ADDRESS: debt } = await fetchTokenAddresses();
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully fetched token addresses:\n` +
                              `WETHX2 Address: ${wethx2}\n` +
                              `Debt Token Address: ${debt}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to fetch token addresses. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

// Step 1: Check WETH balance and allocate funds
server.tool(
    "check-weth-balance-and-allocate",
    "Check WETH balance on Monad testnet and suggest allocation for leveraged trading and debt",
    {
        address: z.string().describe("Your Monad testnet address"),
        leveragedPercentage: z.number().default(60).describe("Percentage of funds for leveraged trading (default: 60%)"),
    },
    async ({ address, leveragedPercentage }) => {
        try {
            const balance = await publicClient.readContract({
                address: WETH_ADDRESS,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            const formattedBalance = formatUnits(balance, 18);
            const leveragedAmount = (parseFloat(formattedBalance) * leveragedPercentage) / 100;
            const debtAmount = parseFloat(formattedBalance) - leveragedAmount;

            // Fetch prices for better allocation
            const marketState = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketState",
                args: [MARKET_ID, false],
            }) as MarketState;

            const baseTokenPrice = formatUnits(marketState.baseTokenPrice, 18);
            const debtNotionalPrice = formatUnits(marketState.debtNotionalPrice, 18);

            return {
                content: [
                    {
                        type: "text",
                        text: `WETH Balance for ${address}: ${formattedBalance} WETH\n` +
                              `Current Prices:\n` +
                              `- WETH Price: ${baseTokenPrice} USD\n` +
                              `- Debt Notional Price: ${debtNotionalPrice} USD\n` +
                              `Suggested Allocation:\n` +
                              `- Leveraged Trading (WETHX2): ${leveragedAmount} WETH (${leveragedPercentage}%)\n` +
                              `- Debt Position: ${debtAmount} WETH (${100 - leveragedPercentage}%)`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve WETH balance or prices for address: ${address}. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

// Step 1.5: Fetch leverage ratio and debt rate
server.tool(
    "fetch-leverage-and-debt-rate",
    "Fetch the current leverage ratio of WETHX2 and the debt rate for the market",
    {
        marketId: z.number().default(0).describe("Market ID to fetch data for (default: 0)"),
    },
    async ({ marketId }) => {
        try {
            // Fetch LexState to get currentLTV and debt price discount
            const lexState = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getLexState",
                args: [marketId, false],
            }) as LexState;

            // Fetch MarketState to get prices
            const marketState = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketState",
                args: [marketId, false],
            }) as MarketState;

            // Calculate leverage ratio: Leverage = 1 / (1 - LTV)
            const currentLTV = Number(lexState.currentLTV) / 10000; // currentLTV is in basis points (e.g., 5000 = 50%)
            const leverageRatio = (1 / (1 - currentLTV)).toFixed(2);

            // Estimate debt rate: Debt rate is related to currentDebtPriceDiscount
            const debtRate = (Number(lexState.currentDebtPriceDiscount) / 10000).toFixed(2); // currentDebtPriceDiscount in percentage

            // Fetch prices
            const baseTokenPrice = formatUnits(marketState.baseTokenPrice, 18);
            const debtNotionalPrice = formatUnits(marketState.debtNotionalPrice, 18);

            return {
                content: [
                    {
                        type: "text",
                        text: `Market Data for Market ID ${marketId}:\n` +
                              `Current Leverage Ratio (WETHX2): ${leverageRatio}x\n` +
                              `Current Debt Rate: ${debtRate}%\n` +
                              `WETH Price: ${baseTokenPrice} USD\n` +
                              `Debt Notional Price: ${debtNotionalPrice} USD`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to fetch leverage and debt rate for market ${marketId}. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "mint-positions",
    "Mint aTokens and zTokens on Covenant Finance",
    {
        address: z.string().describe("Your Monad testnet address"),
        marketId: z.number().describe("Market ID to mint positions for"),
        amount: z.string().describe("Amount of base token to deposit for minting (e.g., '10' for 10 WETH)"),
        minATokenAmountOut: z.string().optional().describe("Minimum aTokens to receive (optional; calculated if not provided)"),
        minZTokenAmountOut: z.string().optional().describe("Minimum zTokens to receive (optional; calculated if not provided)"),
        slippageTolerance: z.number().default(1).describe("Slippage tolerance percentage (default: 1%)"),
    },
    async ({ address, marketId, amount, minATokenAmountOut, minZTokenAmountOut, slippageTolerance }) => {
        try {
            // Fetch market config to get token addresses
            const marketConfig = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketConfig",
                args: [marketId],
            }) as MarketConfig;

            const baseTokenAddress = marketConfig.baseToken;
            const aTokenAddress = marketConfig.aToken;
            const zTokenAddress = marketConfig.zToken;

            if (!baseTokenAddress || !aTokenAddress || !zTokenAddress) {
                throw new Error(`Failed to fetch token addresses for Market ID ${marketId}`);
            }

            // Check if the market is unlocked
            const marketState = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketState",
                args: [marketId, false],
            }) as MarketState;

            if (!marketState.unlocked) {
                throw new Error(`Market ID ${marketId} is locked. Minting is not allowed.`);
            }

            const formattedAmount = parseUnits(amount, 18);

            // Check base token balance
            const baseTokenBalance = await publicClient.readContract({
                address: baseTokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            if (baseTokenBalance < formattedAmount) {
                throw new Error(
                    `Insufficient base token balance. Required: ${amount}, Available: ${formatUnits(baseTokenBalance, 18)}`
                );
            }

            // Check allowance and approve if necessary
            const allowance = await publicClient.readContract({
                address: baseTokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "allowance",
                args: [address, COVENANT_ADDRESS],
            }) as bigint;

            if (allowance < formattedAmount) {
                const approveGasEstimate = await publicClient.estimateContractGas({
                    address: baseTokenAddress as `0x${string}`,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [COVENANT_ADDRESS, formattedAmount],
                    account: walletClient.account,
                });

                const approveGasLimit = (approveGasEstimate * BigInt(120)) / BigInt(100); // 20% buffer

                const approveTx = await walletClient.writeContract({
                    address: baseTokenAddress as `0x${string}`,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [COVENANT_ADDRESS, formattedAmount],
                    gas: approveGasLimit,
                });

                await publicClient.waitForTransactionReceipt({ hash: approveTx });
            }

            // Preview mint to estimate output amounts
            const preview = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "previewMint",
                args: [marketId, formattedAmount],
            }) as PreviewMintResult;

            const expectedAToken = formatUnits(preview.aTokenAmountOut, 18);
            const expectedZToken = formatUnits(preview.zTokenAmountOut, 18);
            const afterDiscountPrice = formatUnits(preview.afterDiscountPrice, 18);

            // Calculate minimum amounts with slippage tolerance
            const slippageFactor = 1 - slippageTolerance / 100;
            const calculatedMinAToken = parseUnits(
                (parseFloat(expectedAToken) * slippageFactor).toFixed(18),
                18
            );
            const calculatedMinZToken = parseUnits(
                (parseFloat(expectedZToken) * slippageFactor).toFixed(18),
                18
            );

            const formattedMinAToken = minATokenAmountOut
                ? parseUnits(minATokenAmountOut, 18)
                : calculatedMinAToken;
            const formattedMinZToken = minZTokenAmountOut
                ? parseUnits(minZTokenAmountOut, 18)
                : calculatedMinZToken;

            // Prepare mint parameters
            const mintParams = {
                marketId: BigInt(marketId),
                baseAmountIn: formattedAmount,
                onBehalfOf: address,
                to: address,
                minATokenAmountOut: formattedMinAToken,
                minZTokenAmountOut: formattedMinZToken,
            };

            // Estimate gas for mint
            const gasEstimate = await publicClient.estimateContractGas({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "mint",
                args: [mintParams],
                account: walletClient.account,
            });

            const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100); // 20% buffer

            // Execute the mint transaction
            const mintTx = await walletClient.writeContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "mint",
                args: [mintParams],
                gas: gasLimit,
            });

            // Wait for transaction receipt and parse Mint event
            const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });

            // Use Viem's parseEventLogs to extract the Mint event
            const mintLogs = parseEventLogs({
                abi: covenantAbi,
                eventName: "Mint",
                logs: receipt.logs,
            }) as ParsedLog<MintEventArgs>[];

            let actualATokenAmount = "0";
            let actualZTokenAmount = "0";
            let aTokenPrice = "0";
            let zTokenPrice = "0";

            if (mintLogs.length > 0) {
                const mintLog = mintLogs[0]; // Take the first matching Mint event
                if (mintLog.args && "aTokenAmountOut" in mintLog.args && "zTokenAmountOut" in mintLog.args) {
                    actualATokenAmount = formatUnits(mintLog.args.aTokenAmountOut, 18);
                    actualZTokenAmount = formatUnits(mintLog.args.zTokenAmountOut, 18);
                    aTokenPrice = formatUnits(mintLog.args.aTokenPrice, 18);
                    zTokenPrice = formatUnits(mintLog.args.zTokenPrice, 18);
                } else {
                    console.warn("Mint event does not contain expected arguments (aTokenAmountOut or zTokenAmountOut). Fetching balances as fallback.");
                    // Fallback: Fetch balances to infer amounts
                    const aTokenBalanceAfter = await publicClient.readContract({
                        address: aTokenAddress as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "balanceOf",
                        args: [address],
                    }) as bigint;

                    const zTokenBalanceAfter = await publicClient.readContract({
                        address: zTokenAddress as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "balanceOf",
                        args: [address],
                    }) as bigint;

                    actualATokenAmount = formatUnits(aTokenBalanceAfter, 18);
                    actualZTokenAmount = formatUnits(zTokenBalanceAfter, 18);

                    // Fetch market state for prices as a fallback
                    const updatedMarketState = await publicClient.readContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "getMarketState",
                        args: [marketId, false],
                    }) as MarketState;

                    aTokenPrice = formatUnits(updatedMarketState.baseTokenPrice, 18);
                    zTokenPrice = formatUnits(updatedMarketState.debtNotionalPrice, 18);
                }
            } else {
                console.warn("Mint event not found in transaction receipt. Fetching balances as fallback.");
                // Fallback: Fetch balances to infer amounts
                const aTokenBalanceAfter = await publicClient.readContract({
                    address: aTokenAddress as `0x${string}`,
                    abi: erc20Abi,
                    functionName: "balanceOf",
                    args: [address],
                }) as bigint;

                const zTokenBalanceAfter = await publicClient.readContract({
                    address: zTokenAddress as `0x${string}`,
                    abi: erc20Abi,
                    functionName: "balanceOf",
                    args: [address],
                }) as bigint;

                actualATokenAmount = formatUnits(aTokenBalanceAfter, 18);
                actualZTokenAmount = formatUnits(zTokenBalanceAfter, 18);

                // Fetch market state for prices as a fallback
                const updatedMarketState = await publicClient.readContract({
                    address: COVENANT_ADDRESS,
                    abi: covenantAbi,
                    functionName: "getMarketState",
                    args: [marketId, false],
                }) as MarketState;

                aTokenPrice = formatUnits(updatedMarketState.baseTokenPrice, 18);
                zTokenPrice = formatUnits(updatedMarketState.debtNotionalPrice, 18);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully minted tokens for Market ID ${marketId}!\n` +
                              `Base Token Deposited: ${amount} tokens\n` +
                              `Estimated aTokens: ${expectedAToken}\n` +
                              `Estimated zTokens: ${expectedZToken}\n` +
                              `Actual aTokens Received: ${actualATokenAmount}\n` +
                              `Actual zTokens Received: ${actualZTokenAmount}\n` +
                              `aToken Price: ${aTokenPrice} USD\n` +
                              `zToken Price: ${zTokenPrice} USD\n` +
                              `After Discount Price: ${afterDiscountPrice} USD\n` +
                              `Transaction Hash: ${mintTx}`
                    },
                ],
            };
        } catch (error) {
            console.error("Error minting positions:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to mint positions for Market ID ${marketId} for address: ${address}. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

// Step 4: Trade on the internal DEX
server.tool(
    "trade-on-dex",
    "Check WETHX2 and debt token prices and execute trading on Covenant Finance's DEX",
    {
        address: z.string().describe("Your Monad testnet address"),
        token: z.enum(["WETHX2", "Debt"]).describe("Token to trade (WETHX2 or Debt)"),
        action: z.enum(["buy", "sell"]).describe("Action to perform (buy or sell)"),
        amount: z.string().describe("Amount of tokens to trade"),
        amountLimit: z.string().default("0").describe("Minimum amount to receive (buy) or maximum to spend (sell)"),
    },
    async ({ address, token, action, amount, amountLimit }) => {
        try {
            // Validate input amounts
            if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                throw new Error("Invalid amount. Please provide a positive number as a string (e.g., '1.0').");
            }
            if (isNaN(parseFloat(amountLimit)) || parseFloat(amountLimit) < 0) {
                throw new Error("Invalid amountLimit. Please provide a non-negative number as a string (e.g., '0').");
            }

            // Validate MARKET_ID
            if (typeof MARKET_ID === "undefined" || MARKET_ID === null) {
                throw new Error("MARKET_ID is not defined. Please set a valid market ID.");
            }
            const marketIdBigInt = BigInt(MARKET_ID); // Ensure MARKET_ID is a bigint

            // Fetch token addresses if not set
            if (!WETH_ADDRESS || !WETHX2_ADDRESS || !DEBT_TOKEN_ADDRESS) {
                await fetchTokenAddresses();
            }

            // Validate token addresses
            if (!WETH_ADDRESS) {
                throw new Error("WETH_ADDRESS is not set. Please ensure fetchTokenAddresses() retrieves the correct address.");
            }
            if (!WETHX2_ADDRESS) {
                throw new Error("WETHX2_ADDRESS is not set. Please ensure fetchTokenAddresses() retrieves the correct address.");
            }
            if (!DEBT_TOKEN_ADDRESS) {
                throw new Error("DEBT_TOKEN_ADDRESS is not set. Please ensure fetchTokenAddresses() retrieves the correct address.");
            }

            const formattedAmount = parseUnits(amount, 18);
            const formattedAmountLimit = parseUnits(amountLimit, 18);

            // Check WETH balance (if buying)
            if (action === "buy") {
                const wethBalance = await publicClient.readContract({
                    address: WETH_ADDRESS as `0x${string}`,
                    abi: erc20Abi,
                    functionName: "balanceOf",
                    args: [address],
                }) as bigint;

                if (wethBalance < formattedAmount) {
                    throw new Error(`Insufficient WETH balance. Required: ${formatUnits(formattedAmount, 18)} WETH, Available: ${formatUnits(wethBalance, 18)} WETH`);
                }
            }

            // Determine assetIn and assetOut
            const assetIn = action === "buy" ? WETH_ADDRESS : (token === "WETHX2" ? WETHX2_ADDRESS : DEBT_TOKEN_ADDRESS);
            const assetOut = action === "buy" ? (token === "WETHX2" ? WETHX2_ADDRESS : DEBT_TOKEN_ADDRESS) : WETH_ADDRESS;
            const swapType = 0; // 0 for exact amount in (assumption)

            // Log the swap details for debugging
            console.log("Swap Details:");
            console.log(`Action: ${action}`);
            console.log(`Token: ${token}`);
            console.log(`Asset In: ${assetIn}`);
            console.log(`Asset Out: ${assetOut}`);
            console.log(`Amount: ${amount} (${formattedAmount.toString()})`);
            console.log(`Amount Limit: ${amountLimit} (${formattedAmountLimit.toString()})`);

            // Preview the swap
            const preview = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "previewSwap",
                args: [marketIdBigInt, assetIn, assetOut, formattedAmount, swapType],
            }) as [bigint, bigint]; // [amountCalc, afterDiscountPrice]

            if (!preview || !preview[0]) {
                throw new Error("Failed to preview swap. The previewSwap call did not return the expected result.");
            }

            const amountCalc = formatUnits(preview[0], 18); // amountCalc is the first element
            console.log(`Preview Swap Result - Estimated Amount Out: ${amountCalc} tokens`);

            // Approve tokens for swapping
            await approveToken(assetIn, formatUnits(formattedAmount, 18));

            // Execute swap
            const swapParams = [
                marketIdBigInt, // marketId
                assetIn, // assetIn
                assetOut, // assetOut
                address, // onBehalfOf
                address, // to
                formattedAmount, // amount
                formattedAmountLimit, // amountLimit
                swapType, // swapType
            ];

            console.log("swapParams:", swapParams);
            console.log("swapParams Types:", swapParams.map(param => typeof param));

            const gasEstimate = await publicClient.estimateContractGas({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "swap",
                args: [swapParams], // Pass as a single tuple
                account: walletClient.account,
            });

            const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100); // 20% buffer
            console.log(`Gas Estimate: ${gasEstimate.toString()}, Gas Limit: ${gasLimit.toString()}`);

            const swapTx = await walletClient.writeContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "swap",
                args: [swapParams], // Pass as a single tuple
                gas: gasLimit,
            });

            // Wait for transaction receipt and parse Swap event
            const receipt = await publicClient.waitForTransactionReceipt({ hash: swapTx });
            const swapLogs = parseEventLogs({
                abi: covenantAbi,
                eventName: "Swap",
                logs: receipt.logs,
            }) as ParsedLog<SwapEventArgs>[];

            let actualAmountOut = "0";

            if (swapLogs.length > 0) {
                const swapLog = swapLogs[0]; // Take the first matching Swap event
                if (swapLog.args && "amountOut" in swapLog.args) {
                    actualAmountOut = formatUnits(swapLog.args.amountOut, 18);
                } else {
                    throw new Error("Swap event does not contain expected arguments (amountOut)");
                }
            } else {
                throw new Error("Swap event not found in transaction receipt");
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Estimated amount out: ${amountCalc} tokens\n` +
                              `Actual amount out: ${actualAmountOut} tokens\n` +
                              `Successfully ${action}ed ${amount} ${token} for address ${address}.\n` +
                              `Transaction Hash: ${swapTx}`,
                    },
                ],
            };
        } catch (error) {
            console.error("Error trading on DEX:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to trade ${token} for address: ${address}. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "rebalance-market-sentiment",
    "Rebalance portfolio based on bullish or bearish WETH market sentiment, if bullish swap total balance of zToken to aToken and if bearish swap total balance of aToken to zToken",
    {
        address: z.string().describe("Your Monad testnet address"),
        marketSentiment: z.enum(["Bullish", "Bearish"]).describe("Your WETH market sentiment"),
    },
    async ({ address, marketSentiment }) => {
        try {
            // Ensure token addresses are fetched
            if (!WETHX2_ADDRESS || !DEBT_TOKEN_ADDRESS) {
                await fetchTokenAddresses();
            }

            // Validate token addresses
            if (!WETHX2_ADDRESS || !DEBT_TOKEN_ADDRESS) {
                throw new Error("WETHX2_ADDRESS or DEBT_TOKEN_ADDRESS is not set");
            }

            // Get user's token balances
            const wethx2Balance = await publicClient.readContract({
                address: WETHX2_ADDRESS as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            const debtBalance = await publicClient.readContract({
                address: DEBT_TOKEN_ADDRESS as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            let txHash = "";
            let message = "";
            let amountProcessed = "0";

            if (marketSentiment === "Bearish" && wethx2Balance > 0n) {
                // Bearish: Swap WETHX2 to debt tokens
                const formattedWethx2 = wethx2Balance;
                amountProcessed = formatUnits(formattedWethx2, 18);

                // Approve WETHX2 tokens
                await approveToken(WETHX2_ADDRESS, amountProcessed);

                // Redeem WETHX2 to debt tokens
                const redeemParams = [
                    MARKET_ID,
                    formattedWethx2, // aTokenAmountIn
                    BigInt(0), // zTokenAmountIn
                    address,
                    address,
                    BigInt(0), // minAmountOut
                ];

                const redeemTx = await walletClient.writeContract({
                    address: COVENANT_ADDRESS,
                    abi: covenantAbi,
                    functionName: "redeem",
                    args: [redeemParams],
                });

                const redeemReceipt = await publicClient.waitForTransactionReceipt({ hash: redeemTx });
                const redeemLogs = parseEventLogs({
                    abi: covenantAbi,
                    eventName: "Redeem",
                    logs: redeemReceipt.logs,
                }) as ParsedLog<RedeemEventArgs>[];

                if (redeemLogs.length === 0) {
                    throw new Error("Redeem event not found in transaction receipt");
                }

                const redeemLog = redeemLogs[0];
                if (!redeemLog.args || !("amountOut" in redeemLog.args)) {
                    throw new Error("Redeem event does not contain expected amountOut");
                }

                const debtReceived = formatUnits(redeemLog.args.amountOut, 18);
                txHash = redeemTx;
                message = `Successfully converted ${amountProcessed} WETHX2 to ${debtReceived} debt tokens for bearish rebalance.`;
            } else if (marketSentiment === "Bullish" && debtBalance > 0n) {
                // Bullish: Swap debt tokens to WETHX2
                const formattedDebt = debtBalance;
                amountProcessed = formatUnits(formattedDebt, 18);

                // Approve debt tokens
                await approveToken(DEBT_TOKEN_ADDRESS, amountProcessed);

                // Redeem debt tokens to WETH
                const redeemParams = [
                    MARKET_ID,
                    BigInt(0), // aTokenAmountIn
                    formattedDebt, // zTokenAmountIn
                    address,
                    address,
                    BigInt(0), // minAmountOut
                ];

                const redeemTx = await walletClient.writeContract({
                    address: COVENANT_ADDRESS,
                    abi: covenantAbi,
                    functionName: "redeem",
                    args: [redeemParams],
                });

                const redeemReceipt = await publicClient.waitForTransactionReceipt({ hash: redeemTx });
                const redeemLogs = parseEventLogs({
                    abi: covenantAbi,
                    eventName: "Redeem",
                    logs: redeemReceipt.logs,
                }) as ParsedLog<RedeemEventArgs>[];

                if (redeemLogs.length === 0) {
                    throw new Error("Redeem event not found in transaction receipt");
                }

                const redeemLog = redeemLogs[0];
                if (!redeemLog.args || !("amountOut" in redeemLog.args)) {
                    throw new Error("Redeem event does not contain expected amountOut");
                }

                const wethReceived = formatUnits(redeemLog.args.amountOut, 18);

                // Approve WETH for minting WETHX2
                await approveToken(WETH_ADDRESS, wethReceived);

                const mintParams = [
                    MARKET_ID,
                    parseUnits(wethReceived, 18),
                    address,
                    address,
                    BigInt(0), // minATokenAmountOut
                    BigInt(0), // minZTokenAmountOut
                ];

                const mintTx = await walletClient.writeContract({
                    address: COVENANT_ADDRESS,
                    abi: covenantAbi,
                    functionName: "mint",
                    args: [mintParams],
                });

                const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
                const mintLogs = parseEventLogs({
                    abi: covenantAbi,
                    eventName: "Mint",
                    logs: mintReceipt.logs,
                }) as ParsedLog<MintEventArgs>[];

                if (mintLogs.length === 0) {
                    throw new Error("Mint event not found in transaction receipt");
                }

                const mintLog = mintLogs[0];
                if (!mintLog.args || !("aTokenAmountOut" in mintLog.args)) {
                    throw new Error("Mint event does not contain expected aTokenAmountOut");
                }

                const wethx2Received = formatUnits(mintLog.args.aTokenAmountOut, 18);
                txHash = mintTx;
                message = `Successfully converted ${amountProcessed} debt tokens to ${wethx2Received} WETHX2 tokens for bullish rebalance.`;
            } else {
                return {
                    content: [{
                        type: "text",
                        text: `No action taken: ${marketSentiment === "Bullish" ? "No debt tokens available" : "No WETHX2 tokens available"} for address ${address}.`
                    }]
                };
            }

            return {
                content: [{
                    type: "text",
                    text: `${message}\nTx Hash: ${txHash}`
                }]
            };
        } catch (error) {
            console.error("Error rebalancing:", error);
            return {
                content: [{
                    type: "text",
                    text: `Failed to rebalance for address: ${address}. Error: ${error instanceof Error ? error.message : String(error)}`
                }]
            };
        }
    }
);

// Step 6: Exit positions
server.tool(
    "exit-positions",
    "Redeem WETHX2 and debt tokens to WETH",
    {
        address: z.string().describe("Your Monad testnet address"),
        wethx2Amount: z.string().describe("Amount of WETHX2 to redeem"),
        debtAmount: z.string().describe("Amount of debt tokens to redeem"),
        minAmountOut: z.string().default("0").describe("Minimum WETH to receive"),
    },
    async ({ address, wethx2Amount, debtAmount, minAmountOut }) => {
        try {
            if (!WETHX2_ADDRESS || !DEBT_TOKEN_ADDRESS) {
                await fetchTokenAddresses();
            }

            const formattedWethx2Amount = parseUnits(wethx2Amount, 18);
            const formattedDebtAmount = parseUnits(debtAmount, 18);
            const formattedMinAmountOut = parseUnits(minAmountOut, 18);

            // Approve WETHX2 and debt tokens for redemption
            if (parseFloat(wethx2Amount) > 0) {
                await approveToken(WETHX2_ADDRESS!, wethx2Amount);
            }
            if (parseFloat(debtAmount) > 0) {
                await approveToken(DEBT_TOKEN_ADDRESS!, debtAmount);
            }

            // Redeem WETHX2 and debt tokens
            const redeemParams = [
                MARKET_ID, // marketId
                formattedWethx2Amount, // aTokenAmountIn
                formattedDebtAmount, // zTokenAmountIn
                address, // onBehalfOf
                address, // to
                formattedMinAmountOut, // minAmountOut
            ];

            const redeemTx = await walletClient.writeContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "redeem",
                args: [redeemParams],
            });

            // Wait for transaction receipt and parse Redeem event
            const redeemReceipt = await publicClient.waitForTransactionReceipt({ hash: redeemTx });
            const redeemLogs = parseEventLogs({
                abi: covenantAbi,
                eventName: "Redeem",
                logs: redeemReceipt.logs,
            }) as ParsedLog<RedeemEventArgs>[];

            let wethReceived = "0";

            if (redeemLogs.length > 0) {
                const redeemLog = redeemLogs[0]; // Take the first matching Redeem event
                if (redeemLog.args && "amountOut" in redeemLog.args) {
                    wethReceived = formatUnits(redeemLog.args.amountOut, 18);
                } else {
                    throw new Error("Redeem event does not contain expected arguments (amountOut)");
                }
            } else {
                throw new Error("Redeem event not found in transaction receipt");
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully exited positions!\n` +
                              `Redeemed ${wethx2Amount} WETHX2 and ${debtAmount} debt tokens for ${wethReceived} WETH.\n` +
                              `Address: ${address}\n` +
                              `Transaction Hash: ${redeemTx}`,
                    },
                ],
            };
        } catch (error) {
            console.error("Error exiting positions:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to exit positions for address: ${address}. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "list-markets",
    "List available markets on Covenant Finance",
    {},
    async () => {
        try {
            // Fetch the total number of markets
            const totalMarkets = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getTotalMarkets",
                args: [],
            }) as bigint;

            const markets: string[] = [];
            const totalMarketsNumber = Number(totalMarkets);

            // Iterate over all market IDs from 0 to totalMarkets - 1
            for (let i = 0; i < totalMarketsNumber; i++) {
                try {
                    const marketConfig = await publicClient.readContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "getMarketConfig",
                        args: [i],
                    }) as MarketConfig;

                    // Fetch the market state to check if it's unlocked
                    const marketState = await publicClient.readContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "getMarketState",
                        args: [i, false],
                    }) as MarketState;

                    // Fetch token names for base token, quote token, aToken, and zToken
                    let baseTokenName = "Unknown";
                    let quoteTokenName = "Unknown";
                    let aTokenName = "Unknown";
                    let zTokenName = "Unknown";

                    try {
                        baseTokenName = await publicClient.readContract({
                            address: marketConfig.baseToken as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "name",
                            args: [],
                        }) as string;
                    } catch (error) {
                        console.warn(`Failed to fetch name for base token ${marketConfig.baseToken}: ${error instanceof Error ? error.message : String(error)}`);
                    }

                    try {
                        quoteTokenName = await publicClient.readContract({
                            address: marketConfig.quoteToken as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "name",
                            args: [],
                        }) as string;
                    } catch (error) {
                        console.warn(`Failed to fetch name for quote token ${marketConfig.quoteToken}: ${error instanceof Error ? error.message : String(error)}`);
                    }

                    try {
                        aTokenName = await publicClient.readContract({
                            address: marketConfig.aToken as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "name",
                            args: [],
                        }) as string;
                    } catch (error) {
                        console.warn(`Failed to fetch name for aToken ${marketConfig.aToken}: ${error instanceof Error ? error.message : String(error)}`);
                    }

                    try {
                        zTokenName = await publicClient.readContract({
                            address: marketConfig.zToken as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "name",
                            args: [],
                        }) as string;
                    } catch (error) {
                        console.warn(`Failed to fetch name for zToken ${marketConfig.zToken}: ${error instanceof Error ? error.message : String(error)}`);
                    }

                    // Format the market details with token names
                    markets.push(
                        `Market ID: ${i}\n` +
                        `Base Token: ${baseTokenName} (${marketConfig.baseToken})\n` +
                        `Quote Token: ${quoteTokenName} (${marketConfig.quoteToken})\n` +
                        `aToken (Leverage): ${aTokenName} (${marketConfig.aToken})\n` +
                        `zToken (Debt): ${zTokenName} (${marketConfig.zToken})\n` +
                        `Oracle: ${marketConfig.oracle}\n` +
                        `Liquid Exchange Model: ${marketConfig.liquidExchangeModel}\n` +
                        `Debt Duration: ${marketConfig.duration.toString()} seconds\n` +
                        `Unlocked: ${marketState.unlocked}\n` +
                        `Base Token Price: ${formatUnits(marketState.baseTokenPrice, 18)} USD\n` +
                        `Debt Notional Price: ${formatUnits(marketState.debtNotionalPrice, 18)} USD`
                    );
                } catch (error) {
                    console.warn(`Failed to fetch details for Market ID ${i}: ${error instanceof Error ? error.message : String(error)}`);
                    continue; // Skip this market and continue with the next one
                }
            }

            if (markets.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No markets found.",
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Available Markets (Total: ${markets.length}):\n${markets.join("\n\n")}`,
                    },
                ],
            };
        } catch (error) {
            console.error("Error listing markets:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to list markets. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "calculate-profit-loss",
    "Calculate the profit or loss of your position in a market",
    {
        address: z.string().describe("Your Monad testnet address"),
        marketId: z.number().default(0).describe("Market ID to calculate for (default: 0)"),
        initialBaseAmount: z.string().describe("Initial amount of base token invested (e.g., 10 WETH)"),
    },
    async ({ address, marketId, initialBaseAmount }) => {
        try {
            // Fetch market config
            const marketConfig = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketConfig",
                args: [marketId],
            }) as MarketConfig;

            const aTokenAddress = marketConfig.aToken; // Leverage token
            const zTokenAddress = marketConfig.zToken; // Debt token

            // Fetch current balances
            const aTokenBalance = await publicClient.readContract({
                address: aTokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            const zTokenBalance = await publicClient.readContract({
                address: zTokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            // Fetch market state for prices
            const marketState = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketState",
                args: [marketId, false],
            }) as MarketState;

            // Calculate current position value
            const aTokenBalanceFormatted = parseFloat(formatUnits(aTokenBalance, 18));
            const zTokenBalanceFormatted = parseFloat(formatUnits(zTokenBalance, 18));
            const baseTokenPrice = parseFloat(formatUnits(marketState.baseTokenPrice, 18));
            const debtNotionalPrice = parseFloat(formatUnits(marketState.debtNotionalPrice, 18));

            const aTokenValue = aTokenBalanceFormatted * baseTokenPrice;
            const zTokenValue = zTokenBalanceFormatted * debtNotionalPrice;
            const currentPositionValue = aTokenValue - zTokenValue;

            // Calculate initial investment value
            const initialBaseAmountFormatted = parseFloat(initialBaseAmount);
            const initialValue = initialBaseAmountFormatted * baseTokenPrice;

            // Calculate profit/loss
            const profitLoss = currentPositionValue - initialValue;
            const profitLossPercentage = ((profitLoss / initialValue) * 100).toFixed(2);

            return {
                content: [
                    {
                        type: "text",
                        text: `Profit/Loss for Market ID ${marketId} (Address: ${address}):\n` +
                              `Initial Investment: ${initialBaseAmount} base tokens (${initialValue.toFixed(2)} USD at ${baseTokenPrice} USD/token)\n` +
                              `Current aToken Balance: ${aTokenBalanceFormatted} tokens (${aTokenValue.toFixed(2)} USD)\n` +
                              `Current zToken Balance: ${zTokenBalanceFormatted} tokens (${zTokenValue.toFixed(2)} USD)\n` +
                              `Current Position Value: ${currentPositionValue.toFixed(2)} USD\n` +
                              `Profit/Loss: ${profitLoss.toFixed(2)} USD (${profitLossPercentage}%)\n` +
                              `${profitLoss >= 0 ? "You are in profit!" : "You are at a loss."}`
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to calculate profit/loss for Market ID ${marketId}. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "assess-liquidation-risk",
    "Assess the liquidation risk of your position in a market",
    {
        address: z.string().describe("Your Monad testnet address"),
        marketId: z.number().default(0).describe("Market ID to assess (default: 0)"),
    },
    async ({ address, marketId }) => {
        try {
            // Fetch market config
            const marketConfig = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketConfig",
                args: [marketId],
            }) as MarketConfig;

            const aTokenAddress = marketConfig.aToken;
            const zTokenAddress = marketConfig.zToken;

            // Fetch balances
            const aTokenBalance = await publicClient.readContract({
                address: aTokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            const zTokenBalance = await publicClient.readContract({
                address: zTokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            // Fetch market state for prices
            const marketState = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketState",
                args: [marketId, false],
            }) as MarketState;

            // Fetch leverage state
            const lexState = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getLexState",
                args: [marketId, false],
            }) as LexState;

            // Calculate position values
            const aTokenBalanceFormatted = parseFloat(formatUnits(aTokenBalance, 18));
            const zTokenBalanceFormatted = parseFloat(formatUnits(zTokenBalance, 18));
            const baseTokenPrice = parseFloat(formatUnits(marketState.baseTokenPrice, 18));
            const debtNotionalPrice = parseFloat(formatUnits(marketState.debtNotionalPrice, 18));

            const aTokenValue = aTokenBalanceFormatted * baseTokenPrice;
            const zTokenValue = zTokenBalanceFormatted * debtNotionalPrice;

            // Calculate user LTV (Loan-to-Value ratio)
            const userLTV = aTokenValue > 0 ? (zTokenValue / aTokenValue) * 100 : 0;

            // Fetch target and current market LTV
            const targetLTV = (Number(lexState.targetLTV) / 10000).toFixed(2); // In percentage
            const currentMarketLTV = (Number(lexState.currentLTV) / 10000).toFixed(2); // In percentage

            // Assess liquidation risk
            const liquidationThreshold = parseFloat(targetLTV) * 1.2; // Assume liquidation happens at 120% of target LTV
            const riskLevel = userLTV > liquidationThreshold ? "High" : userLTV > parseFloat(targetLTV) ? "Moderate" : "Low";
            const distanceToLiquidation = liquidationThreshold - userLTV;

            return {
                content: [
                    {
                        type: "text",
                        text: `Liquidation Risk Assessment for Market ID ${marketId} (Address: ${address}):\n` +
                              `aToken Value: ${aTokenValue.toFixed(2)} USD\n` +
                              `zToken Value: ${zTokenValue.toFixed(2)} USD\n` +
                              `User LTV: ${userLTV.toFixed(2)}%\n` +
                              `Target LTV: ${targetLTV}%\n` +
                              `Current Market LTV: ${currentMarketLTV}%\n` +
                              `Liquidation Threshold: ${liquidationThreshold.toFixed(2)}% (120% of target LTV)\n` +
                              `Distance to Liquidation: ${distanceToLiquidation.toFixed(2)}% (${distanceToLiquidation >= 0 ? "Safe" : "At Risk"})\n` +
                              `Risk Level: ${riskLevel}`
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to assess liquidation risk for Market ID ${marketId}. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);


server.tool(
    "suggest-strategy",
    "Suggest and optionally execute the best strategy based on market details and user holdings on Covenant Finance",
    {
        address: z.string().describe("Your Monad testnet address"),
        marketId: z.number().describe("Market ID to analyze"),
        execute: z.boolean().optional().default(false).describe("Set to true to execute the recommended strategy"),
        slippageTolerance: z.number().default(1).describe("Slippage tolerance percentage for transactions (default: 1%)"),
        baseAmountToInvest: z.string().optional().describe("Amount of base token to invest for bullish strategy (e.g., '1.0' WETH)"),
    },
    async ({ address, marketId, execute, slippageTolerance, baseAmountToInvest }) => {
        try {
            // Fetch market config
            const marketConfig = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketConfig",
                args: [marketId],
            }) as {
                baseToken: string;
                quoteToken: string;
                aToken: string;
                zToken: string;
                oracle: string;
                liquidExchangeModel: string;
                duration: bigint;
            };

            // Fetch market state
            const marketState = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getMarketState",
                args: [marketId, false],
            }) as {
                baseTokenSupply: bigint;
                updateTimestamp: bigint;
                baseTokenPrice: bigint;
                debtNotionalPrice: bigint;
                unlocked: boolean;
            };

            // Fetch LEx state for leverage and debt rate
            const lexState = await publicClient.readContract({
                address: COVENANT_ADDRESS,
                abi: covenantAbi,
                functionName: "getLexState",
                args: [marketId, false],
            }) as {
                targetLTV: bigint;
                currentLTV: bigint;
                balancedDebtPriceDiscount: bigint;
                currentDebtPriceDiscount: bigint;
            };

            // Fetch user balances
            const aTokenBalance = await publicClient.readContract({
                address: marketConfig.aToken as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            const zTokenBalance = await publicClient.readContract({
                address: marketConfig.zToken as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
            }) as bigint;

            // Fetch token names
            const getTokenLabel = async (tokenAddress: string): Promise<string> => {
                try {
                    const name = await publicClient.readContract({
                        address: tokenAddress as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "name",
                        args: [],
                    }) as string;
                    return name;
                } catch (nameError) {
                    console.warn(`Failed to fetch name for token ${tokenAddress}: ${nameError instanceof Error ? nameError.message : String(nameError)}`);
                    try {
                        const symbol = await publicClient.readContract({
                            address: tokenAddress as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "symbol",
                            args: [],
                        }) as string;
                        return symbol;
                    } catch (symbolError) {
                        console.warn(`Failed to fetch symbol for token ${tokenAddress}: ${symbolError instanceof Error ? symbolError.message : String(symbolError)}`);
                        return "Unknown";
                    }
                }
            };

            const baseTokenName = await getTokenLabel(marketConfig.baseToken);
            const aTokenName = await getTokenLabel(marketConfig.aToken);
            const zTokenName = await getTokenLabel(marketConfig.zToken);

            // Calculate leverage and debt rate
            const currentLeverage = Number(lexState.currentLTV) / 1e18;
            const targetLeverage = Number(lexState.targetLTV) / 1e18;
            const debtRate = Number(lexState.currentDebtPriceDiscount) / 1e16;

            // Format prices and balances
            const baseTokenPrice = formatUnits(marketState.baseTokenPrice, 18);
            const debtTokenPrice = formatUnits(marketState.debtNotionalPrice, 18);
            const formattedATokenBalance = formatUnits(aTokenBalance, 18);
            const formattedZTokenBalance = formatUnits(zTokenBalance, 18);

            // Determine strategy
            let strategy = "";
            let rationale = "";
            let executionResult = "";

            // Strategy logic
            const leverageRatio = currentLeverage / targetLeverage;
            const hasLeveragedPosition = aTokenBalance > 0n;
            const hasDebtPosition = zTokenBalance > 0n;
            const debtRateAttractive = debtRate > 0.5;
            const highVolatility = leverageRatio > 1.5;
            const basePriceNumber = parseFloat(baseTokenPrice);

            if (highVolatility) {
                strategy = "Wait and Monitor";
                rationale = `The current leverage (${currentLeverage.toFixed(1)}x) is significantly higher than the target (${targetLeverage.toFixed(1)}x), indicating high volatility. It’s risky to take a leveraged position now. Consider waiting for the market to stabilize.`;
            } else if (hasDebtPosition && debtRateAttractive) {
                strategy = "Hold Debt Position or Sell for Profit";
                rationale = `You hold ${formattedZTokenBalance} ${zTokenName} tokens, and the debt rate is attractive at ${debtRate.toFixed(2)}%. The debt token price has increased to ${debtTokenPrice} USD, suggesting potential profits. You can either hold to continue earning yield or sell to lock in gains.`;
                if (execute) {
                    // Redeem zTokens to lock in profits
                    const zTokenAmountToRedeem = zTokenBalance; // Redeem all zTokens
                    const formattedZTokenAmount = formatUnits(zTokenAmountToRedeem, 18);

                    // Preview redeem (not directly available, estimate via previewSwap if needed)
                    const previewSwap = await publicClient.readContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "previewSwap",
                        args: [marketId, marketConfig.zToken, marketConfig.baseToken, zTokenAmountToRedeem, 0], // SwapType.ExactAmountIn
                    }) as [bigint, bigint];

                    const expectedBaseAmount = previewSwap[0];
                    const expectedBaseAmountFormatted = formatUnits(expectedBaseAmount, 18);
                    const slippageFactor = 1 - slippageTolerance / 100;
                    const minBaseAmountOut = parseUnits(
                        (parseFloat(expectedBaseAmountFormatted) * slippageFactor).toFixed(18),
                        18
                    );

                    // Approve zTokens for redemption
                    const allowance = await publicClient.readContract({
                        address: marketConfig.zToken as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "allowance",
                        args: [address, COVENANT_ADDRESS],
                    }) as bigint;

                    if (allowance < zTokenAmountToRedeem) {
                        const approveTx = await walletClient.writeContract({
                            address: marketConfig.zToken as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "approve",
                            args: [COVENANT_ADDRESS, zTokenAmountToRedeem],
                        });
                        await publicClient.waitForTransactionReceipt({ hash: approveTx });
                    }

                    const redeemParams = {
                        marketId: BigInt(marketId),
                        aTokenAmountIn: BigInt(0),
                        zTokenAmountIn: zTokenAmountToRedeem,
                        onBehalfOf: address,
                        to: address,
                        minAmountOut: minBaseAmountOut,
                    };

                    const gasEstimate = await publicClient.estimateContractGas({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "redeem",
                        args: [redeemParams],
                        account: walletClient.account,
                    });

                    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

                    const redeemTx = await walletClient.writeContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "redeem",
                        args: [redeemParams],
                        gas: gasLimit,
                    });

                    const receipt = await publicClient.waitForTransactionReceipt({ hash: redeemTx });

                    const redeemLogs = parseEventLogs({
                        abi: covenantAbi,
                        eventName: "Redeem",
                        logs: receipt.logs,
                    }) as ParsedLog<RedeemEventArgs>[];

                    let actualBaseAmountOut = "0";
                    if (redeemLogs.length > 0) {
                        const redeemLog = redeemLogs[0];
                        if (redeemLog.args && "amountOut" in redeemLog.args) {
                            actualBaseAmountOut = formatUnits(redeemLog.args.amountOut, 18);
                        } else {
                            throw new Error("Redeem event does not contain expected arguments (amountOut)");
                        }
                    } else {
                        throw new Error("Redeem event not found in transaction receipt");
                    }

                    executionResult = `Executed: Redeemed ${formattedZTokenAmount} ${zTokenName} for ${actualBaseAmountOut} ${baseTokenName}.\nTransaction Hash: ${redeemTx}`;
                }
            } else if (!hasLeveragedPosition && basePriceNumber < 1500) {
                strategy = "Buy Leveraged Tokens (Bullish Strategy)";
                rationale = `The ${baseTokenName} price is relatively low at ${baseTokenPrice} USD. If you’re bullish on ${baseTokenName}, buying ${aTokenName} tokens could yield significant gains if the price recovers. Be cautious of the current leverage (${currentLeverage.toFixed(1)}x).`;
                if (execute) {
                    if (!baseAmountToInvest) {
                        throw new Error("Please provide baseAmountToInvest to execute the bullish strategy (e.g., '1.0' WETH).");
                    }

                    const baseAmount = parseUnits(baseAmountToInvest, 18);

                    // Preview mint to estimate aToken and zToken amounts
                    const previewMint = await publicClient.readContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "previewMint",
                        args: [marketId, baseAmount],
                    }) as [bigint, bigint, bigint];

                    const expectedATokenAmount = previewMint[0];
                    const expectedZTokenAmount = previewMint[1];
                    const slippageFactor = 1 - slippageTolerance / 100;
                    const minATokenAmountOut = parseUnits(
                        (parseFloat(formatUnits(expectedATokenAmount, 18)) * slippageFactor).toFixed(18),
                        18
                    );
                    const minZTokenAmountOut = parseUnits(
                        (parseFloat(formatUnits(expectedZTokenAmount, 18)) * slippageFactor).toFixed(18),
                        18
                    );

                    // Approve base token if needed
                    const allowance = await publicClient.readContract({
                        address: marketConfig.baseToken as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "allowance",
                        args: [address, COVENANT_ADDRESS],
                    }) as bigint;

                    if (allowance < baseAmount) {
                        const approveTx = await walletClient.writeContract({
                            address: marketConfig.baseToken as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "approve",
                            args: [COVENANT_ADDRESS, baseAmount],
                        });
                        await publicClient.waitForTransactionReceipt({ hash: approveTx });
                    }

                    const mintParams = {
                        marketId: BigInt(marketId),
                        baseAmountIn: baseAmount,
                        onBehalfOf: address,
                        to: address,
                        minATokenAmountOut,
                        minZTokenAmountOut,
                    };

                    const gasEstimate = await publicClient.estimateContractGas({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "mint",
                        args: [mintParams],
                        account: walletClient.account,
                    });

                    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

                    const mintTx = await walletClient.writeContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "mint",
                        args: [mintParams],
                        gas: gasLimit,
                    });

                    const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });

                    const mintLogs = parseEventLogs({
                        abi: covenantAbi,
                        eventName: "Mint",
                        logs: receipt.logs,
                    }) as ParsedLog<MintEventArgs>[];

                    let actualATokenAmount = "0";
                    let actualZTokenAmount = "0";
                    if (mintLogs.length > 0) {
                        const mintLog = mintLogs[0];
                        if (mintLog.args && "aTokenAmountOut" in mintLog.args && "zTokenAmountOut" in mintLog.args) {
                            actualATokenAmount = formatUnits(mintLog.args.aTokenAmountOut, 18);
                            actualZTokenAmount = formatUnits(mintLog.args.zTokenAmountOut, 18);
                        } else {
                            throw new Error("Mint event does not contain expected arguments (aTokenAmountOut or zTokenAmountOut)");
                        }
                    } else {
                        throw new Error("Mint event not found in transaction receipt");
                    }

                    executionResult = `Executed: Minted ${actualATokenAmount} ${aTokenName} and ${actualZTokenAmount} ${zTokenName} using ${baseAmountToInvest} ${baseTokenName}.\nTransaction Hash: ${mintTx}`;
                }
            } else if (hasLeveragedPosition && hasDebtPosition) {
                strategy = "Rebalance Portfolio";
                rationale = `You hold both ${formattedATokenBalance} ${aTokenName} and ${formattedZTokenBalance} ${zTokenName} tokens. Given the current leverage (${currentLeverage.toFixed(1)}x) and debt rate (${debtRate.toFixed(2)}%), consider rebalancing: sell some ${aTokenName} to reduce risk and hold ${zTokenName} for stability and yield.`;
                if (execute) {
                    // Sell half of aTokens to reduce risk
                    const aTokenAmountToRedeem = aTokenBalance / BigInt(2);
                    const formattedATokenAmount = formatUnits(aTokenAmountToRedeem, 18);

                    // Preview redeem
                    const previewSwap = await publicClient.readContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "previewSwap",
                        args: [marketId, marketConfig.aToken, marketConfig.baseToken, aTokenAmountToRedeem, 0], // SwapType.ExactAmountIn
                    }) as [bigint, bigint];

                    const expectedBaseAmount = previewSwap[0];
                    const expectedBaseAmountFormatted = formatUnits(expectedBaseAmount, 18);
                    const slippageFactor = 1 - slippageTolerance / 100;
                    const minBaseAmountOut = parseUnits(
                        (parseFloat(expectedBaseAmountFormatted) * slippageFactor).toFixed(18),
                        18
                    );

                    // Approve aTokens for redemption
                    const allowance = await publicClient.readContract({
                        address: marketConfig.aToken as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "allowance",
                        args: [address, COVENANT_ADDRESS],
                    }) as bigint;

                    if (allowance < aTokenAmountToRedeem) {
                        const approveTx = await walletClient.writeContract({
                            address: marketConfig.aToken as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "approve",
                            args: [COVENANT_ADDRESS, aTokenAmountToRedeem],
                        });
                        await publicClient.waitForTransactionReceipt({ hash: approveTx });
                    }

                    const redeemParams = {
                        marketId: BigInt(marketId),
                        aTokenAmountIn: aTokenAmountToRedeem,
                        zTokenAmountIn: BigInt(0),
                        onBehalfOf: address,
                        to: address,
                        minAmountOut: minBaseAmountOut,
                    };

                    const gasEstimate = await publicClient.estimateContractGas({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "redeem",
                        args: [redeemParams],
                        account: walletClient.account,
                    });

                    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

                    const redeemTx = await walletClient.writeContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "redeem",
                        args: [redeemParams],
                        gas: gasLimit,
                    });

                    const receipt = await publicClient.waitForTransactionReceipt({ hash: redeemTx });

                    const redeemLogs = parseEventLogs({
                        abi: covenantAbi,
                        eventName: "Redeem",
                        logs: receipt.logs,
                    }) as ParsedLog<RedeemEventArgs>[];

                    let actualBaseAmountOut = "0";
                    if (redeemLogs.length > 0) {
                        const redeemLog = redeemLogs[0];
                        if (redeemLog.args && "amountOut" in redeemLog.args) {
                            actualBaseAmountOut = formatUnits(redeemLog.args.amountOut, 18);
                        } else {
                            throw new Error("Redeem event does not contain expected arguments (amountOut)");
                        }
                    } else {
                        throw new Error("Redeem event not found in transaction receipt");
                    }

                    executionResult = `Executed: Redeemed ${formattedATokenAmount} ${aTokenName} for ${actualBaseAmountOut} ${baseTokenName}.\nTransaction Hash: ${redeemTx}`;
                }
            } else {
                strategy = "Hold or Accumulate Debt Tokens";
                rationale = `The debt rate (${debtRate.toFixed(2)}%) is a stable return with lower risk compared to leveraged tokens. Consider accumulating ${zTokenName} tokens to earn yield, especially if you’re uncertain about ${baseTokenName}’s price direction.`;
                if (execute) {
                    if (!baseAmountToInvest) {
                        throw new Error("Please provide baseAmountToInvest to execute the debt accumulation strategy (e.g., '1.0' WETH).");
                    }

                    const baseAmount = parseUnits(baseAmountToInvest, 18);

                    // Preview mint to estimate aToken and zToken amounts
                    const previewMint = await publicClient.readContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "previewMint",
                        args: [marketId, baseAmount],
                    }) as [bigint, bigint, bigint];

                    const expectedATokenAmount = previewMint[0];
                    const expectedZTokenAmount = previewMint[1];
                    const slippageFactor = 1 - slippageTolerance / 100;
                    const minATokenAmountOut = parseUnits(
                        (parseFloat(formatUnits(expectedATokenAmount, 18)) * slippageFactor).toFixed(18),
                        18
                    );
                    const minZTokenAmountOut = parseUnits(
                        (parseFloat(formatUnits(expectedZTokenAmount, 18)) * slippageFactor).toFixed(18),
                        18
                    );

                    // Approve base token if needed
                    const allowance = await publicClient.readContract({
                        address: marketConfig.baseToken as `0x${string}`,
                        abi: erc20Abi,
                        functionName: "allowance",
                        args: [address, COVENANT_ADDRESS],
                    }) as bigint;

                    if (allowance < baseAmount) {
                        const approveTx = await walletClient.writeContract({
                            address: marketConfig.baseToken as `0x${string}`,
                            abi: erc20Abi,
                            functionName: "approve",
                            args: [COVENANT_ADDRESS, baseAmount],
                        });
                        await publicClient.waitForTransactionReceipt({ hash: approveTx });
                    }

                    const mintParams = {
                        marketId: BigInt(marketId),
                        baseAmountIn: baseAmount,
                        onBehalfOf: address,
                        to: address,
                        minATokenAmountOut,
                        minZTokenAmountOut,
                    };

                    const gasEstimate = await publicClient.estimateContractGas({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "mint",
                        args: [mintParams],
                        account: walletClient.account,
                    });

                    const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

                    const mintTx = await walletClient.writeContract({
                        address: COVENANT_ADDRESS,
                        abi: covenantAbi,
                        functionName: "mint",
                        args: [mintParams],
                        gas: gasLimit,
                    });

                    const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });

                    const mintLogs = parseEventLogs({
                        abi: covenantAbi,
                        eventName: "Mint",
                        logs: receipt.logs,
                    }) as ParsedLog<MintEventArgs>[];

                    let actualATokenAmount = "0";
                    let actualZTokenAmount = "0";
                    if (mintLogs.length > 0) {
                        const mintLog = mintLogs[0];
                        if (mintLog.args && "aTokenAmountOut" in mintLog.args && "zTokenAmountOut" in mintLog.args) {
                            actualATokenAmount = formatUnits(mintLog.args.aTokenAmountOut, 18);
                            actualZTokenAmount = formatUnits(mintLog.args.zTokenAmountOut, 18);
                        } else {
                            throw new Error("Mint event does not contain expected arguments (aTokenAmountOut or zTokenAmountOut)");
                        }
                    } else {
                        throw new Error("Mint event not found in transaction receipt");
                    }

                    executionResult = `Executed: Minted ${actualATokenAmount} ${aTokenName} and ${actualZTokenAmount} ${zTokenName} using ${baseAmountToInvest} ${baseTokenName} to accumulate debt tokens.\nTransaction Hash: ${mintTx}`;
                }
            }

            // Format the response
            return {
                content: [
                    {
                        type: "text",
                        text: `Market Analysis for Market ID ${marketId}:\n` +
                              `Base Token: ${baseTokenName} (${marketConfig.baseToken})\n` +
                              `aToken (Leverage): ${aTokenName} (${marketConfig.aToken})\n` +
                              `zToken (Debt): ${zTokenName} (${marketConfig.zToken})\n` +
                              `Base Token Price: ${baseTokenPrice} USD\n` +
                              `Debt Token Price: ${debtTokenPrice} USD\n` +
                              `Current Leverage: ${currentLeverage.toFixed(1)}x\n` +
                              `Target Leverage: ${targetLeverage.toFixed(1)}x\n` +
                              `Debt Rate: ${debtRate.toFixed(2)}%\n` +
                              `Your Holdings:\n` +
                              `- ${aTokenName}: ${formattedATokenBalance} tokens\n` +
                              `- ${zTokenName}: ${formattedZTokenBalance} tokens\n\n` +
                              `Recommended Strategy: ${strategy}\n` +
                              `Rationale: ${rationale}\n` +
                              (executionResult ? `${executionResult}\n` : "")
                    },
                ],
            };
        } catch (error) {
            console.error("Error suggesting strategy:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to suggest strategy for Market ID ${marketId}. Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }
);


// Main function to start the MCP server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Covenant Finance MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});