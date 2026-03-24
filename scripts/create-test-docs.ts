// scripts/create-test-docs.ts
import * as fs from 'fs';
import * as path from 'path';

const TEST_BASE = path.join(process.cwd(), 'data', 'centrale_test');

const folders = [
  '01_DOCUMENTS_GENERAUX/01_PRESENTATION_GENERALE',
  '01_DOCUMENTS_GENERAUX/02_PLAN_SITE_ET_ACCES',
  '02_EQUIPEMENTS_PRINCIPAUX/TG1_TURBINE_A_GAZ_01/01_DOCUMENTS_TECHNIQUES',
  '02_EQUIPEMENTS_PRINCIPAUX/TG1_TURBINE_A_GAZ_01/02_SCHEMAS',
  '04_PROCEDURES/01_PROCEDURES_DEMARRAGE_ARRET/01_DEMARRAGE_A_FROID',
  '11_SALLE_CONTROLE_ET_CONDUITE/02_PUPITRES_ET_HMI/01_PUPITRE_TG1_CR1',
  '12_GESTION_EQUIPES_ET_HUMAIN/04_PASSATIONS_SERVICE'
];

async function main() {
  console.log('🚀 Generating test documents in:', TEST_BASE);
  
  for (const folder of folders) {
    const fullPath = path.join(TEST_BASE, folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  const tg1Fiche = `# TG1 - Fiche Technique
- Puissance: 45 MW
- Modèle: GE Frame 9E
- État: Opérationnel
`;

  const procedureDemarrage = `# Procédure Démarrage TG1
1. Vérifier gaz.
2. Lancer purge.
3. Ignition.
`;

  fs.writeFileSync(path.join(TEST_BASE, '02_EQUIPEMENTS_PRINCIPAUX/TG1_TURBINE_A_GAZ_01/01_DOCUMENTS_TECHNIQUES/001_Fiche_TG1.md'), tg1Fiche);
  fs.writeFileSync(path.join(TEST_BASE, '04_PROCEDURES/01_PROCEDURES_DEMARRAGE_ARRET/01_DEMARRAGE_A_FROID/001_Demarrage_TG1.md'), procedureDemarrage);
  
  console.log('✅ Created 2 documents.');
}

main().catch(console.error);