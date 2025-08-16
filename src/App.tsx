import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WalletTest } from '@/components/WalletTest';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Stablecoin Yield Monitor</h1>
          
          <p className="text-muted-foreground">
            Multi-chain infrastructure and wallet connectivity configured
          </p>
          
          <WalletTest />
          
          <div className="space-y-4">
            <Button onClick={() => setCount((count) => count + 1)}>
              Count is {count}
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Ethereum</h3>
                <p className="text-sm text-muted-foreground">
                  Alchemy RPC configured
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Arbitrum</h3>
                <p className="text-sm text-muted-foreground">
                  Multicall ready
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Optimism</h3>
                <p className="text-sm text-muted-foreground">
                  Wallet connectivity
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Polygon</h3>
                <p className="text-sm text-muted-foreground">
                  RainbowKit integration
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
