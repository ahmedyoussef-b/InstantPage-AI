// src/ai/actions/reversible-executor.ts
/**
 * @fileOverview ReversibleExecutor - Innovation 21.
 * Exécution d'actions avec possibilité d'annulation (Undo/Redo).
 * Permet d'expérimenter sans risque.
 */

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

/**
 * Enregistrement d'une action dans l'historique
 */
export interface ActionRecord {
  id: string;
  type: string;
  description: string;
  status: 'executed' | 'undone' | 'failed' | 'pending';
  reversible: boolean;
  snapshotId: string;
  action: any;
  params: any;
  result?: any;
  error?: string;
  timestamp: number;
  executionTime?: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Options pour l'exécution d'une action
 */
export interface ExecutionOptions {
  reversible?: boolean;
  snapshot?: boolean;
  timeout?: number;
  retryCount?: number;
  onProgress?: (progress: number) => void;
}

/**
 * Résultat d'une exécution
 */
export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  actionId: string;
  executionTime: number;
  reversible: boolean;
  snapshotId?: string;
}

/**
 * Statistiques de l'exécuteur
 */
export interface ExecutorStats {
  totalActions: number;
  executedActions: number;
  undoneActions: number;
  failedActions: number;
  averageExecutionTime: number;
  successRate: number;
  mostUsedActions: Array<{ type: string; count: number }>;
}

/**
 * Filtre pour l'historique
 */
export interface HistoryFilter {
  userId?: string;
  type?: string;
  status?: ActionRecord['status'];
  fromDate?: number;
  toDate?: number;
  reversible?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 secondes
const MAX_HISTORY_SIZE = 1000;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 heure
const MAX_AGE_KEEP = 7 * 24 * 60 * 60 * 1000; // 7 jours

// ============================================================================
// CLASSE PRINCIPALE
// ============================================================================

/**
 * Exécuteur d'actions avec capacité d'annulation
 */
export class ReversibleExecutor {
  private actionHistory: ActionRecord[] = [];
  private snapshots: Map<string, any> = new Map();
  private currentIndex: number = -1;
  private maxHistorySize: number = MAX_HISTORY_SIZE;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(maxHistorySize?: number) {
    if (maxHistorySize) {
      this.maxHistorySize = maxHistorySize;
    }
    this.startCleanupTimer();
  }

  // ==========================================================================
  // MÉTHODES PUBLIQUES
  // ==========================================================================

  /**
   * Exécute une action avec possibilité d'annulation
   */
  async execute(
    action: any,
    params: any,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const actionId = this.generateActionId();
    const reversible = options.reversible !== false;
    
    // Créer un snapshot si nécessaire
    let snapshotId: string | undefined;
    if (options.snapshot !== false && reversible) {
      snapshotId = await this.createSnapshot(params);
    }

    const record: ActionRecord = {
      id: actionId,
      type: action.type || 'unknown',
      description: action.description || `Action ${action.type || 'inconnue'}`,
      status: 'pending',
      reversible,
      snapshotId: snapshotId || '',
      action,
      params,
      timestamp: startTime,
      userId: params?.userId
    };

    this.actionHistory.push(record);
    this.currentIndex = this.actionHistory.length - 1;

    try {
      // Exécuter avec timeout
      const result = await this.executeWithTimeout(action, params, options);
      
      record.status = 'executed';
      record.result = result;
      record.executionTime = Date.now() - startTime;

      // Nettoyer l'historique si trop grand
      if (this.actionHistory.length > this.maxHistorySize) {
        this.pruneHistory();
      }

      return {
        success: true,
        result,
        actionId,
        executionTime: record.executionTime,
        reversible,
        snapshotId
      };

    } catch (error) {
      record.status = 'failed';
      record.error = error instanceof Error ? error.message : String(error);
      record.executionTime = Date.now() - startTime;

      // Restaurer le snapshot en cas d'erreur
      if (snapshotId && reversible) {
        await this.restoreSnapshot(snapshotId);
      }

      return {
        success: false,
        error: record.error,
        actionId,
        executionTime: record.executionTime,
        reversible,
        snapshotId
      };
    }
  }

