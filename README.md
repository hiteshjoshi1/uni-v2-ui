# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.


# Setup from ground up
1) Create a React + TypeScript app (with Vite)
# Node 18+ recommended
```npm create vite@latest uni-v2-ui -- --template react-ts```
Then 
```cd uni-v2-ui && npm install```

2) Install needed packages

What is Vite? a fast dev server + build tool (instant HMR, modern bundling).

Install wagmi + viem + TanStack Query (wagmi uses it), and RainbowKit for wallet UI.

```npm i wagmi viem @tanstack/react-query @rainbow-me/rainbowkit```


(Optional UI helpers)

```npm i clsx```


(Types for env if you like)

```npm i -D vite-tsconfig-paths```

3) Make the recommended folders
```mkdir -p src/{config,contracts/abi,hooks,components,lib,pages}```

4) This gets the deployed contracts from the package
@0xheyjo/uni-v2-artifacts