export interface GenerationHistory {
    id: string;
    type: "image" | "video";
    prompt: string;
    url: string;
    coverImageUrl?: string;
    timestamp: number;
    model: string;
}
