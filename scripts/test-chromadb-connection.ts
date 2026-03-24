// scripts/test-chromadb-connection.ts
import { ChromaClient, Collection } from 'chromadb';

/**
 * Script de test pour vérifier la connexion ChromaDB
 * Exécuter: npx tsx scripts/test-chromadb-connection.ts
 */

interface TestResult {
  test: string;
  status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING';
  message: string;
  duration?: number;
  details?: any;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

class ChromaDBConnectionTest {
  private client: ChromaClient;
  private results: TestResult[] = [];

  constructor() {
    this.client = new ChromaClient({
      path: "http://localhost:8000"
    });
  }

  async runAllTests() {
    console.log('\n🔍 ========== TEST CHROMADB CONNECTION ==========\n');
    
    try {
      await this.testConnection();
      await this.testCollectionsList();
      await this.testCreateCollection();
      await this.testAddDocument();
      await this.testSearch();
      await this.testDeleteCollection();
    } catch (e) {
      console.error("FATAL ERROR during tests:", e);
    }
    
    this.printSummary();
  }

  async testConnection() {
    const startTime = Date.now();
    try {
      console.log('📡 Test 1: Vérification de la connexion à ChromaDB...');
      const collections = await this.client.listCollections();
      this.results.push({
        test: 'Connexion à ChromaDB',
        status: '✅ PASS',
        message: `Connexion établie, ${collections.length} collections trouvées`,
        duration: Date.now() - startTime
      });
      console.log('   ✅ ChromaDB connecté');
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.results.push({
        test: 'Connexion à ChromaDB',
        status: '❌ FAIL',
        message: `Échec de connexion: ${errorMessage}`,
        duration: Date.now() - startTime
      });
      console.error('   ❌ Échec de connexion:', errorMessage);
      throw error;
    }
  }

  async testCollectionsList() {
    const startTime = Date.now();
    try {
      console.log('\n📚 Test 2: Liste des collections...');
      const collections = await this.client.listCollections();
      console.log(`   ✅ ${collections.length} collections trouvées`);
      this.results.push({
        test: 'Liste des collections',
        status: '✅ PASS',
        message: `${collections.length} collections`,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        test: 'Liste des collections',
        status: '❌ FAIL',
        message: getErrorMessage(error),
        duration: Date.now() - startTime
      });
    }
  }

  async testCreateCollection() {
    const startTime = Date.now();
    try {
      console.log('\n📝 Test 3: Création d\'une collection de test...');
      const testCollectionName = `test_${generateId()}`;
      await this.client.createCollection({
        name: testCollectionName,
        metadata: { description: "Collection de test" }
      });
      console.log(`   ✅ Collection créée: ${testCollectionName}`);
      this.results.push({
        test: 'Création collection',
        status: '✅ PASS',
        message: `Collection créée: ${testCollectionName}`,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        test: 'Création collection',
        status: '❌ FAIL',
        message: getErrorMessage(error),
        duration: Date.now() - startTime
      });
    }
  }

  async testAddDocument() {
    const startTime = Date.now();
    try {
      console.log('\n📄 Test 4: Ajout d\'un document...');
      const collectionName = `test_docs_${generateId()}`;
      const collection = await this.client.createCollection({
        name: collectionName,
        metadata: { description: "Test documents" }
      });
      await collection.add({
        ids: ["doc1"],
        documents: ["Contenu de test pour ChromaDB"],
        metadatas: [{ source: "test" }]
      });
      console.log(`   ✅ Document ajouté dans ${collectionName}`);
      this.results.push({
        test: 'Ajout document',
        status: '✅ PASS',
        message: `Document ajouté avec succès`,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        test: 'Ajout document',
        status: '❌ FAIL',
        message: getErrorMessage(error),
        duration: Date.now() - startTime
      });
    }
  }

  async testSearch() {
    const startTime = Date.now();
    try {
      console.log('\n🔍 Test 5: Recherche sémantique...');
      const collectionName = `test_search_${generateId()}`;
      const collection = await this.client.createCollection({
        name: collectionName
      });
      await collection.add({
        ids: ["search1"],
        documents: ["Le moteur TG1 est en panne."],
        metadatas: [{ equipement: "TG1" }]
      });
      const results = await collection.query({
        queryTexts: ["moteur en panne"],
        nResults: 1
      });
      console.log(`   ✅ Recherche effectuée: ${results.documents?.[0]?.length || 0} résultats`);
      this.results.push({
        test: 'Recherche sémantique',
        status: '✅ PASS',
        message: `Recherche effectuée`,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        test: 'Recherche sémantique',
        status: '❌ FAIL',
        message: getErrorMessage(error),
        duration: Date.now() - startTime
      });
    }
  }

  async testDeleteCollection() {
    const startTime = Date.now();
    try {
      console.log('\n🗑️ Test 6: Nettoyage...');
      const collections = await this.client.listCollections();
      let deleted = 0;
      for (const col of collections) {
        const name = typeof col === 'string' ? col : col.name;
        if (name.startsWith('test_')) {
          await this.client.deleteCollection({ name });
          deleted++;
        }
      }
      console.log(`   ✅ ${deleted} collections de test supprimées`);
      this.results.push({
        test: 'Nettoyage',
        status: '✅ PASS',
        message: `${deleted} collections supprimées`,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.results.push({
        test: 'Nettoyage',
        status: '⚠️ WARNING',
        message: getErrorMessage(error),
        duration: Date.now() - startTime
      });
    }
  }

  printSummary() {
    console.log('\n📋 ========== RÉSUMÉ ==========\n');
    this.results.forEach(r => {
      console.log(`${r.status} ${r.test} (${r.duration}ms) - ${r.message}`);
    });
    const failed = this.results.filter(r => r.status === '❌ FAIL').length;
    if (failed === 0) {
      console.log('\n✨ TOUS LES TESTS ONT RÉUSSI !');
    } else {
      console.log(`\n⚠️  ${failed} TESTS ONT ÉCHOUÉ.`);
      process.exit(1);
    }
  }
}

const tester = new ChromaDBConnectionTest();
tester.runAllTests().catch(console.error);