// UI store types and state management interfaces

import type { 
  Chain, 
  StablecoinAsset, 
  Protocol, 
  LoopCalculatorParams,
  AlertRule,
  AlertNotification 
} from './domain';

// Main UI store interface
export interface UIStore {
  // Chain and asset selection
  selectedChains: Chain[];
  selectedAssets: StablecoinAsset[];
  selectedProtocols: Protocol[];
  
  // UI preferences
  darkMode: boolean;
  alertsEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  
  // Calculator state
  calculatorParams: LoopCalculatorParams;
  
  // Alert management
  alertRules: AlertRule[];
  notifications: AlertNotification[];
  
  // Actions
  setSelectedChains: (chains: Chain[]) => void;
  setSelectedAssets: (assets: StablecoinAsset[]) => void;
  setSelectedProtocols: (protocols: Protocol[]) => void;
  toggleDarkMode: () => void;
  setAlertsEnabled: (enabled: boolean) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  updateCalculatorParams: (params: Partial<LoopCalculatorParams>) => void;
  addAlertRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void;
  updateAlertRule: (id: string, updates: Partial<AlertRule>) => void;
  removeAlertRule: (id: string) => void;
  addNotification: (notification: Omit<AlertNotification, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

// Persisted store state (for localStorage)
export interface PersistedUIState {
  selectedChains: Chain[];
  selectedAssets: StablecoinAsset[];
  selectedProtocols: Protocol[];
  darkMode: boolean;
  alertsEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  calculatorParams: LoopCalculatorParams;
  alertRules: AlertRule[];
}

// Store slice types for modular state management
export interface ChainSelectionSlice {
  selectedChains: Chain[];
  selectedAssets: StablecoinAsset[];
  selectedProtocols: Protocol[];
  setSelectedChains: (chains: Chain[]) => void;
  setSelectedAssets: (assets: StablecoinAsset[]) => void;
  setSelectedProtocols: (protocols: Protocol[]) => void;
}

export interface PreferencesSlice {
  darkMode: boolean;
  alertsEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  toggleDarkMode: () => void;
  setAlertsEnabled: (enabled: boolean) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
}

export interface CalculatorSlice {
  calculatorParams: LoopCalculatorParams;
  updateCalculatorParams: (params: Partial<LoopCalculatorParams>) => void;
}

export interface AlertsSlice {
  alertRules: AlertRule[];
  notifications: AlertNotification[];
  addAlertRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void;
  updateAlertRule: (id: string, updates: Partial<AlertRule>) => void;
  removeAlertRule: (id: string) => void;
  addNotification: (notification: Omit<AlertNotification, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

// Store actions for external use
export interface StoreActions {
  reset: () => void;
  hydrate: (state: Partial<PersistedUIState>) => void;
  getPersistedState: () => PersistedUIState;
}