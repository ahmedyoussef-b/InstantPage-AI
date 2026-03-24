// src/__tests__/semantic-cache.test.ts - VERSION CORRIGÉE AVEC TYPAGES
import { SemanticCache } from '../ai/semantic-cache';

// Mock du module genkit
jest.mock('../ai/genkit', () => ({
  ai: {}
}));

describe('SemanticCache', () => {
  let cache: SemanticCache;
  
  beforeEach(() => {
    cache = new SemanticCache();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    cache.clear();
    // Nettoyer les timers si nécessaire
    if (typeof (cache as any).destroy === 'function') {
      (cache as any).destroy();
    }
  });
  
  test('devrait retourner la même réponse pour des requêtes similaires', async () => {
    // Mock de la fonction de calcul
    const mockCompute = jest.fn().mockResolvedValue('Ceci est une réponse');
    
    // Mock de getEmbedding en utilisant jest.fn() directement sur l'instance
    // Option 1: Remplacer la méthode directement
    const originalGetEmbedding = (cache as any).getEmbedding;
    (cache as any).getEmbedding = jest.fn().mockResolvedValue(Array(384).fill(0.5));
    
    // Première requête
    const result1 = await cache.getOrCompute('Quelle est la météo?', mockCompute);
    expect(result1).toBe('Ceci est une réponse');
    expect(mockCompute).toHaveBeenCalledTimes(1);
    
    // Requête similaire
    const result2 = await cache.getOrCompute('Météo aujourd\'hui?', mockCompute);
    expect(result2).toBe('Ceci est une réponse');
    expect(mockCompute).toHaveBeenCalledTimes(1); // Toujours 1 - utilisation cache
    
    // Restaurer la méthode originale
    (cache as any).getEmbedding = originalGetEmbedding;
  });
  
  test('devrait calculer la similarité cosinus correctement', () => {
    const cacheAny = cache as any;
    
    // Vecteurs identiques
    expect(cacheAny.cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
    
    // Vecteurs orthogonaux
    expect(cacheAny.cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
    
    // Vecteurs avec dimensions différentes
    expect(cacheAny.cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
    
    // Vecteurs nuls
    expect(cacheAny.cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
  
  test('devrait respecter la limite de taille du cache', async () => {
    const cacheAny = cache as any;
    cacheAny.maxCacheSize = 3;
    
    // Sauvegarder la méthode originale
    const originalGetEmbedding = cacheAny.getEmbedding;
    
    // Remplacer par une version contrôlée
    let callCount = 0;
    cacheAny.getEmbedding = jest.fn().mockImplementation(async (text: string) => {
      // Retourner un embedding différent pour chaque texte
      return Array(384).fill(callCount++);
    });
    
    // Ajouter 5 entrées
    for (let i = 0; i < 5; i++) {
      await cache.getOrCompute(`key${i}`, async () => `value${i}`);
    }
    
    // Vérifier que le cache a été nettoyé
    const stats = cache.getStats();
    expect(stats.size).toBeLessThanOrEqual(3);
    
    // Restaurer
    cacheAny.getEmbedding = originalGetEmbedding;
  });
  
  test('devrait supprimer les entrées trop anciennes', async () => {
    const cacheAny = cache as any;
    const realDateNow = Date.now;
    const mockDateNow = jest.fn();
    
    global.Date.now = mockDateNow;
    
    // Sauvegarder et remplacer getEmbedding
    const originalGetEmbedding = cacheAny.getEmbedding;
    cacheAny.getEmbedding = jest.fn().mockResolvedValue(Array(384).fill(0.1));
    
    // Ajouter une entrée à t=0
    mockDateNow.mockReturnValue(0);
    await cache.getOrCompute('old', async () => 'old response');
    
    // Avancer le temps de 25 heures
    mockDateNow.mockReturnValue(25 * 60 * 60 * 1000);
    
    // Nettoyer le cache
    cacheAny.cleanCache();
    
    // Vérifier que l'entrée a été supprimée
    expect(cache.getStats().size).toBe(0);
    
    // Restaurer
    global.Date.now = realDateNow;
    cacheAny.getEmbedding = originalGetEmbedding;
  });
  
  test('devrait gérer les erreurs d\'embedding', async () => {
    const cacheAny = cache as any;
    
    // Sauvegarder la méthode originale
    const originalGetEmbedding = cacheAny.getEmbedding;
    
    // Simuler une erreur
    cacheAny.getEmbedding = jest.fn().mockRejectedValue(new Error('Test error'));
    
    const mockCompute = jest.fn().mockResolvedValue('Réponse de secours');
    
    const result = await cache.getOrCompute('test', mockCompute);
    
    expect(result).toBe('Réponse de secours');
    expect(mockCompute).toHaveBeenCalledTimes(1);
    
    // Restaurer
    cacheAny.getEmbedding = originalGetEmbedding;
  });
});