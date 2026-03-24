
/**
 * @fileOverview ContextualValidator - Innovation 21.
 * Validation de la sécurité et de la pertinence des actions avant exécution.
 */

import { ai } from '@/ai/genkit';

export interface Action {
  type: 'respond' | 'use_tool' | 'command' | 'delete' | 'plan' | 'PLANIFICATION';
  tool?: string;
  params?: any;
  command?: string;
  backup?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAlternative?: Action;
}

/**
 * Valide une action par rapport au contexte actuel.
 */
export async function validateAction(action: any, context: string): Promise<ValidationResult> {
  console.log(`[AI][VALIDATOR] Analyse de sécurité pour l'action: ${action.type || action.tool}`);

  // 1. Vérifications de base (Hard-coded safety rules)
  const basicCheck = checkBasicSafety(action);
  if (!basicCheck.valid) return basicCheck;

  // 2. Vérification de pertinence contextuelle via LLM
  try {
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Contrôleur de Sécurité IA. Évalue si l'action proposée est sûre et pertinente.",
      prompt: `Action proposée: ${JSON.stringify(action)}
      Contexte actuel: ${context.substring(0, 500)}
      
      Cette action est-elle pertinente et sans risque majeur (sécurité, perte de données) ?
      Réponds en JSON STRICT: { "valid": boolean, "reason": "explication", "severity": "low|medium|high" }`,
    });

    const match = response.text.match(/\{.*\}/s);
    if (match) {
      const result = JSON.parse(match[0]);
      return {
        valid: result.valid,
        reason: result.reason,
        severity: result.severity || 'low'
      };
    }
  } catch (e) {
    console.warn("[AI][VALIDATOR] Échec validation IA, repli sur sécurité de base.");
  }

  return { valid: true, severity: 'low' };
}

function checkBasicSafety(action: any): ValidationResult {
  const type = action.type?.toLowerCase() || '';
  const tool = action.tool?.toLowerCase() || '';

  // Règle: Pas de suppression sans backup (Simulé)
  if (type === 'delete' || tool.includes('delete')) {
    if (!action.backup) {
      return { 
        valid: false, 
        reason: "Action de suppression refusée : Aucun backup détecté dans les paramètres.",
        severity: 'high'
      };
    }
  }

  // Règle: Commandes système dangereuses
  if (action.command) {
    const dangerous = ['rm -rf', 'format', 'mkfs', 'dd'];
    if (dangerous.some(cmd => action.command.includes(cmd))) {
      return { 
        valid: false, 
        reason: "Commande système interdite détectée (risque de destruction).",
        severity: 'high'
      };
    }
  }

  return { valid: true, severity: 'low' };
}

/**
 * Propose une alternative plus sûre si l'action est rejetée.
 */
export async function suggestAlternative(action: any, reason: string): Promise<Action | null> {
  try {
    const response = await ai.generate({
      model: 'ollama/tinyllama:latest',
      system: "Tu es un conseiller en sécurité technique. Propose une alternative sûre.",
      prompt: `Action refusée: ${JSON.stringify(action)}
      Raison du refus: ${reason}
      
      Propose une alternative (ex: 'lire' au lieu de 'supprimer').
      Réponds en JSON: { "type": "respond", "params": { "suggestion": "..." } }`,
    });

    const match = response.text.match(/\{.*\}/s);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}
