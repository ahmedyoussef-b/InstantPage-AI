// src/ai/rag/fallback-data.ts
// Données structurées pour le fallback - Basé sur votre centrale

export const fallbackData: Record<string, (query: string) => string | null> = {
  // Turbines à gaz TG1/TG2
  tg1: (q) => {
    if (q.includes("puissance")) {
      return "TG1: Turbine à gaz GE Frame 9E, puissance nominale 125 MW, maximale 130 MW";
    }
    if (q.includes("température")) {
      return "TG1: Température admission 1100°C, température sortie 550°C";
    }
    if (q.includes("débit") || q.includes("debit")) {
      return "TG1: Débit gaz 380,000 Nm³/h, débit air 450 kg/s";
    }
    if (q.includes("rendement") || q.includes("efficacité")) {
      return "TG1: Rendement 35% simple cycle, 52% en cogénération";
    }
    return "TG1: Turbine à gaz GE Frame 9E - 125 MW, admission 1100°C";
  },
  
  // Turbine vapeur TV
  tv: (q) => {
    if (q.includes("puissance")) {
      return "Turbine vapeur: 80 MW, admission vapeur 540°C, 100 bar";
    }
    if (q.includes("température")) {
      return "Turbine vapeur: Admission 540°C, échappement 35°C";
    }
    if (q.includes("pression")) {
      return "Turbine vapeur: Admission 100 bar, échappement 0.05 bar";
    }
    return "Turbine vapeur: 80 MW, 540°C, cycle combiné avec TG";
  },
  
  // Procédures
  demarrage: (q) => {
    return "Procédure démarrage TG1:\n1. Vérifier niveaux huile et gaz\n2. Ventilation 5 minutes\n3. Purge circuit gaz\n4. Rotation à 500 tr/min\n5. Injection gaz et allumage\n6. Accélération à 3000 tr/min\n7. Synchronisation réseau\nTemps total: ~25 minutes";
  },
  
  arret: (q) => {
    return "Procédure arrêt TG1:\n1. Délestage progressif\n2. Refroidissement 10 min\n3. Arrêt injection gaz\n4. Rotation post-combustion 15 min\n5. Arrêt rotation\n6. Mise en sécurité";
  },
  
  urgence: (q) => {
    return "Procédure arrêt d'urgence:\n1. Coupure immédiate gaz\n2. Activation système extinction\n3. Ventilation forcée\n4. Rotation post-incendie\n5. Diagnostic automatique";
  },
  
  // Maintenance
  maintenance: (q) => {
    if (q.includes("preventive") || q.includes("préventive")) {
      return "Maintenance préventive:\n• Quotidien: inspection visuelle, relevés\n• Hebdomadaire: filtres air, analyse huile\n• Mensuel: bougies, capteurs\n• 8000h: injecteurs, vannes\n• 24000h: révision complète turbine";
    }
    if (q.includes("corrective")) {
      return "Maintenance corrective:\n• Diagnostic par analyse vibrations\n• Remplacement composants défectueux\n• Test post-réparation";
    }
    return "Plan maintenance: préventive quotidienne, révision 24000h";
  },
  
  // Alarmes
  alarme: (q) => {
    if (q.includes("température")) {
      return "Alarme température:\n• >580°C: avertissement\n• >600°C: réduction charge\n• >620°C: arrêt programmé\n• >650°C: arrêt d'urgence";
    }
    if (q.includes("vibration")) {
      return "Alarme vibration:\n• >4.5 mm/s: avertissement\n• >5.5 mm/s: vérification\n• >7.0 mm/s: arrêt d'urgence";
    }
    return "Alarmes critiques: température >620°C, vibration >7.0 mm/s, pression gaz >25 bar";
  }
};

export function getFallbackAnswer(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  for (const [key, handler] of Object.entries(fallbackData)) {
    if (lowerQuery.includes(key)) {
      const answer = handler(lowerQuery);
      if (answer) return answer;
    }
  }
  
  return null;
}
