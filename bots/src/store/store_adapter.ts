// Bridges the router's SubscriberStore interface to the Mongo store functions.
import type { SubscriberStore } from "../commands/router.js";
import { setLanguage, subscribe, unsubscribe } from "./subscribers.js";

export const mongoStore: SubscriberStore = {
  subscribe: (platform, chatId, language) => subscribe(platform, chatId, language),
  unsubscribe: (platform, chatId) => unsubscribe(platform, chatId),
  setLanguage: (platform, chatId, language) => setLanguage(platform, chatId, language),
};
