
/**
 * @fileOverview AsyncWorkflow - Innovation 23.
 * Gestion des tâches longues en arrière-plan avec suivi de progression.
 */

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

export interface WorkflowStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error?: WorkflowError;
  startedAt?: number;
  completedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface WorkflowError {
  code: string;
  message: string;
  stepId?: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  timestamp: number;
}

export interface WorkflowMetadata {
  userId?: string;
  source: 'chat' | 'agent' | 'procedure' | 'system';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  estimatedDuration?: number;
  callbackUrl?: string;
}

export type WorkflowStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface Workflow {
  id: string;
  type: string;
  task: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  progress: number;
  startedAt?: number;
  completedAt?: number;
  error?: WorkflowError;
  metadata: WorkflowMetadata;
  createdAt: number;
  updatedAt: number;
  timeout?: number;
}

export interface WorkflowMetrics {
  totalWorkflows: number;
  activeWorkflows: number;
  queuedWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  cancelledWorkflows: number;
  pausedWorkflows: number;
  averageCompletionTime: number;
  successRate: number;
}

export interface WorkflowFilter {
  status?: WorkflowStatus;
  type?: string;
  userId?: string;
  fromDate?: number;
  toDate?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface WorkflowUpdate {
  status?: WorkflowStatus;
  progress?: number;
  steps?: WorkflowStep[];
  error?: WorkflowError;
  metadata?: Partial<WorkflowMetadata>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_TIMEOUT = 30 * 60 * 1000;
const MAX_CONCURRENT_WORKFLOWS = 10;
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_AGE_KEEP = 24 * 60 * 60 * 1000;

// ============================================================================
// FONCTIONS UTILITAIRES POUR LES VÉRIFICATIONS DE STATUT
// ============================================================================

/**
 * Vérifie si un workflow est dans un état qui permet l'exécution
 */
function isWorkflowActive(status: WorkflowStatus): boolean {
  return status === 'running' || status === 'queued';
}

/**
 * Vérifie si un workflow est terminé (avec succès ou échec)
 */
function isWorkflowCompleted(status: WorkflowStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

/**
 * Vérifie si un workflow peut être annulé
 */
function canCancelWorkflow(status: WorkflowStatus): boolean {
  return status === 'queued' || status === 'running' || status === 'paused';
}

/**
 * Vérifie si un workflow peut être mis en pause
 */
function canPauseWorkflow(status: WorkflowStatus): boolean {
  return status === 'running';
}

/**
 * Vérifie si un workflow peut être repris
 */
function canResumeWorkflow(status: WorkflowStatus): boolean {
  return status === 'paused';
}

// ============================================================================
// REGISTRE DES WORKFLOWS
// ============================================================================

class WorkflowRegistry {
  private workflows: Map<string, Workflow> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private activeCount = 0;

  constructor() {
    this.startCleanupTimer();
  }

  set(id: string, workflow: Workflow): void {
    workflow.updatedAt = Date.now();
    const oldWorkflow = this.workflows.get(id);
    const wasActive = oldWorkflow ? isWorkflowActive(oldWorkflow.status) : false;
    const isActive = isWorkflowActive(workflow.status);
    
    if (!wasActive && isActive) this.activeCount++;
    if (wasActive && !isActive) this.activeCount--;
    
    this.workflows.set(id, workflow);
  }

  get(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  delete(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (workflow && isWorkflowActive(workflow.status)) {
      this.activeCount--;
    }
    return this.workflows.delete(id);
  }

  getAll(filter?: WorkflowFilter): Workflow[] {
    let workflows = Array.from(this.workflows.values());

    if (filter) {
      workflows = workflows.filter(w => {
        if (filter.status && w.status !== filter.status) return false;
        if (filter.type && w.type !== filter.type) return false;
        if (filter.userId && w.metadata.userId !== filter.userId) return false;
        if (filter.fromDate && w.createdAt < filter.fromDate) return false;
        if (filter.toDate && w.createdAt > filter.toDate) return false;
        if (filter.tags && !filter.tags.every(t => w.metadata.tags.includes(t))) return false;
        return true;
      });
    }

    workflows.sort((a, b) => b.createdAt - a.createdAt);

    if (filter?.offset || filter?.limit) {
      const offset = filter?.offset || 0;
      const limit = filter?.limit || workflows.length;
      workflows = workflows.slice(offset, offset + limit);
    }

    return workflows;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.workflows.forEach((workflow, id) => {
      if (isWorkflowCompleted(workflow.status)) {
        const age = now - (workflow.completedAt || workflow.updatedAt);
        if (age > MAX_AGE_KEEP) {
          toDelete.push(id);
        }
      }
    });

    toDelete.forEach(id => {
      this.workflows.delete(id);
    });
  }

  private startCleanupTimer(): void {
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
      if (this.cleanupTimer?.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

const workflowRegistry = new WorkflowRegistry();

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

export async function submitWorkflow(
  type: string, 
  task: string,
  metadata?: Partial<WorkflowMetadata>
): Promise<string> {
  if (workflowRegistry.getActiveCount() >= MAX_CONCURRENT_WORKFLOWS) {
    throw new Error(`Limite de workflows concurrents atteinte (${MAX_CONCURRENT_WORKFLOWS})`);
  }

  const workflowId = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  const workflow: Workflow = {
    id: workflowId,
    type,
    task,
    status: 'queued',
    progress: 0,
    steps: [
      { 
        id: '1', 
        label: 'Analyse initiale', 
        description: 'Compréhension de la tâche et planification',
        status: 'pending', 
        progress: 0 
      },
      { 
        id: '2', 
        label: 'Traitement des données', 
        description: 'Exécution des actions nécessaires',
        status: 'pending', 
        progress: 0 
      },
      { 
        id: '3', 
        label: 'Synthèse finale', 
        description: 'Génération du résultat et validation',
        status: 'pending', 
        progress: 0 
      }
    ],
    metadata: {
      userId: metadata?.userId,
      source: metadata?.source || 'system',
      priority: metadata?.priority || 'medium',
      tags: metadata?.tags || [],
      estimatedDuration: metadata?.estimatedDuration,
      callbackUrl: metadata?.callbackUrl
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    timeout: DEFAULT_TIMEOUT
  };

  workflowRegistry.set(workflowId, workflow);
  
  processWorkflow(workflowId, task).catch(error => {
    console.error(`❌ Erreur workflow ${workflowId}:`, error);
    updateWorkflowError(workflowId, {
      code: 'PROCESS_ERROR',
      message: error.message,
      retryable: false,
      timestamp: Date.now()
    });
  });
  
  return workflowId;
}

export async function getWorkflowStatus(workflowId: string): Promise<Workflow | null> {
  return workflowRegistry.get(workflowId) || null;
}

export async function getWorkflows(filter?: WorkflowFilter): Promise<Workflow[]> {
  return workflowRegistry.getAll(filter);
}

export async function updateWorkflow(
  workflowId: string, 
  update: WorkflowUpdate
): Promise<Workflow | null> {
  const workflow = workflowRegistry.get(workflowId);
  if (!workflow) return null;

  if (update.status) workflow.status = update.status;
  if (update.progress !== undefined) workflow.progress = update.progress;
  if (update.steps) workflow.steps = update.steps;
  if (update.error) workflow.error = update.error;
  if (update.metadata) {
    workflow.metadata = { ...workflow.metadata, ...update.metadata };
  }

  workflow.updatedAt = Date.now();
  workflowRegistry.set(workflowId, workflow);

  return workflow;
}

export async function updateWorkflowError(
  workflowId: string,
  error: WorkflowError
): Promise<void> {
  const workflow = workflowRegistry.get(workflowId);
  if (workflow) {
    workflow.error = error;
    workflow.status = 'failed';
    workflow.updatedAt = Date.now();
    workflowRegistry.set(workflowId, workflow);
  }
}

export async function cancelWorkflow(workflowId: string): Promise<boolean> {
  const workflow = workflowRegistry.get(workflowId);
  
  if (workflow && canCancelWorkflow(workflow.status)) {
    workflow.status = 'cancelled';
    workflow.updatedAt = Date.now();
    workflowRegistry.set(workflowId, workflow);
    return true;
  }
  return false;
}

export async function pauseWorkflow(workflowId: string): Promise<boolean> {
  const workflow = workflowRegistry.get(workflowId);
  
  if (workflow && canPauseWorkflow(workflow.status)) {
    workflow.status = 'paused';
    workflow.updatedAt = Date.now();
    workflowRegistry.set(workflowId, workflow);
    return true;
  }
  return false;
}

export async function resumeWorkflow(workflowId: string): Promise<boolean> {
  const workflow = workflowRegistry.get(workflowId);
  
  if (workflow && canResumeWorkflow(workflow.status)) {
    workflow.status = 'running';
    workflow.updatedAt = Date.now();
    workflowRegistry.set(workflowId, workflow);
    
    processWorkflow(workflowId, workflow.task).catch(console.error);
    return true;
  }
  return false;
}

export async function deleteWorkflow(workflowId: string): Promise<boolean> {
  return workflowRegistry.delete(workflowId);
}

export async function getWorkflowMetrics(): Promise<WorkflowMetrics> {
  const workflows = workflowRegistry.getAll();
  const now = Date.now();
  
  const completed = workflows.filter(w => w.status === 'completed');
  const totalCompleted = completed.length;
  
  const avgTime = completed.reduce((sum, w) => {
    const duration = (w.completedAt || now) - (w.startedAt || w.createdAt);
    return sum + duration;
  }, 0) / (totalCompleted || 1);
  
  const failed = workflows.filter(w => w.status === 'failed').length;
  const totalFinished = totalCompleted + failed;
  const successRate = totalFinished > 0 ? (totalCompleted / totalFinished) * 100 : 100;
  
  return {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter(w => isWorkflowActive(w.status)).length,
    queuedWorkflows: workflows.filter(w => w.status === 'queued').length,
    completedWorkflows: totalCompleted,
    failedWorkflows: failed,
    cancelledWorkflows: workflows.filter(w => w.status === 'cancelled').length,
    pausedWorkflows: workflows.filter(w => w.status === 'paused').length,
    averageCompletionTime: avgTime,
    successRate
  };
}

// ============================================================================
// LOGIQUE INTERNE
// ============================================================================

async function processWorkflow(id: string, task: string): Promise<void> {
  const workflow = workflowRegistry.get(id);
  if (!workflow) return;

  // CORRECTION: Utiliser les fonctions utilitaires
  if (!isWorkflowActive(workflow.status)) {
    return;
  }

  workflow.status = 'running';
  workflow.startedAt = Date.now();
  workflowRegistry.set(id, workflow);

  try {
    for (let i = 0; i < workflow.steps.length; i++) {
      // CORRECTION: Vérifications via le registre pour avoir le statut à jour
      const currentWorkflow = workflowRegistry.get(id);
      if (!currentWorkflow) break;
      
      if (currentWorkflow.status === 'cancelled') {
        break;
      }
      
      if (currentWorkflow.status === 'paused') {
        await waitForResume(id);
        // Re-vérifier après reprise
        const afterPause = workflowRegistry.get(id);
        if (!afterPause || afterPause.status === 'cancelled') break;
      }

      const step = workflow.steps[i];
      step.status = 'running';
      step.startedAt = Date.now();
      
      const stepDuration = 2000;
      const stepInterval = 250;
      const steps = stepDuration / stepInterval;
      
      for (let p = 1; p <= steps; p++) {
        // Re-vérifier à chaque itération
        const current = workflowRegistry.get(id);
        if (!current) break;
        
        if (current.status === 'cancelled') {
          step.status = 'cancelled';
          break;
        }
        
        if (current.status === 'paused') {
          await waitForResume(id);
          const afterPause = workflowRegistry.get(id);
          if (!afterPause || afterPause.status === 'cancelled') {
            step.status = 'cancelled';
            break;
          }
        }

        step.progress = Math.round((p / steps) * 100);
        workflow.progress = Math.round(
          ((i * 100) + step.progress) / workflow.steps.length
        );
        
        workflowRegistry.set(id, workflow);
        await new Promise(resolve => setTimeout(resolve, stepInterval));
      }

      if (step.status !== 'cancelled') {
        step.status = 'completed';
        step.completedAt = Date.now();
        step.progress = 100;
      }
    }

    // Vérification finale
    const finalWorkflow = workflowRegistry.get(id);
    if (finalWorkflow && 
        finalWorkflow.status !== 'cancelled' && 
        finalWorkflow.status !== 'failed') {
      finalWorkflow.status = 'completed';
      finalWorkflow.completedAt = Date.now();
      finalWorkflow.progress = 100;
      workflowRegistry.set(id, finalWorkflow);
      
      if (finalWorkflow.metadata.callbackUrl) {
        await notifyCompletion(finalWorkflow);
      }
    }

  } catch (error) {
    const failedWorkflow = workflowRegistry.get(id);
    if (failedWorkflow) {
      failedWorkflow.status = 'failed';
      failedWorkflow.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        retryable: true,
        timestamp: Date.now()
      };
      failedWorkflow.completedAt = Date.now();
      failedWorkflow.updatedAt = Date.now();
      workflowRegistry.set(id, failedWorkflow);
    }
  }
}

async function waitForResume(workflowId: string): Promise<void> {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const workflow = workflowRegistry.get(workflowId);
      if (!workflow) {
        clearInterval(checkInterval);
        resolve();
        return;
      }
      
      if (workflow.status === 'running' || workflow.status === 'cancelled') {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
  });
}

async function notifyCompletion(workflow: Workflow): Promise<void> {
  if (!workflow.metadata.callbackUrl) return;
  
  try {
    await fetch(workflow.metadata.callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId: workflow.id,
        status: workflow.status,
        progress: workflow.progress,
        completedAt: workflow.completedAt,
        error: workflow.error
      })
    });
  } catch (error) {
    console.error(`❌ Erreur callback pour ${workflow.id}:`, error);
  }
}

export function shutdown(): void {
  workflowRegistry.stopCleanupTimer();
}

if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du gestionnaire de workflows...');
    shutdown();
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 Arrêt du gestionnaire de workflows...');
    shutdown();
  });
}
