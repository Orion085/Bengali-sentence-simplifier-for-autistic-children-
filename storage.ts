import { users, type User, type InsertUser, type Sentence, type InsertSentence } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  insertSentence(sentence: InsertSentence): Promise<Sentence>;
  getAllSentences(): Promise<Sentence[]>;
  getSimplifiedSentence(complexSentence: string, level: string): Promise<Sentence | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sentences: Map<number, Sentence>;
  // Dictionary for faster lookups - normalize sentences as keys
  private sentenceDictionary: Record<string, Sentence>;
  currentId: number;
  currentSentenceId: number;

  constructor() {
    this.users = new Map();
    this.sentences = new Map();
    this.sentenceDictionary = {};
    this.currentId = 1;
    this.currentSentenceId = 1;
  }
  
  // Helper function to normalize Bengali text for consistent matching
  private normalizeBengaliText(text: string): string {
    return text
      .replace(/"/g, '') // Remove quotes
      .replace(/,/g, '') // Remove commas
      .replace(/\./g, '') // Remove periods
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async insertSentence(insertSentence: InsertSentence): Promise<Sentence> {
    // Normalize the complex sentence for consistent lookup
    const normalizedComplex = this.normalizeBengaliText(insertSentence.complex_sentence);
    
    // If the sentence already exists in our dictionary, don't add a duplicate
    if (this.sentenceDictionary[normalizedComplex]) {
      return this.sentenceDictionary[normalizedComplex];
    }
    
    // Otherwise, create a new sentence
    const id = this.currentSentenceId++;
    const sentence: Sentence = { ...insertSentence, id };
    
    // Store in both data structures
    this.sentences.set(id, sentence);
    
    // Also store in our dictionary for faster lookups
    this.sentenceDictionary[normalizedComplex] = sentence;
    
    // Add the first 20 chars as a secondary key for partial matching
    if (normalizedComplex.length > 20) {
      const partialKey = normalizedComplex.substring(0, 20);
      if (!this.sentenceDictionary[partialKey]) {
        this.sentenceDictionary[partialKey] = sentence;
      }
    }
    
    console.log(`Added sentence with ID ${id}: ${sentence.complex_sentence.substring(0, 30)}...`);
    console.log(`Normalized key: ${normalizedComplex.substring(0, 30)}...`);
    return sentence;
  }

  async getAllSentences(): Promise<Sentence[]> {
    return Array.from(this.sentences.values());
  }

  async getSimplifiedSentence(complexSentence: string, level: string): Promise<Sentence | undefined> {
    console.log(`Looking for sentence: "${complexSentence.substring(0, 30)}..."`);
    
    // Normalize the input sentence for consistent lookup
    const normalizedInput = this.normalizeBengaliText(complexSentence);
    console.log(`Normalized input: "${normalizedInput.substring(0, 30)}..."`);
    
    // Try direct lookup in our dictionary
    let sentence = this.sentenceDictionary[normalizedInput];
    
    // If not found, try with the first 20 characters
    if (!sentence && normalizedInput.length > 20) {
      const partialKey = normalizedInput.substring(0, 20);
      sentence = this.sentenceDictionary[partialKey];
      
      if (sentence) {
        console.log(`Found using partial key: "${partialKey}"`);
      }
    }
    
    // If still not found, try a more exhaustive search through all keys
    if (!sentence) {
      // Sort dictionary keys by length (longer keys first) for better matching
      const keys = Object.keys(this.sentenceDictionary).sort((a, b) => b.length - a.length);
      
      for (const key of keys) {
        // Skip very short keys to avoid false matches
        if (key.length < 10) continue;
        
        if (key.includes(normalizedInput) || normalizedInput.includes(key)) {
          sentence = this.sentenceDictionary[key];
          console.log(`Found using fuzzy match with key: "${key.substring(0, 30)}..."`);
          break;
        }
      }
    }
    
    if (sentence) {
      console.log(`Found sentence match with ID ${sentence.id}`);
    } else {
      console.log(`No match found for sentence`);
      
      // Debug: Log all available keys in the dictionary
      console.log(`Available dictionary keys:`);
      Object.keys(this.sentenceDictionary).forEach((key, index) => {
        if (index < 5) { // Limit to first 5 keys to avoid log flooding
          console.log(`Key ${index}: "${key.substring(0, 30)}..."`);
        }
      });
    }
    
    return sentence;
  }
}

export const storage = new MemStorage();
