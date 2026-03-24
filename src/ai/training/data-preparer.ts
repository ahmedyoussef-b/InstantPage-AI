/**
 * @fileOverview DataPreparer - Nettoyage et formatage des données pour le fine-tuning.
 */

import { RawTrainingData } from './data-collector';

export interface TrainingExample {
  instruction: string;
  input: string;
  output: string;
  weight: number;
}

export interface PreparedDataset {
  train: TrainingExample[];
  test: TrainingExample[];
}

/**
 * Prépare le dataset final pour le processus d'entraînement.
 */
export async function prepareDataset(rawData: RawTrainingData[]): Promise<PreparedDataset> {
  console.log(`[AI][TRAINING-DATA] Préparation de ${rawData.length} exemples...`);

  const filtered = rawData.filter(d => 
    d.output.length > 25 && 
    d.input.length > 5
  );

  const examples: TrainingExample[] = filtered.map(d => formatExample(d));
  const augmented = await augmentData(examples);

  const shuffled = augmented.sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * 0.85);

  console.log(`[AI][TRAINING-DATA] Dataset prêt : ${splitIndex} train, ${shuffled.length - splitIndex} test.`);

  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex)
  };
}

function formatExample(data: RawTrainingData): TrainingExample {
  let instruction = "";
  let weight = 1.0;

  switch (data.type) {
    case 'correction':
      instruction = "Tu es un expert technique. Corrige l'erreur suivante et fournis la réponse exacte basée sur les manuels.";
      weight = 3.0;
      break;
    case 'reasoning':
      instruction = "Décompose ton raisonnement technique étape par étape pour résoudre cette problématique.";
      weight = 1.5;
      break;
    case 'comprehension':
      instruction = "Synthétise les points critiques de ce document technique de manière précise.";
      weight = 1.0;
      break;
    case 'action':
      instruction = "Détermine les paramètres d'exécution optimaux pour cet outil technique.";
      weight = 2.0;
      break;
    default:
      instruction = "Réponds avec expertise et précision à la demande technique suivante.";
  }

  return {
    instruction,
    input: data.input,
    output: data.output,
    weight
  };
}

async function augmentData(examples: TrainingExample[]): Promise<TrainingExample[]> {
  const augmented = [...examples];
  examples.forEach(e => {
    if (e.weight >= 2.0) {
      augmented.push({
        ...e,
        instruction: "Action corrective impérative : " + e.instruction
      });
    }
  });
  return augmented;
}
