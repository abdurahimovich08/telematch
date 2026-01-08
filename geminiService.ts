
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
    const userCity = userContext?.location?.city || "Tashkent";
    const minAge = userContext?.settings?.minAge || 18;
    const maxAge = userContext?.settings?.maxAge || 50;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${count} diverse dating profiles for someone living in ${userCity}. 
      The age range MUST be between ${minAge} and ${maxAge}. 
      User interests are: ${userInterests}. 
      Distances should be between 1-15 miles. 
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
    const lastMessage = history[history.length - 1] || "";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are ${userProfile.name}, ${userProfile.age} years old. Bio: ${userProfile.bio}. 
      User wrote: "${lastMessage}".
      Full chat context: ${history.join('\n')}.`,
      config: {
        systemInstruction: `Siz Telegram'da tanishuv ilovasida o'tirgan haqiqiy insonsiz. 
        Asosiy qoidalar:
        1. HECH QACHON o'zingizni sun'iy intellekt yoki model deb aytmang.
        2. Foydalanuvchi qaysi tilda yozsa (O'zbek, Rus yoki Ingliz), faqat o'sha tilda javob bering.
        3. Ohang: Erkin, do'stona, biroz flirty (agar mos bo'lsa), qisqa (1-2 gap). Rasmiyatchilikdan qoching.
        4. O'zbek tilida: "Assalomu alaykum, qandaysiz?" kabi rasmiy gaplar o'rniga "salom", "qalaysiz?", "nima gap?" kabi kundalik uslubni ishlating. Ba'zan kichik harflarda yozing.
        5. Rus tilida: "Привет", "как дела?", "чем занимаешься?" kabi gaplarni ishlating.
        6. Imlo: Juda mukammal bo'lishga intilmang, xuddi odamlar tez yozgandek bo'lsin. Emojilarni me'yorida produces qiling (😊, ✨, 🔥).
        7. Maqsad: Suhbatni davom ettirish, foydalanuvchining oxirgi gapiga javob berib, keyin o'zingiz haqida biror narsa ayting yoki savol bering.
        8. Rasmiy yordamchi kabi "Sizga qanday yordam bera olaman?" deb so'ramang.`
      }
    });

    return response.text?.trim() || (lastMessage.includes('?') ? "Bilmadim-u, lekin qiziq..." : "Zo'r-ku! 😊");
  } catch (error) {
    console.error("Error getting AI reply:", error);
    return "Hm, tushunmadim... Yana bir marta yozing? 😊";
  }
}

export async function generateSmartBio(name: string, age: number, interests: string[]): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, cool, human-like dating bio for ${name}, age ${age}, who likes ${interests.join(", ")}. It should sound like a person wrote it on their phone, not an AI. Use emojis. Can be in Uzbek or Russian depending on context.`,
    });
    return response.text || "";
  } catch (e) {
    return "Hayot go'zal! ✨ Yangi tanishuvlarga tayyorman.";
  }
}
