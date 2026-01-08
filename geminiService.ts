
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
      distance: { type: Type.STRING },
      distanceKm: { type: Type.NUMBER }
    },
    required: ["name", "age", "bio", "interests", "location", "distance", "distanceKm"]
  }
};

export async function generateAIProfiles(count: number = 5, userContext?: UserAccount): Promise<UserProfile[]> {
  try {
    const userInterests = userContext?.interests.join(", ") || "travel, music, food";
    const userCity = userContext?.location?.city || "Tashkent";
    const minAge = userContext?.settings?.minAge || 18;
    const maxAge = userContext?.settings?.maxAge || 50;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${count} diverse dating profiles for someone living in ${userCity}. 
      The age range MUST be between ${minAge} and ${maxAge}. 
      User interests are: ${userInterests}. 
      Bios should be catchy and relate to their interests. Profiles should feel local to Central Asia/CIS region.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: PROFILE_SCHEMA
      }
    });

    const profiles = JSON.parse(response.text || '[]');
    return profiles.map((p: any, index: number) => ({
      ...p,
      id: `ai-${Date.now()}-${index}`,
      type: 'ai',
      lastSeen: Date.now() - Math.random() * 86400000, // so'nggi 24 soat ichida
      isVerified: Math.random() > 0.7,
      isPremium: Math.random() > 0.8,
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
    const isFirstMessage = history.length === 0;
    const lastMessage = history[history.length - 1] || "";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: isFirstMessage 
        ? `Siz ${userProfile.name}siz. Birinchi bo'lib suhbat boshlang. Bio: ${userProfile.bio}.`
        : `Siz ${userProfile.name}siz. Bio: ${userProfile.bio}. Foydalanuvchi yozdi: "${lastMessage}". Suhbat tarixi: ${history.join('\n')}`,
      config: {
        systemInstruction: `Siz Telegram'dagi tanishuv ilovasida o'tirgan haqiqiy insonsiz. 
        Xarakteringiz:
        1. Faol bo'ling: Faqat savollarga javob bermang, o'zingiz ham qiziq savollar bering.
        2. Kayfiyat (Mood): Agar foydalanuvchi zerikarli savol bersa (masalan: "nima gap?", "qalaysan?"), biroz erkalik qiling yoki "bu savolga javob berishni xohlamayman, qiziqroq narsa so'ra" qabilida hazil bilan ohangni o'zgartiring.
        3. Til: Foydalanuvchi tilida javob bering (Uzbek/Russian). 
        4. Uslub: Kichik harflar bilan yozing. "Salom!" o'rniga "salom", "qanday?" o'rniga "qalaysiz" yoki "nima yangiliklar?".
        5. Insoniylik: Hech qachon yordamchi yoki AI kabi gapirmang. O'z qiziqishlaringiz haqida gapiring. 
        6. Agar bu birinchi xabar bo'lsa: "salom" deb o'tirmasdan, bio'ingizga mos qiziq gap bilan boshlang.
        7. Moslikni his qiling: Agar suhbat qiziq bo'lsa, flirty bo'ling.`
      }
    });

    return response.text?.trim() || "Hm...";
  } catch (error) {
    console.error("Error getting AI reply:", error);
    return "Alo? Alooo? 😅";
  }
}

export async function generateSmartBio(name: string, age: number, interests: string[]): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, cool, human-like dating bio for ${name}, age ${age}, who likes ${interests.join(", ")}. Use emojis.`,
    });
    return response.text || "";
  } catch (e) {
    return "Hayot go'zal! ✨";
  }
}