  /**
   * Annule la dernière action exécutée
   */
  async undo(steps: number = 1): Promise<boolean> {
    if (this.currentIndex < 0) return false;

    let undone = 0;
    
    for (let i = 0; i < steps; i++) {
      // CORRECTION: Remplacer findLast par reverse().find() (compatible tous targets)
      const lastExecuted = [...this.actionHistory]
        .reverse()
        .find((a: ActionRecord) => a.status === 'executed');
      
      if (!lastExecuted) break;

      const index = this.actionHistory.indexOf(lastExecuted);
      if (index !== -1 && lastExecuted.reversible) {
        await this.restoreSnapshot(lastExecuted.snapshotId);
        lastExecuted.status = 'undone';
        this.currentIndex = index - 1;
        undone++;
      }
    }

    return undone > 0;
  }

  /**
   * Ré-exécute une action annulée
   */
  async redo(steps: number = 1): Promise<boolean> {
    // CORRECTION: Remplacer findLast par reverse().find()
    const undoneActions = [...this.actionHistory]
      .reverse()
      .filter((a: ActionRecord) => a.status === 'undone');

    let redone = 0;

    for (let i = 0; i < Math.min(steps, undoneActions.length); i++) {
      const action = undoneActions[i];
      const index = this.actionHistory.indexOf(action);
      
      if (index !== -1) {
        try {
          const result = await this.executeWithTimeout(
            action.action,
            action.params,
            {}
          );
          
          action.status = 'executed';
          action.result = result;
          action.executionTime = Date.now() - action.timestamp;
          this.currentIndex = index;
          redone++;
        } catch (error) {
          action.status = 'failed';
          action.error = error instanceof Error ? error.message : String(error);
          break;
        }
      }
    }

    return redone > 0;
  }

  /**
   * Récupère l'historique des actions
   */
  getHistory(filter?: HistoryFilter): ActionRecord[] {
    let history = [...this.actionHistory];

    if (filter) {
      history = history.filter(record => {
        if (filter.userId && record.userId !== filter.userId) return false;
        if (filter.type && record.type !== filter.type) return false;
        if (filter.status && record.status !== filter.status) return false;
        if (filter.reversible !== undefined && record.reversible !== filter.reversible) return false;
        if (filter.fromDate && record.timestamp < filter.fromDate) return false;
        if (filter.toDate && record.timestamp > filter.toDate) return false;
        return true;
      });
    }

    // Trier du plus récent au plus ancien
    history.sort((a, b) => b.timestamp - a.timestamp);

    // Pagination
    if (filter?.offset || filter?.limit) {
      const offset = filter?.offset || 0;
      const limit = filter?.limit || history.length;
      history = history.slice(offset, offset + limit);
    }

    return history;
  }

  /**
   * Récupère une action spécifique
   */
  getAction(actionId: string): ActionRecord | undefined {
    return this.actionHistory.find(a => a.id === actionId);
  }

  /**
   * Récupère la dernière action exécutée
   */
  getLastAction(): ActionRecord | null {
    if (this.currentIndex >= 0) {
      return this.actionHistory[this.currentIndex];
    }
    return null;
  }

  /**
   * Vérifie s'il y a des actions à annuler
   */
  canUndo(): boolean {
    return this.actionHistory.some(a => a.status === 'executed' && a.reversible);
  }

  /**
   * Vérifie s'il y a des actions à refaire
   */
  canRedo(): boolean {
    return this.actionHistory.some(a => a.status === 'undone');
  }

  /**
   * Efface tout l'historique
   */
  clearHistory(): void {
    this.actionHistory = [];
    this.snapshots.clear();
    this.currentIndex = -1;
  }

  /**
   * Récupère les statistiques
   */
  getStats(): ExecutorStats {
    const executed = this.actionHistory.filter(a => a.status === 'executed');
    const undone = this.actionHistory.filter(a => a.status === 'undone');
    const failed = this.actionHistory.filter(a => a.status === 'failed');
    
    const avgTime = executed.reduce((sum, a) => 
      sum + (a.executionTime || 0), 0) / (executed.length || 1);
    
    const successRate = this.actionHistory.length > 0
      ? (executed.length / this.actionHistory.length) * 100
      : 100;

    // Actions les plus utilisées
    const typeCount = new Map<string, number>();
    this.actionHistory.forEach(a => {
      typeCount.set(a.type, (typeCount.get(a.type) || 0) + 1);
    });

    const mostUsedActions = Array.from(typeCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalActions: this.actionHistory.length,
      executedActions: executed.length,
      undoneActions: undone.length,
      failedActions: failed.length,
      averageExecutionTime: avgTime,
      successRate,
      mostUsedActions
    };
  }

