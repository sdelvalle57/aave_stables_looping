import { useAccount, useChainId, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { getChainConfig, getContractAddresses, isChainSupported } from '@/lib/chains';

export function WalletTest() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();

  const chainConfig = getChainConfig(chainId);
  const contractAddresses = getContractAddresses(chainId);
  const isSupported = isChainSupported(chainId);

  return (
    <div className="space-y-4 p-6 border rounded-lg">

      <div className="space-y-2">
        <div className="flex justify-center">
          <ConnectButton />
        </div>

        {isConnected && (
          <div className="space-y-2 text-sm">
            <p><strong>Address:</strong> {address}</p>
            <p><strong>Chain ID:</strong> {chainId}</p>
            <p><strong>Chain Name:</strong> {chainConfig?.name || 'Unknown'}</p>
            <p><strong>Supported:</strong> {isSupported ? '✅ Yes' : '❌ No'}</p>

            {contractAddresses && (
              <div>
                <p><strong>Contract Addresses:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>Aave Pool Data Provider: {contractAddresses.aavePoolDataProvider}</li>
                  <li>Aave UI Pool Data Provider: {contractAddresses.aaveUiPoolDataProvider}</li>
                </ul>
              </div>
            )}

            <Button onClick={() => disconnect()} variant="outline" size="sm">
              Disconnect
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}