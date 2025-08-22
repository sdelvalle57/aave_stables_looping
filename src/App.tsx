import { useState } from 'react';
import { ConfigBanner } from '@/components/ConfigBanner';
import { WalletTest } from '@/components/WalletTest';
import { Dashboard } from '@/components/Dashboard';
import { LoopCalculator } from '@/components/LoopCalculator';
import { Button } from '@/components/ui/button';

function App() {
  const [view, setView] = useState<'dashboard' | 'calculator'>('dashboard');

  const isDashboard = view === 'dashboard';
  const isCalculator = view === 'calculator';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <ConfigBanner />
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Stablecoin Yield Monitor</h1>
          <p className="text-muted-foreground">Multi-chain yields and loop spreads</p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            size="sm"
            variant={isDashboard ? 'default' : 'outline'}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </Button>
          <Button
            size="sm"
            variant={isCalculator ? 'default' : 'outline'}
            onClick={() => setView('calculator')}
          >
            Loop Calculator
          </Button>
        </div>

        <WalletTest />

        <section className="mt-6">
          {isDashboard && <Dashboard />}
          {isCalculator && <LoopCalculator />}
        </section>
      </div>
    </div>
  );
}

export default App;
