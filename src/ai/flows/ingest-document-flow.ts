'use server';
/**
 * @fileOverview A Genkit flow for intelligent document ingestion.
 * This flow extracts content from various document types, chunks it, generates embeddings,
 * and stores the chunks along with their embeddings and metadata in ChromaDB.
 *
 * - ingestDocument - A function that handles the document ingestion process.
 * - IngestDocumentInput - The input type for the ingestDocument function.
 * - IngestDocumentOutput - The return type for the ingestDocument function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ChromaDBManager, CollectionName, createStandardMetadata } from '@/ai/vector/chromadb-manager';

// --- Schemas --- //

const IngestDocumentInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "The document content as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Supported mimetypes: 'text/plain', 'application/pdf'."
    ),
  fileName: z.string().describe("The name of the file, including its extension (e.g., 'document.pdf' or 'report.txt')."),
  collectionName: z.nativeEnum(CollectionName).default(CollectionName.DOCUMENTS).describe("The ChromaDB collection to ingest the document into. Defaults to 'documents'.")
});
export type IngestDocumentInput = z.infer<typeof IngestDocumentInputSchema>;

const IngestDocumentOutputSchema = z.object({
  success: z.boolean().describe("Indicates whether the document ingestion was successful."),
  message: z.string().optional().describe("A message describing the result of the ingestion."),
  indexedChunkIds: z.array(z.string()).optional().describe("A list of IDs for the chunks that were successfully indexed.")
});
export type IngestDocumentOutput = z.infer<typeof IngestDocumentOutputSchema>;

// --- Helper Functions --- //

/**
 * Parses the document content from a data URI.
 * Currently supports 'text/plain'. PDF support is a placeholder as 'pdf-parse' dependency was not found.
 * @param fileDataUri The data URI of the file.
 * @param fileName The name of the file.
 * @returns The extracted text content.
 * @throws Error if unsupported MIME type or parsing fails.
 */
async function parseDocumentContent(fileDataUri: string, fileName: string): Promise<string> {
  const [mimeTypePart, base64Content] = fileDataUri.split(';base64,');
  if (!mimeTypePart || !base64Content) {
    throw new Error('Invalid data URI format.');
  }

  const mimeType = mimeTypePart.split(':')[1];
  const buffer = Buffer.from(base64Content, 'base64');

  switch (mimeType) {
    case 'text/plain':
      return buffer.toString('utf-8');
    case 'application/pdf':
      console.warn(`PDF parsing for ${fileName} is a placeholder. Real content extraction requires 'pdf-parse' or similar library.`);
      return `This is a simulated placeholder for PDF content from file: ${fileName}. Actual content extraction is not implemented.`;
    default:
      throw new Error(`Unsupported MIME type for ingestion: ${mimeType}. Only 'text/plain' and 'application/pdf' are currently recognized.`);
  }
}

/**
 * Splits text into chunks of a specified size with overlap.
 * This is a basic character-based chunking strategy.
 * @param text The input text to chunk.
 * @param chunkSize The maximum size of each chunk.
 * @param chunkOverlap The number of characters to overlap between chunks.
 * @returns An array of text chunks.
 */
function chunkText(text: string, chunkSize: number = 1000, chunkOverlap: number = 200): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + chunkSize, text.length);
    let chunk = text.substring(i, end);
    chunks.push(chunk);
    // Move the starting point for the next chunk, accounting for overlap
    i += chunkSize - chunkOverlap;
    // Ensure we don't go backwards or get stuck if overlap is too large relative to chunk size
    if (i < 0) i = 0;
    if (i >= text.length && end === text.length) {
      break; // All text has been processed
    }
  }
  return chunks;
}

// --- Genkit Flow Definition --- //

const ingestDocumentFlow = ai.defineFlow(
  {
    name: 'ingestDocumentFlow',
    inputSchema: IngestDocumentInputSchema,
    outputSchema: IngestDocumentOutputSchema,
  },
  async (input) => {
    try {
      console.log(`Starting document ingestion for file: ${input.fileName} into collection: ${input.collectionName}`);

      const extractedText = await parseDocumentContent(input.fileDataUri, input.fileName);
      const textChunks = chunkText(extractedText);

      // Initialize ChromaDBManager. This assumes the manager handles connection details
      // (e.g., from environment variables like CHROMADB_URL).
      const chromaDBManager = new ChromaDBManager();
      const indexedChunkIds: string[] = [];

      if (textChunks.length === 0) {
        console.warn(`No content extracted or chunks generated for file: ${input.fileName}. Skipping indexing.`);
        return {
          success: true,
          message: `No content to index for ${input.fileName}.`,
          indexedChunkIds: []
        };
      }

      // Iterate through chunks, generate embeddings, and add to ChromaDB
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];

        // Generate embedding for the current chunk using a suitable embedding model
        const embeddingResponse = await ai.embed({
          model: 'text-embedding-004', // Using a general purpose text embedding model
          content: [
            { text: chunk }
          ]
        });
        const embedding = embeddingResponse.embedding;

        // Create standardized metadata for the chunk
        const metadata = createStandardMetadata({
          source: input.fileName,
          chunkIndex: i,
          totalChunks: textChunks.length,
          type: input.fileName.split('.').pop() || 'unknown', // Extract file extension as type
        });

        // Generate a unique ID for each chunk (e.g., fileName-chunkIndex)
        const docId = `${input.fileName.replace(/\s/g, '_').toLowerCase()}-${i}`;

        // Add the chunk, its embedding, and metadata to the specified ChromaDB collection
        await chromaDBManager.addDocument(input.collectionName, docId, embedding, chunk, metadata);
        indexedChunkIds.push(docId);
        console.log(`Indexed chunk ${i + 1}/${textChunks.length} (ID: ${docId}) for file: ${input.fileName}`);
      }

      console.log(`Successfully ingested ${indexedChunkIds.length} chunks from ${input.fileName}.`);
      return {
        success: true,
        message: `Successfully ingested ${indexedChunkIds.length} chunks from ${input.fileName}.`,
        indexedChunkIds,
      };
    } catch (error: any) {
      console.error(`Failed to ingest document ${input.fileName}: ${error.message}`, error);
      return {
        success: false,
        message: `Failed to ingest document '${input.fileName}': ${error.message}`,
      };
    }
  }
);

// --- Exported Wrapper Function --- //

export async function ingestDocument(input: IngestDocumentInput): Promise<IngestDocumentOutput> {
  return ingestDocumentFlow(input);
}
