import { useState } from 'react';
import { Button } from '@/components/ui/button';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Stablecoin Yield Monitor</h1>
          <p className="text-muted-foreground">
            Project foundation setup complete
          </p>
          <div className="space-y-4">
            <Button onClick={() => setCount((count) => count + 1)}>
              Count is {count}
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">TypeScript</h3>
                <p className="text-sm text-muted-foreground">
                  Strict mode enabled
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Tailwind CSS</h3>
                <p className="text-sm text-muted-foreground">
                  With shadcn/ui components
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">ESLint & Prettier</h3>
                <p className="text-sm text-muted-foreground">
                  Code formatting configured
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
