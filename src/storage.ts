import { LocalStorage } from "@raycast/api";
import type { GenerationHistory } from "./types";

const HISTORY_KEY = "generation-history";

export async function getHistory(): Promise<GenerationHistory[]> {
    const item = await LocalStorage.getItem<string>(HISTORY_KEY);
    if (!item) {
        return [];
    }
    try {
        return JSON.parse(item);
    } catch (e) {
        return [];
    }
}

export async function addToHistory(historyItem: GenerationHistory) {
    const currentHistory = await getHistory();
    const newHistory = [historyItem, ...currentHistory];
    // Limit history to last 50 items to prevent storage bloat
    if (newHistory.length > 50) {
        newHistory.length = 50;
    }
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
}

export async function clearHistory() {
    await LocalStorage.removeItem(HISTORY_KEY);
}
