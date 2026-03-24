
/**
 * @fileOverview A Genkit flow for generating a draft of homepage content for the 'InstantPage' application.
 *
 * - generateHomepageContentDraft - A function that generates initial homepage content based on a given topic or description.
 * - GenerateHomepageContentDraftInput - The input type for the generateHomepageContentDraft function.
 * - GenerateHomepageContentDraftOutput - The return type for the generateHomepageContentDraft function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHomepageContentDraftInputSchema = z.object({
  topicOrDescription: z
    .string()
    .describe(
      'A topic or brief description for the homepage content, guiding the AI on what to generate.'
    ),
});
export type GenerateHomepageContentDraftInput = z.infer<
  typeof GenerateHomepageContentDraftInputSchema
>;

const GenerateHomepageContentDraftOutputSchema = z.object({
  title: z
    .string()
    .describe('A concise and engaging title for the homepage, e.g., "InstantPage - Rapid Web Development".'),
  heroHeadline: z
    .string()
    .describe(
      'A main, attention-grabbing headline for the hero section, e.g., "Launch Your Next.js App Instantly".'
    ),
  heroSubheadline: z
    .string()
    .describe(
      'A sub-headline or brief description for the hero section, expanding on the main headline. This should mention key technologies like Next.js, TypeScript, Shadcn UI, Tailwind CSS.'
    ),
  description: z
    .string()
    .describe('A longer paragraph describing the core value proposition of InstantPage.'),
  features: z
    .array(z.string())
    .describe(
      'An array of 3-5 key features or benefits of using InstantPage. Each feature should be a concise string.'
    ),
  callToAction: z
    .string()
    .describe('The text for a primary call-to-action button, e.g., "Get Started Now" or "Explore Features".'),
});
export type GenerateHomepageContentDraftOutput = z.infer<
  typeof GenerateHomepageContentDraftOutputSchema
>;

export async function generateHomepageContentDraft(
  input: GenerateHomepageContentDraftInput
): Promise<GenerateHomepageContentDraftOutput> {
  return generateHomepageContentDraftFlow(input);
}

const generateHomepageContentDraftPrompt = ai.definePrompt({
  name: 'generateHomepageContentDraftPrompt',
  input: {schema: GenerateHomepageContentDraftInputSchema},
  output: {schema: GenerateHomepageContentDraftOutputSchema},
  prompt: `You are an expert prompt engineer with 15 years of experience in AI, natural language processing, and creative workflows. Your mission is to generate high-quality homepage content for the 'InstantPage' application.

The 'InstantPage' application is a Next.js starter kit designed for rapid web development. It uses:
- Next.js for full-stack web applications
- TypeScript for type safety
- Shadcn UI for beautiful and accessible UI components
- Tailwind CSS for utility-first styling
- ESLint for code quality
- Prisma for database access with PostgreSQL
- GitHub Actions for CI/CD with Vercel deployment

The application will feature a simple homepage.
The UI style is:
- Palette: Primary blue saphir (#3A6ED0), background subtle white-blue (#F7F8FB), accent turquoise (#7DD2E1).
- Typography: 'Inter' (sans-serif), modern and readable.
- Iconography: Linear, minimalist, functional icons (like Lucide).
- Layout: Clear, spacious, responsive, utilizing white space.

Based on the following topic or description: "{{{topicOrDescription}}}", generate an initial draft for the homepage content.
Ensure the content is engaging, highlights the benefits of using InstantPage, and implicitly aligns with the modern, clean, and professional aesthetic described for the UI.
Make sure to include elements such as a main title, a hero section headline and sub-headline, a descriptive paragraph, 3-5 key features, and a call to action.
The output MUST be a JSON object strictly conforming to the provided schema.`,
});

const generateHomepageContentDraftFlow = ai.defineFlow(
  {
    name: 'generateHomepageContentDraftFlow',
    inputSchema: GenerateHomepageContentDraftInputSchema,
    outputSchema: GenerateHomepageContentDraftOutputSchema,
  },
  async input => {
    const {output} = await generateHomepageContentDraftPrompt(input);
    if (!output) {
      throw new Error('Failed to generate homepage content draft.');
    }
    return output;
  }
);
