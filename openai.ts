import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Generate image based on prompt
export async function generateImage(prompt: string): Promise<string | null> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    // Return the URL of the generated image
    if (response && response.data && response.data.length > 0 && response.data[0].url) {
      return response.data[0].url;
    }
    
    return null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}