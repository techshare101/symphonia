/**
 * Auto-DJ Engine - Main Export
 * 
 * Complete 3-layer Auto-DJ system with 4 performance modes:
 * - Smooth Club (A1)
 * - High Energy (A2)
 * - Latin Salsa (A3) - Default
 * - Cinematic AI (A4)
 */

export { TransportController, DeckState } from './TransportController';
export { TransitionEngine } from './TransitionEngine';
export { QueueNavigator, type ArcPosition } from './QueueNavigator';
export { AutoDJMasterController, type AutoDJConfig } from './AutoDJMasterController';
export { AutoDJMode } from './types';

export type {
    Track,
    TransitionProfile,
    TransitionPlan,
    StructureMap,
    ClavePattern,
    SalsaAnalysis
} from './types';
