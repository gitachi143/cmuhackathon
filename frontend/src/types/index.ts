// App-level types (UI components, hooks, state)
export type {
  BackendProduct,
  UIProduct,
  ChatMsg,
  ShippingAddress,
  PersonalInfo,
  SavedCardDetails,
  WatchlistItem,
  SearchHistoryEntry,
  UserProfile,
  SearchResult,
} from "./app";

// API-level types (backend response shapes)
export type {
  Product,
  ShoppingIntent,
  FollowUpQuestion,
  SearchResponse,
  UserProfileAPI,
  SavedCard,
  ChatMessage,
  PurchaseRecord,
  SpendingOverview,
  TrackingStatus,
  TrackingLogEntry,
  PurchaseAlert,
  PurchaseAlertsResponse,
  PriceDrop,
  PriceDropsResponse,
} from "./api";
