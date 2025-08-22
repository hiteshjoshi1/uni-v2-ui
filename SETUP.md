Architecture & setup

Separate repos: keep React app separate from contracts (copy the exported export/abi/* + export/frontend/addresses.<chainId>.json).

Stack: Vite + React + TypeScript + wagmi + viem (+ optional RainbowKit).

Why wagmi+viem (vs ethers in React):

Wagmi gives battle-tested React hooks (wallet, accounts, chain, reads/writes, caching, reconnect).

Viem is typed, deterministic, great ABIs/types; smaller/safer RPC layer.

Ethers is fine server-side or scripts; in React you’ll re-build wagmi-style state if you use ethers directly.

Files to feed the UI

Addresses (per chainId): from Ignition → your addresses.<chainId>.json.

ABIs: Factory, Router02, Pair, ERC20, WETH9 (use hardhat-abi-exporter).

Token list: { symbol, name, address, decimals } for your test tokens. (You can fetch decimals()/symbol() on the fly if missing, then cache.)

Frontend project layout
src/
  config/
    networks.ts         // chain configs, RPC from env
    addresses.ts        // import addresses.<chainId>.json
    tokens.local.json   // your seed token list (WETH, DAI, USDC…)
  lib/
    wagmi.ts            // wagmi/viem client, connectors (MetaMask)
    format.ts           // parseUnits/formatUnits helpers
    slippage.ts         // calc amountOutMin
  hooks/
    useQuote.ts         // router.getAmountsOut
    useAllowance.ts     // read allowance, needsApprove?
    useApprove.ts       // write approve
    useSwap.ts          // write swap* calls
    useAddLiquidity.ts  // addLiquidity / addLiquidityETH
  components/
    WalletButton.tsx
    TokenSelect.tsx
    SwapPanel.tsx
    AddLiquidityPanel.tsx
    PairList.tsx

Config & externalization

Env vars (Vite):

VITE_DEFAULT_CHAIN_ID=31337 (or 11155111 for Sepolia)

VITE_RPC_31337=http://127.0.0.1:8545

VITE_RPC_11155111=https://sepolia.infura.io/v3/...

addresses map: keep addresses.<chainId>.json per network; pick at runtime from chainId.

Tokens: start with a local JSON; allow users to paste any ERC-20 address → fetch symbol/decimals.

Core flows (high-level)
1) Connect wallet

Wagmi createConfig({ connectors: [injected()], transports: { chainId: http(RPC) } }).

Optional RainbowKit for a polished connect button.

2) Quote (for swap UX)

Call router.getAmountsOut(amountIn, [tokenIn, tokenOut]).

Show best estimate; compute amountOutMin = amountOut * (1 - slippageBps/10_000).

3) Approvals

If tokenIn !== ETH:

Read allowance(tokenIn, user, router); if < amountIn, call approve(router, MaxUint256) (or exact amount).

Surface allowance state on the button (“Approve”, then “Swap”).

4) Swap

Paths & methods:

ERC20→ERC20: swapExactTokensForTokens(amountIn, amountOutMin, [in,out], to, deadline).

ETH→ERC20: swapExactETHForTokens(amountOutMin, [WETH,out], to, deadline, { value }).

ERC20→ETH: swapExactTokensForETH(amountIn, amountOutMin, [in,WETH], to, deadline).

Deadline: Math.floor(Date.now()/1000) + 60*5.

5) Add liquidity

Approve both tokens (if not ETH).

ERC20/ETH: addLiquidityETH(token, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline, { value }).

ERC20/ERC20: addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline).

6) New pairs (backend & frontend)

Backend (contracts): just call factory.createPair(tokenA, tokenB) once. Pair address is deterministic; you can also read via factory.getPair(a,b).

Frontend:

When user selects two tokens, call getPair(a,b).

If 0x000…0: show “Create pool” path → call createPair (only once), then prompt Add Liquidity.

If exists: fetch token0/token1, getReserves(), show pool.

To list all pools: read allPairsLength() + allPairs(i) OR filter PairCreated logs since block X; then for each pair call token0(), token1(), symbol/decimals.

7) Token list strategy

Start with a local list for your mocks (fast UX).

Let users paste an address to import any ERC-20 (pull symbol/decimals live).

Optional: support multiple lists (local JSONs keyed by chain).

8) WETH handling

Provide a wrap/unwrap pill: WETH.deposit({ value }), WETH.withdraw(amount).

For swaps, prefer router’s ETH helpers so you don’t manually wrap.

Design choices (summary)

Wagmi+viem vs ethers in React

Use wagmi+viem for hooks, caching, safer types, wallet UX.

Keep ethers in Hardhat scripts/tests (it’s already there).

Addresses/ABIs delivery

Copy export/abi/* + addresses.<chainId>.json into the React repo. Later: publish as npm package for smoother updates.

Dynamic pairs

Use getPair() for discovery; show “create pool” when none exists; watch PairCreated events for live updates.

Config externalization

RPCs & defaults from .env; addresses per chain file; token lists per chain JSON.

Minimal “first screen” checklist

 Wallet connect (MetaMask)

 Network guard (show warning if wrong chainId)

 Token selectors (from list + custom address)

 Quote box (auto updates)

 Slippage control (0.5/1/2% presets)

 Approve button (when needed)

 Swap button (with deadline)

 Toasts for tx hash / mined

 Pool page: create pair (if missing), add liquidity, view reserves/LP balance

 -----
 Milestones (each = 10–60 lines, test after):

Config & clients

src/config/networks.ts (read VITE_*),
src/config/addresses.ts (load your npm package, pick by chainId).

src/lib/wagmi.ts (wagmi config, MetaMask connector).

✅ Test: render a page that shows chainId + Router address.

Wallet connect

components/WalletButton.tsx with useAccount, useConnect, useDisconnect.

✅ Test: connect/disconnect works, wrong-network warning.

Token registry

config/tokens.local.json; components/TokenSelect.tsx (search + paste address → fetch symbol/decimals).

✅ Test: select tokens, custom ERC-20 resolves.

Quoting

hooks/useQuote.ts using router.getAmountsOut.

lib/slippage.ts for amountOutMin.

✅ Test: typing amount updates quote.

Approvals

hooks/useAllowance.ts + useApprove.ts.

✅ Test: shows “Approve” then “Swap”.

Swap

hooks/useSwap.ts (ERC20→ERC20, ETH→ERC20, ERC20→ETH).

✅ Test: happy path swap on local chain.

Add liquidity

hooks/useAddLiquidity.ts (+ approvals as needed).

components/AddLiquidityPanel.tsx.

✅ Test: LP minted, reserves update.

Pairs & discovery

components/PairList.tsx (iterate allPairs), “Create pool” if missing (calls factory.createPair), then “Add Liquidity”.

✅ Test: new pair flows.

WETH helpers

Wrap/unwrap pill (call deposit/withdraw on WETH).

✅ Test: balances move as expected.