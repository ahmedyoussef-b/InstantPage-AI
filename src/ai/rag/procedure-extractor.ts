// src/ai/rag/procedure-extractor.ts

export interface Step {
    number: number;
    description: string;
    subSteps?: string[];
    safetyNote?: string;
    verification?: string;
    expectedOutcome?: string;
    duration?: number;
  }
  
  export function extractStepsFromContent(content: string): Step[] {
    const steps: Step[] = [];
    
    // Détection des étapes numérotées
    const stepPatterns = [
      /(?:Étape\s*)?(\d+)[\.\)]\s*([^\n]+)/gi,
      /(?:Step\s*)?(\d+)[\.\)]\s*([^\n]+)/gi,
      /(\d+)\s*-\s*([^\n]+)/gi
    ];
    
    for (const pattern of stepPatterns) {
      let match;
      const matches: { number: number; description: string; fullMatch: string; index: number }[] = [];
      
      while ((match = pattern.exec(content)) !== null) {
        matches.push({
          number: parseInt(match[1]),
          description: match[2].trim(),
          fullMatch: match[0],
          index: match.index
        });
      }
      
      if (matches.length > 0) {
        for (const m of matches) {
          steps.push({
            number: m.number,
            description: m.description,
            subSteps: extractSubSteps(content, m.index),
            safetyNote: extractSafetyNote(content, m.number),
            verification: extractVerification(content, m.number),
            expectedOutcome: extractExpectedOutcome(content, m.number),
            duration: extractDuration(content, m.number)
          });
        }
        break;
      }
    }
    
    // Tri par numéro
    steps.sort((a, b) => a.number - b.number);
    
    return steps;
  }
  
  function extractSubSteps(content: string, stepIndex: number): string[] {
    const subSteps: string[] = [];
    const subPattern = /[•\-*]\s*([^\n]+)/g;
    
    // Extraire la section autour de l'étape
    const start = Math.max(0, stepIndex);
    const end = Math.min(content.length, start + 500);
    const section = content.substring(start, end);
    
    let match;
    while ((match = subPattern.exec(section)) !== null) {
      subSteps.push(match[1].trim());
    }
    
    return subSteps;
  }
  
  function extractSafetyNote(content: string, stepNumber: number): string | undefined {
    const patterns = [
      new RegExp(`(?:Étape ${stepNumber}|${stepNumber}[\.\)])\\s*.*?(?:⚠️|ATTENTION|SÉCURITÉ|PRÉCAUTION)[:\\s]*([^.!?]+[.!?])`, 'i'),
      /(?:⚠️|ATTENTION|SÉCURITÉ)[:\s]*([^.!?]+[.!?])/i
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match) return match[1].trim();
    }
    
    return undefined;
  }
  
  function extractVerification(content: string, stepNumber: number): string | undefined {
    const patterns = [
      /(?:Vérification|Check|Contrôle)[:\s]*([^.!?]+[.!?])/i,
      /✓\s*([^.!?]+[.!?])/i
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match) return match[1].trim();
    }
    
    return undefined;
  }
  
  function extractExpectedOutcome(content: string, stepNumber: number): string | undefined {
    const patterns = [
      /(?:Résultat attendu|Expected outcome)[:\s]*([^.!?]+[.!?])/i,
      /→\s*([^.!?]+[.!?])/i
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match) return match[1].trim();
    }
    
    return undefined;
  }
  
  function extractDuration(content: string, stepNumber: number): number | undefined {
    const pattern = /(\d+)\s*(?:min|minutes|secondes|sec)/i;
    const match = pattern.exec(content);
    if (match) return parseInt(match[1]);
    return undefined;
  }