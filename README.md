# AGENTIC - Assistant IA Professionnel Elite 32 (Intelligence Hybride)

AGENTIC est un assistant intelligent de classe industrielle conçu pour l'exploitation technique des centrales à cycle combiné. Il repose sur une architecture **100% locale** et une **Boucle Cognitive Elite 32** intégrée dans un framework Next.js 15 haute performance.

## 🚀 Cycle de Vie d'un Document (Pipeline Elite 32)

Lorsqu'un opérateur uploade un document via le hub de **Base de Connaissances**, celui-ci traverse les phases suivantes :

### 1. PHASE D'INGESTION (Smart Ingest Pipeline)
*   **Extraction Multi-Format** : Extraction de texte brut pour MD/TXT/JSON et **OCR Industriel** via Tesseract.js & Sharp pour les images (schémas, plaques, rapports).
*   **Segmentation Sémantique (Smart Chunking)** : Découpage en segments de **1000 caractères** avec un **overlap de 200 caractères** pour garantir la continuité du contexte technique.
*   **Enrichissement des Métadonnées** : Identification automatique de l'équipement (TG1, TG2, TV), de la zone (A, B, C) et du profil cible (Chef de Bloc, Maintenance).
*   **Indexation Vectorielle** : Transformation des segments en vecteurs via `nomic-embed-text` (Ollama) et stockage dans des collections ChromaDB spécialisées.

### 2. PHASE DE RÉCUPÉRATION (HybridRAG Retrieval)
Lorsqu'une question est posée :
*   **Analyse d'Intention** : L'IA détermine s'il faut une réponse factuelle (RAG), une procédure ou une action agentique (MCP).
*   **Recherche Multi-Strate** : Interrogation simultanée de :
    1.  **Documents** (Savoir froid : manuels, fiches).
    2.  **Mémoire Épisodique** (Expériences passées et corrections).
    3.  **Graphe de Connaissances** (Relations structurelles).
*   **Re-ranking Hybride** : Pondération des sources selon la pertinence sémantique et la priorité opérationnelle.

### 3. PHASE DE RAISONNEMENT (Metacognitive Reasoning)
*   **DeepSeek Engine** : Utilisation de modèles de raisonnement avancés pour l'analyse des problématiques complexes.
*   **Auto-Évaluation** : Le module méta-cognitif calcule un score de confiance et génère un "Disclaimer" si l'information est parcellaire.
*   **Génération Citée** : Réponses structurées avec renvois explicites aux sources documentaires.

### 4. PHASE D'APPRENTISSAGE (Continuous Improvement)
*   **Feedback & Correction** : Chaque correction utilisateur est enregistrée comme une "Leçon" et vectorisée immédiatement.
*   **Cycle ML Nocturne** : Ré-optimisation quotidienne du modèle local basée sur les interactions réussies et les nouvelles données ingérées.

## 🗺️ Cartographie de l'Infrastructure

```text
📁 src/
├── 📁 ai/
│   ├── 📁 rag/             # 🧠 Intelligence RAG & Analyse sémantique
│   ├── 📁 vector/          # 🗄️ Gestionnaire ChromaDB & Embeddings
│   ├── 📁 agent/           # 🤖 Orchestrateur Agentic & Outils MCP
│   ├── 📁 learning/        # 🎓 Apprentissage continu & Distillation
│   └── 📁 training/        # 🏋️ Pipeline de Fine-Tuning local (LoRA)
├── 📁 app/
│   ├── 📁 admin/           # 🛠️ Hub de Gestion (Base de Connaissances)
│   ├── 📁 vision/          # 📷 Recherche par reconnaissance d'image
│   └── 📁 api/             # 🔌 Routes synchronisées (SSE, OCR, Ingest)
├── 📁 components/          # 🧩 Composants industriels (FileTree, SyncStatus)
└── 📁 lib/                 # 🛠️ Services (FileSystem, DocumentProcessor)
```

## 🛠️ Stack Technique Elite

*   **Framework** : Next.js 15 (App Router)
*   **Base Vectorielle** : ChromaDB (Local)
*   **Modèles IA** : 
    *   **Embeddings** : `nomic-embed-text` via Ollama.
    *   **Inférence** : DeepSeek / Mistral / Llama3 (Ollama).
*   **Traitement Image** : OCR Tesseract.js + Prétraitement Sharp.
*   **Synchronisation** : Server-Sent Events (SSE) pour le monitoring temps réel.
*   **UI** : Shadcn UI + Tailwind CSS (Thème Noir Industriel).

---
*AGENTIC - Propulsé par l'innovation Elite AI. 100% Local. 100% Privé.*
