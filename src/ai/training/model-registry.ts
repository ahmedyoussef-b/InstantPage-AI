/**
 * @fileOverview ModelRegistry - Gestion des versions de modèles et déploiement.
 * Architecture fonctionnelle pour compatibilité Next.js 15 Server Actions.
 */

export interface ModelVersion {
  id: string;
  path: string;
  accuracy: number;
  status: 'production' | 'backup' | 'candidate';
  deployedAt?: number;
  metrics?: any;
}

// État persistant simulé (Dans une app réelle, ce serait une DB)
let modelVersions: ModelVersion[] = [
  { 
    id: 'v1-base', 
    path: 'ollama/phi3:mini', 
    accuracy: 0.72, 
    status: 'production',
    deployedAt: Date.now() - 86400000 * 7 // Il y a une semaine
  }
];

/**
 * Enregistre un nouveau modèle candidat et décide de son déploiement.
 */
export async function registerAndDeployModel(path: string, accuracy: number, metrics?: any): Promise<boolean> {
  console.log(`[AI][REGISTRY] Tentative d'enregistrement du modèle: ${path} (Précision: ${accuracy})`);

  const newVersion: ModelVersion = {
    id: `v${modelVersions.length + 1}-${Math.random().toString(36).substring(7)}`,
    path,
    accuracy,
    status: 'candidate',
    metrics
  };

  const currentProd = modelVersions.find(v => v.status === 'production');
  
  // Règle de déploiement : Précision supérieure au modèle actuel
  if (!currentProd || accuracy > currentProd.accuracy) {
    console.log(`[AI][REGISTRY] 🚀 DEPLOIEMENT : Le nouveau modèle (${newVersion.id}) surpasse la production.`);
    
    // Basculer l'ancienne prod en backup
    modelVersions = modelVersions.map(v => 
      v.status === 'production' ? { ...v, status: 'backup' as const } : v
    );

    newVersion.status = 'production';
    newVersion.deployedAt = Date.now();
    modelVersions.push(newVersion);
    
    return true;
  }

  console.log(`[AI][REGISTRY] ⚠️ ARCHIVAGE : Le modèle candidat est moins performant que la production actuelle.`);
  modelVersions.push(newVersion);
  return false;
}

/**
 * Retourne le modèle actuellement actif en production.
 */
export async function getCurrentActiveModel(): Promise<ModelVersion> {
  return modelVersions.find(v => v.status === 'production') || modelVersions[0];
}

/**
 * Liste toutes les versions de modèles enregistrées.
 */
export async function listAllModels(): Promise<ModelVersion[]> {
  return [...modelVersions].sort((a, b) => (b.deployedAt || 0) - (a.deployedAt || 0));
}
