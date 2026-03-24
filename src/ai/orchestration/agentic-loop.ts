// src/ai/orchestration/agentic-loop.ts
import { executeMCPTool, type MCPTool } from '@/ai/mcp/service';

export interface Step {
  id: string;
  tool: MCPTool;  // ← Utiliser le type MCPTool au lieu de string
  action: string;
  params: Record<string, any>;
  description?: string;
}

export interface LoopContext {
  userId: string;
  request: string;
  [key: string]: any;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
}

export interface LoopResult {
  success: boolean;
  request: string;
  results: StepResult[];
  summary: string;
  error?: string;
}

export class AgenticLoop {
  
  async executeStep(step: Step, context: LoopContext): Promise<StepResult> {
    try {
      // Maintenant step.tool est de type MCPTool, donc compatible
      const result = await executeMCPTool({
        tool: step.tool,
        action: step.action,
        parameters: {
          ...step.params,
          context
        },
        userId: context.userId
      });
      
      return {
        stepId: step.id,
        success: true,
        result,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  async runAgenticLoop(request: string, userId: string): Promise<LoopResult> {
    try {
      const steps = await this.decomposeRequest(request);
      const results: StepResult[] = [];
      const context: LoopContext = { userId, request };
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepResult = await this.executeStep(step, context);
        results.push(stepResult);
        
        if (stepResult.success && stepResult.result) {
          context[`step_${step.id}`] = stepResult.result;
        }
      }
      
      const summary = `Traitement terminé en ${results.length} étapes`;
      
      return {
        success: true,
        request,
        results,
        summary
      };
    } catch (error) {
      return {
        success: false,
        request,
        results: [],
        summary: "Erreur lors de l'exécution",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async decomposeRequest(request: string): Promise<Step[]> {
    const steps: Step[] = [];
    
    // Maintenant les valeurs doivent correspondre au type MCPTool
    if (request.toLowerCase().includes('recherche') || request.toLowerCase().includes('trouve')) {
      steps.push({
        id: 'search',
        tool: 'search',  // ← Doit être une valeur valide de MCPTool
        action: 'web',
        params: { query: request },
        description: 'Recherche d\'information'
      });
    }
    
    if (request.toLowerCase().includes('email') || request.toLowerCase().includes('envoie')) {
      steps.push({
        id: 'email',
        tool: 'email',  // ← Doit être une valeur valide de MCPTool
        action: 'draft',
        params: { content: request },
        description: 'Préparation d\'email'
      });
    }
    
    if (request.toLowerCase().includes('document') || request.toLowerCase().includes('fichier')) {
      steps.push({
        id: 'document',
        tool: 'documents',  // ← Doit être une valeur valide de MCPTool
        action: 'read',
        params: { query: request },
        description: 'Consultation de document'
      });
    }
    
    if (request.toLowerCase().includes('calendrier') || request.toLowerCase().includes('rendez-vous')) {
      steps.push({
        id: 'calendar',
        tool: 'calendar',  // ← Doit être une valeur valide de MCPTool
        action: 'checkAvailability',
        params: { query: request },
        description: 'Vérification calendrier'
      });
    }
    
    if (request.toLowerCase().includes('calcul') || request.toLowerCase().includes('math')) {
      steps.push({
        id: 'calculator',
        tool: 'calculator',  // ← Doit être une valeur valide de MCPTool
        action: 'calculate',
        params: { expression: request.replace(/calcul/g, '') },
        description: 'Calcul mathématique'
      });
    }
    
    // Valeur par défaut
    if (steps.length === 0) {
      steps.push({
        id: 'default',
        tool: 'search',  // ← Doit être une valeur valide de MCPTool
        action: 'web',
        params: { query: request },
        description: 'Traitement général'
      });
    }
    
    return steps;
  }
}

export const agenticLoop = new AgenticLoop();