import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/ui';
import { CHAIN_NAMES, type SupportedChainId } from '@/types';

const ALL_CHAINS: SupportedChainId[] = Object.keys(CHAIN_NAMES).map((k) => Number(k)) as SupportedChainId[];

export function ChainSelector() {
  const selectedChains = useUIStore((s) => s.selectedChains) as SupportedChainId[];
  const setSelectedChains = useUIStore((s) => s.setSelectedChains);

  const selectedSet = useMemo(() => new Set(selectedChains), [selectedChains]);

  const toggleChain = (chainId: SupportedChainId) => {
    const next = selectedSet.has(chainId)
      ? selectedChains.filter((c) => c !== chainId)
      : [...selectedChains, chainId];
    setSelectedChains(next as SupportedChainId[]);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold">Chains:</span>
      {ALL_CHAINS.map((cid) => {
        const active = selectedSet.has(cid);
        return (
          <Button
            key={cid}
            variant={active ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleChain(cid)}
          >
            {CHAIN_NAMES[cid]}
          </Button>
        );
      })}
    </div>
  );
}