import { useChainId } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import seed from "../config/tokens.local.json"; // ensure this file exists
import { isAddress, type Address } from "viem";

export type RegistryToken = {
  address: Address;
  symbol: string;
  name?: string;
  decimals: number;
};

const LS_PREFIX = "uni.tokens.";

function readSeed(chainId: number): RegistryToken[] {
  const raw = (seed as any)?.[String(chainId)] as RegistryToken[] | undefined;
  return Array.isArray(raw) ? raw : [];
}

function readLS(chainId: number): RegistryToken[] {
  try {
    const v = localStorage.getItem(LS_PREFIX + chainId);
    if (!v) return [];
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeLS(chainId: number, tokens: RegistryToken[]) {
  localStorage.setItem(LS_PREFIX + chainId, JSON.stringify(tokens));
}

export function useTokenRegistry() {
  const chainId = useChainId() ?? 31337;
  const [tokens, setTokens] = useState<RegistryToken[]>([]);

  // load once per chain: seed ∪ localStorage (dedupe by address lowercase, LS wins)
  useEffect(() => {
    const s = readSeed(chainId);
    const l = readLS(chainId);
    const m = new Map<string, RegistryToken>();
    for (const t of s) if (isAddress(t.address)) m.set(t.address.toLowerCase(), t);
    for (const t of l) if (isAddress(t.address)) m.set(t.address.toLowerCase(), t);
    setTokens(Array.from(m.values()));
  }, [chainId]);

  // helpers
  const byAddress = useMemo(() => {
    const m = new Map<string, RegistryToken>();
    for (const t of tokens) m.set(t.address.toLowerCase(), t);
    return m;
  }, [tokens]);

  function addToken(t: RegistryToken) {
    const key = t.address.toLowerCase();
    if (byAddress.has(key)) return; // no-op
    const next = [...tokens, t];
    setTokens(next);
    writeLS(chainId, next);
  }
  function removeToken(addr: Address) {
    const key = addr.toLowerCase();
    const next = tokens.filter(t => t.address.toLowerCase() !== key);
    setTokens(next);
    writeLS(chainId, next);
  }

  return { chainId, tokens, addToken, removeToken };
}
