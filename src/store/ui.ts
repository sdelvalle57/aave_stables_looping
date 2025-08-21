import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type {
  UIStore,
  PersistedUIState,
  StoreActions,
} from '@/types/store';
import type {
  Chain,
  StablecoinAsset,
  Protocol,
  LoopCalculatorParams,
  AlertRule,
  AlertNotification,
} from '@/types/domain';
import { isSupportedChainId, isStablecoinAsset } from '@/types';

// JSON serialization helpers for BigInt
function bigintReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') {
    return { __type: 'bigint', value: value.toString() };
  }
  return value;
}

function bigintReviver(_key: string, value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    (value as any).__type === 'bigint' &&
    typeof (value as any).value === 'string'
  ) {
    try {
      return BigInt((value as any).value);
    } catch {
      return 0n;
    }
  }
  return value;
}

const ALL_CHAINS: Chain[] = [1, 42161, 10, 137];
const ALL_ASSETS: StablecoinAsset[] = ['USDC', 'USDT', 'DAI'];
const DEFAULT_PROTOCOLS: Protocol[] = ['aave'];

const DEFAULT_CALCULATOR_PARAMS: LoopCalculatorParams = {
  chain: 1,
  depositAsset: 'USDC',
  borrowAsset: 'USDC',
  principal: 0n,
  targetLTV: 50,
  loops: 1,
  targetLeverage: 1,
};

type Store = UIStore & StoreActions;

// Helpers
function clampRefreshInterval(seconds: number): number {
  return Math.max(5, Math.min(3600, Math.floor(seconds)));
}

