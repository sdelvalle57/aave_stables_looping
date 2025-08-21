import { ConfigBanner } from '@/components/ConfigBanner';
import { WalletTest } from '@/components/WalletTest';
import { Dashboard } from '@/components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <ConfigBanner />
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Stablecoin Yield Monitor</h1>
          <p className="text-muted-foreground">Multi-chain yields and loop spreads</p>
        </div>

        <WalletTest />

        <section className="mt-6">
          <Dashboard />
        </section>
      </div>
    </div>
  );
}

export default App;
