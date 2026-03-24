
/**
 * @fileOverview ConceptHierarchy - Innovation 32.1.
 * Construit et gère la hiérarchie sémantique des concepts techniques.
 * Permet à l'IA de comprendre les relations Parent/Enfant et Partie/Tout.
 */

import { ai } from '@/ai/genkit';

export interface ConceptNode {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  description: string;
}

export interface ConceptRelation {
  sourceId: string;
  targetId: string;
  type: 'IS_A' | 'PART_OF' | 'RELATED_TO';
}

/**
 * Extrait la hiérarchie des concepts à partir d'un texte technique.
 */
export async function extractHierarchicalConcepts(text: string): Promise<{
  nodes: ConceptNode[];
  relations: ConceptRelation[];
}> {
  console.log(`[AI][HIERARCHY] Extraction de la structure conceptuelle...`);

  try {
    const response = await ai.generate({
      model: 'ollama/phi3:mini',
      system: "Tu es un Expert en Ontologie Technique. Analyse le texte pour extraire la hiérarchie des concepts sous forme d'arbre.",
      prompt: `Analyse ce texte et identifie les 3-5 concepts clés et leurs relations hiérarchiques.
      Format JSON STRICT: { 
        "concepts": [{"id": "id_unique", "name": "Nom", "parent": "id_parent_ou_null", "desc": "..."}],
        "relations": [{"from": "id_A", "to": "id_B", "type": "IS_A|PART_OF"}]
      }
      Texte : "${text.substring(0, 1500)}"`,
    });

    const match = response.text.match(/\{.*\}/s);
    if (match) {
      const data = JSON.parse(match[0]);
      return {
        nodes: (data.concepts || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          level: c.parent ? 1 : 0,
          parentId: c.parent,
          description: c.desc
        })),
        relations: (data.relations || []).map((r: any) => ({
          sourceId: r.from,
          targetId: r.to,
          type: r.type
        }))
      };
    }
  } catch (e) {
    console.warn("[AI][HIERARCHY] Échec de l'extraction hiérarchique via LLM.");
  }

  return { nodes: [], relations: [] };
}

/**
 * Augmente le contexte de recherche en incluant les concepts parents/enfants.
 */
export async function expandHierarchicalContext(query: string, availableNodes: ConceptNode[]): Promise<string> {
  if (availableNodes.length === 0) return "";

  const q = query.toLowerCase();
  const matchedNode = availableNodes.find(n => q.includes(n.name.toLowerCase()));

  if (!matchedNode) return "";

  let context = `STRUCTURE HIÉRARCHIQUE : Le sujet "${matchedNode.name}" est lié à : `;
  
  if (matchedNode.parentId) {
    const parent = availableNodes.find(n => n.id === matchedNode.parentId);
    if (parent) context += `[Parent: ${parent.name}] `;
  }

  const children = availableNodes.filter(n => n.parentId === matchedNode.id);
  if (children.length > 0) {
    context += `[Sous-composants: ${children.map(c => c.name).join(', ')}]`;
  }

  return context;
}
