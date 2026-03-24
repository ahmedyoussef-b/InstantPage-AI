// scripts/migrate-all-documents.ts
import { ChromaDBManager } from '../src/ai/vector/chromadb-manager';
import { CollectionName, createStandardMetadata } from '../src/ai/vector/chromadb-schema';
import { logger } from '../src/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...await scanDirectory(fullPath));
    } else if (item.endsWith('.md') || item.endsWith('.txt')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const basePath = args[0];
  if (!basePath || !fs.existsSync(basePath)) {
    console.error('Usage: npx tsx scripts/migrate-all-documents.ts <path>');
    process.exit(1);
  }

  const manager = ChromaDBManager.getInstance();
  await manager.initializeAllCollections();
  
  const files = await scanDirectory(basePath);
  console.log(`🔍 Found ${files.length} files to migrate.`);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const name = path.basename(file);
    const relativePath = path.relative(basePath, file);
    const firstPart = relativePath.split(path.sep)[0];
    
    // Simple logic for collection
    let collection: CollectionName = 'DOCUMENTS_GENERAUX';
    if (firstPart.includes('02_EQUIPEMENTS')) collection = 'EQUIPEMENTS_PRINCIPAUX';
    if (firstPart.includes('04_PROCEDURES')) collection = 'PROCEDURES_EXPLOITATION';
    if (firstPart.includes('05_CONSIGNES')) collection = 'CONSIGNES_ET_SEUILS';
    
    // Extract equipment
    let equipement: string | undefined = undefined;
    if (file.toUpperCase().includes('TG1')) equipement = 'TG1';
    
    // Set type based on folder
    let docType = 'document_technique';
    if (collection === 'PROCEDURES_EXPLOITATION') docType = 'procedure';
    if (collection === 'CONSIGNES_ET_SEUILS') docType = 'consigne';
    
    const metadata = createStandardMetadata({
      titre: name,
      type: docType,
      source: file,
      equipement
    });

    try {
      await manager.addDocuments(collection, [{
        id: metadata.id,
        content,
        metadata
      }]);
      console.log(`✅ Migrated: ${name} to ${collection} (Type: ${docType}, Equip: ${equipement || 'none'})`);
    } catch (e) {
      console.error(`❌ Error migrating ${name}:`, e);
      throw e;
    }
  }
  
  console.log('\n✨ MIGRATION DONE!');
}

main().catch(console.error);