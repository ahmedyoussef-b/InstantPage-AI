// types/vision.ts

export interface VisionSearchResult {
    found: boolean;
    match?: {
      id: string;
      similarity: number;
      metadata: VisionMetadata;
      thumbnail?: string;
    };
    matches?: Array<{
      id: string;
      similarity: number;
      metadata: VisionMetadata;
    }>;
    message?: string;
    data?: VisionData;
  }
  
  export interface VisionMetadata {
    filename: string;
    date: string;
    tags: string[];
    description: string;
    location?: string;
    author?: string;
    documentType?: string;
    relatedDocs?: string[];
  }
  
  export interface VisionData extends VisionMetadata {
    id: string;
    image: string; // base64
    createdAt: string;
    features?: number[];
  }
  
  export interface VisionRegisterResponse {
    success: boolean;
    imageId: string;
    message: string;
  }
  
  export interface CameraState {
    isActive: boolean;
    capturedImage: string | null;
    facingMode: 'user' | 'environment';
    error: string | null;
  }