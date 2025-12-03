export interface ArtStyle {
  id: string;
  name: string;
  category: 'classic' | 'modern' | 'photography' | 'fine-art';
  description: string;
  promptPrefix: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  createdAt: string;
}

export interface GenerateRequest {
  style: string;
  userPrompt?: string;
}

export interface GenerateResponse {
  imageBase64: string;
  prompt: string;
}