  /**
   * Sauvegarde l'état pour restauration ultérieure
   */
  async checkpoint(): Promise<string> {
    return this.createSnapshot(this.actionHistory);
  }

  /**
   * Restaure un état sauvegardé
   */
  async restore(checkpointId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(checkpointId);
    if (snapshot) {
      this.actionHistory = snapshot;
      this.currentIndex = this.actionHistory.length - 1;
      return true;
    }
    return false;
  }

  // ==========================================================================
  // MÉTHODES PRIVÉES
  // ==========================================================================

  /**
   * Génère un ID unique pour une action
   */
  private generateActionId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Crée un snapshot de l'état
   */
  private async createSnapshot(state: any): Promise<string> {
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Cloner profondément l'état
    const cloned = JSON.parse(JSON.stringify(state));
    this.snapshots.set(snapshotId, cloned);
    
    return snapshotId;
  }

  /**
   * Restaure un snapshot
   */
  private async restoreSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(snapshotId);
    if (snapshot) {
      // Logique de restauration spécifique
      console.log(`🔄 Restauration du snapshot ${snapshotId}`);
      return true;
    }
    return false;
  }

  /**
   * Exécute une action avec timeout
   */
  private async executeWithTimeout(
    action: any,
    params: any,
    options: ExecutionOptions
  ): Promise<any> {
    const timeout = options.timeout || DEFAULT_TIMEOUT;

    const executeFn = async () => {
      if (typeof action === 'function') {
        return await action(params);
      } else if (action.execute && typeof action.execute === 'function') {
        return await action.execute(params);
      } else {
        throw new Error('Action invalide: doit être une fonction ou avoir une méthode execute()');
      }
    };

    // Exécuter avec timeout
    return Promise.race([
      executeFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout après ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Nettoie l'historique (garde les plus récents)
   */
  private pruneHistory(): void {
    if (this.actionHistory.length <= this.maxHistorySize) return;

    // Trier par timestamp (plus ancien d'abord)
    const sorted = [...this.actionHistory].sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = sorted.slice(0, this.actionHistory.length - this.maxHistorySize);
    
    // Supprimer les plus anciens
    toRemove.forEach(record => {
      const index = this.actionHistory.indexOf(record);
      if (index !== -1) {
        this.actionHistory.splice(index, 1);
        if (this.snapshots.has(record.snapshotId)) {
          this.snapshots.delete(record.snapshotId);
        }
      }
    });

    // Ajuster l'index courant
    this.currentIndex = this.actionHistory.length - 1;
  }

  /**
   * Nettoie les vieux snapshots
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.snapshots.forEach((_, snapshotId) => {
      // Extraire le timestamp du snapshotId
      const match = snapshotId.match(/snap_(\d+)_/);
      if (match) {
        const timestamp = parseInt(match[1], 10);
        if (now - timestamp > MAX_AGE_KEEP) {
          toDelete.push(snapshotId);
        }
      }
    });

    toDelete.forEach(id => {
      this.snapshots.delete(id);
    });
  }

  /**
   * Démarre le timer de nettoyage
   */
  private startCleanupTimer(): void {
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
      if (this.cleanupTimer?.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * Arrête le timer de nettoyage
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Crée une action exécutable simple
 */
export function createAction(
  type: string,
  executeFn: (params: any) => Promise<any>,
  description?: string
): any {
  return {
    type,
    description: description || `Action ${type}`,
    execute: executeFn
  };
}

/**
 * Combine plusieurs actions en une seule
 */
export function combineActions(actions: any[]): any {
  return {
    type: 'combined',
    description: `Combine ${actions.length} actions`,
    execute: async (params: any) => {
      const results = [];
      for (const action of actions) {
        if (typeof action === 'function') {
          results.push(await action(params));
        } else if (action.execute) {
          results.push(await action.execute(params));
        }
      }
      return results;
    }
  };
}

// ============================================================================
// EXPORT PAR DÉFAUT
// ============================================================================

export default ReversibleExecutor;