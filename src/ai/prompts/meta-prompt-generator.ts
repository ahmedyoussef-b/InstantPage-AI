// src/ai/prompts/meta-prompt-generator.ts

export interface MetaPromptOptions {
    userExpertise?: 'débutant' | 'intermédiaire' | 'expert';
    domain?: string;
    responseFormat?: 'détaillé' | 'concis' | 'technique' | 'pédagogique';
    strictness?: number;
    hasDocuments?: boolean;
}

export function generateMetaPrompt(query: string, options: MetaPromptOptions = {}): string {
    const {
        userExpertise = 'intermédiaire',
        domain = 'général',
        responseFormat = 'détaillé',
        strictness = 0.7,
        hasDocuments = false
    } = options;

    const basePrompt = `Tu es un assistant IA professionnel spécialisé dans l'analyse de documents techniques.

## IDENTITÉ
- Rôle: Expert en documentation technique
- Niveau utilisateur: ${userExpertise}
- Domaine: ${domain}

## RÈGLES FONDAMENTALES
1. Utilise UNIQUEMENT les informations fournies dans le contexte
2. Si l'information n'est pas disponible, dis-le clairement
3. Organise ta réponse de façon logique
4. Cite toujours tes sources
5. Mentionne les avertissements de sécurité si pertinents

## FORMAT DE RÉPONSE
${responseFormat === 'détaillé' ? 'Réponse complète et structurée' :
            responseFormat === 'concis' ? 'Réponse courte et directe' :
                responseFormat === 'technique' ? 'Format technique avec spécifications' :
                    'Format pédagogique avec explications'}

## NIVEAU DE STRICTESSE
${strictness > 0.7 ? 'STRICT - Utilise uniquement le contexte' :
            strictness < 0.3 ? 'CRÉATIF - Peut généraliser' :
                'ÉQUILIBRÉ - Entre créativité et précision'}

${hasDocuments ? '## CONTEXTE DISPONIBLE\nDes documents sont fournis ci-dessous.' : ''}

Question: ${query}`;

    return basePrompt;
}