function makeId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export const useUIStore = create<Store>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedChains: ALL_CHAINS,
      selectedAssets: ALL_ASSETS,
      selectedProtocols: DEFAULT_PROTOCOLS,

      darkMode: false,
      alertsEnabled: true,
      autoRefresh: true,
      refreshInterval: 60,

      calculatorParams: DEFAULT_CALCULATOR_PARAMS,

      alertRules: [],
      notifications: [],

      // Actions: chain/asset/protocol
      setSelectedChains: (chains: Chain[]) =>
        set(() => ({
          selectedChains: chains.filter((c) => isSupportedChainId(c)),
        })),
      setSelectedAssets: (assets: StablecoinAsset[]) =>
        set(() => ({
          selectedAssets: assets.filter((a) => isStablecoinAsset(a)),
        })),
      setSelectedProtocols: (protocols: Protocol[]) =>
        set(() => ({ selectedProtocols: protocols })),

      // Actions: preferences
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setAlertsEnabled: (enabled: boolean) => set(() => ({ alertsEnabled: enabled })),
      setAutoRefresh: (enabled: boolean) => set(() => ({ autoRefresh: enabled })),
      setRefreshInterval: (interval: number) =>
        set(() => ({ refreshInterval: clampRefreshInterval(interval) })),

      // Actions: calculator
      updateCalculatorParams: (params: Partial<LoopCalculatorParams>) =>
        set((s) => ({ calculatorParams: { ...s.calculatorParams, ...params } })),

      // Actions: alerts
      addAlertRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) =>
        set((s) => ({
          alertRules: [
            ...s.alertRules,
            { ...rule, id: makeId('alert'), createdAt: new Date() },
          ],
        })),
      updateAlertRule: (id: string, updates: Partial<AlertRule>) =>
        set((s) => ({
          alertRules: s.alertRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      removeAlertRule: (id: string) =>
        set((s) => ({ alertRules: s.alertRules.filter((r) => r.id !== id) })),

      addNotification: (notification: Omit<AlertNotification, 'id' | 'timestamp'>) =>
        set((s) => ({
          notifications: [
            ...s.notifications,
            { ...notification, id: makeId('notif'), timestamp: new Date(), isRead: false },
          ],
        })),
      markNotificationAsRead: (id: string) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        })),
      clearNotifications: () => set(() => ({ notifications: [] })),

      // Store actions
      reset: () =>
        set(() => ({
          selectedChains: ALL_CHAINS,
          selectedAssets: ALL_ASSETS,
          selectedProtocols: DEFAULT_PROTOCOLS,
          darkMode: false,
          alertsEnabled: true,
          autoRefresh: true,
          refreshInterval: 60,
          calculatorParams: DEFAULT_CALCULATOR_PARAMS,
          alertRules: [],
          notifications: [],
        })),
      hydrate: (state: Partial<PersistedUIState>) =>
        set((s) => ({
          selectedChains: state.selectedChains ?? s.selectedChains,
          selectedAssets: state.selectedAssets ?? s.selectedAssets,
          selectedProtocols: state.selectedProtocols ?? s.selectedProtocols,
          darkMode: state.darkMode ?? s.darkMode,
          alertsEnabled: state.alertsEnabled ?? s.alertsEnabled,
          autoRefresh: state.autoRefresh ?? s.autoRefresh,
          refreshInterval:
            state.refreshInterval !== undefined
              ? clampRefreshInterval(state.refreshInterval)
              : s.refreshInterval,
          calculatorParams: state.calculatorParams ?? s.calculatorParams,
          alertRules: state.alertRules ?? s.alertRules,
        })),
      getPersistedState: (): PersistedUIState => {
        const s = get();
        return {
          selectedChains: s.selectedChains,
          selectedAssets: s.selectedAssets,
          selectedProtocols: s.selectedProtocols,
          darkMode: s.darkMode,
          alertsEnabled: s.alertsEnabled,
          autoRefresh: s.autoRefresh,
          refreshInterval: s.refreshInterval,
          calculatorParams: s.calculatorParams,
          alertRules: s.alertRules,
        };
      },
    }),
    {
      name: 'ui-store',
      version: 3,
      storage: createJSONStorage(() => localStorage, {
        replacer: bigintReplacer,
        reviver: bigintReviver,
      }),
      partialize: (state) => {
        const {
          selectedChains,
          selectedAssets,
          selectedProtocols,
          darkMode,
          alertsEnabled,
          autoRefresh,
          refreshInterval,
          calculatorParams,
          alertRules,
        } = state as Store;
        return {
          selectedChains,
          selectedAssets,
          selectedProtocols,
          darkMode,
          alertsEnabled,
          autoRefresh,
          refreshInterval,
          calculatorParams,
          alertRules,
        } as PersistedUIState;
      },
      // migrate persisted state when bumping version
      migrate: (persisted: any, version: number) => {
        if (!persisted) return persisted;
        if (version < 2) {
          // Best-effort: if principal was serialized as plain string or number, coerce to BigInt
          const p = persisted?.calculatorParams?.principal;
          if (typeof p === 'string') {
            try {
              persisted.calculatorParams.principal = BigInt(p);
            } catch {
              persisted.calculatorParams.principal = 0n;
            }
          } else if (typeof p === 'number') {
            persisted.calculatorParams.principal = BigInt(Math.trunc(p));
          }
        }
        if (version < 3) {
          // Remove any deprecated assets (e.g., FRAX) from persisted selection
          const assets = persisted?.selectedAssets;
          if (Array.isArray(assets)) {
            persisted.selectedAssets = assets.filter((a: unknown) =>
              typeof a === 'string' && isStablecoinAsset(a)
            );
          }
          // Ensure default calculator assets are valid
          const dep = persisted?.calculatorParams?.depositAsset;
          if (dep && typeof dep === 'string' && !isStablecoinAsset(dep)) {
            persisted.calculatorParams.depositAsset = 'USDC';
          }
          const bor = persisted?.calculatorParams?.borrowAsset;
          if (bor && typeof bor === 'string' && !isStablecoinAsset(bor)) {
            persisted.calculatorParams.borrowAsset = 'USDC';
          }
        }
        return persisted;
      },
    }
  )
);

// Convenience selectors
export const useSelectedChains = () => useUIStore((s) => s.selectedChains);
export const useSelectedAssets = () => useUIStore((s) => s.selectedAssets);
export const useDarkMode = () => useUIStore((s) => s.darkMode);