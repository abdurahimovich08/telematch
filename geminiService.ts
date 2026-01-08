
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, UserAccount } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PROFILE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      age: { type: Type.INTEGER },
      bio: { type: Type.STRING },
      interests: { 
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      location: { type: Type.STRING },
      distance: { type: Type.STRING }
    },
    required: ["name", "age", "bio", "interests", "location", "distance"]
  }
};

export async function generateAIProfiles(count: number = 5, userContext?: UserAccount): Promise<UserProfile[]> {
  try {
    const userInterests = userContext?.interests.join(", ") || "travel, music, food";
    const userCity = userContext?.location?.city || "New York";
    const minAge = userContext?.settings?.minAge || 18;
    const maxAge = userContext?.settings?.maxAge || 50;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${count} diverse dating profiles for someone living in ${userCity}. 
      The age range MUST be between ${minAge} and ${maxAge}. 
      User interests are: ${userInterests}. 
      Distances should be between 1-15 miles. 
      Bios should be catchy and relate to their interests.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: PROFILE_SCHEMA
      }
    });

    const profiles = JSON.parse(response.text || '[]');
    return profiles.map((p: any, index: number) => ({
      ...p,
      id: `ai-${Date.now()}-${index}`,
      imageUrl: `https://picsum.photos/seed/${Math.random()}/600/800`
    }));
  } catch (error) {
    console.error("Error generating profiles:", error);
    return [];
  }
}

export async function getCityName(lat: number, lng: number): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user is at coordinates ${lat}, ${lng}. What is the most likely city or neighborhood name for this location? Return ONLY the name of the city/neighborhood.`,
    });
    return response.text?.trim() || "Nearby";
  } catch (e) {
    return "Nearby";
  }
}

export async function getAIReply(userProfile: UserProfile, history: string[]): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are ${userProfile.name}, ${userProfile.age} years old. Bio: ${userProfile.bio}. 
      Recent chat history: ${history.join('\n')}.
      Reply to the last message in a way that matches your personality. Keep it brief and conversational.`,
      config: {
        systemInstruction: `Stay in character as ${userProfile.name}. Be charming, witty, or specific.`
      }
    });

    return response.text || "Hey! Sorry, just saw this.";
  } catch (error) {
    console.error("Error getting AI reply:", error);
    return "That's interesting! Tell me more.";
  }
}

export async function generateSmartBio(name: string, age: number, interests: string[]): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a 1-sentence funny and catchy dating bio for ${name}, age ${age}, who likes ${interests.join(", ")}.`,
    });
    return response.text || "";
  } catch (e) {
    return "Adventurous soul looking for a partner in crime.";
  }
}
