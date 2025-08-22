import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/ui';
import { CHAIN_NAMES, type SupportedChainId } from '@/types';

const ALL_CHAINS: SupportedChainId[] = Object.keys(CHAIN_NAMES).map((k) => Number(k)) as SupportedChainId[];

export function CalculatorChainSelect() {
  const params = useUIStore((s) => s.calculatorParams);
  const update = useUIStore((s) => s.updateCalculatorParams);

  const selected = (params?.chain ?? 1) as SupportedChainId;
  const selectedSet = useMemo(() => new Set([selected]), [selected]);

  const toggleChain = (chainId: SupportedChainId) => {
    if (selected === chainId) return;
    update({ chain: chainId });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold">Chain:</span>
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