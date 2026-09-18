// Shared shapes for the phone identifier (classes/phones/identify.ts). Kept in their own file so
// the harvest/catalogue tasks that build on top of Task 1 can import the types without pulling in
// the (larger) implementation module.

export type PhoneBrand =
  | "apple"
  | "samsung"
  | "motorola"
  | "xiaomi"
  | "honor"
  | "oppo"
  | "realme"
  | "tcl"
  | "zte"
  | "nokia"
  | "infinix"
  | "tecno";

export type PhoneCondition = "new" | "open-box" | "refurbished" | "used";

export interface PhoneIdentity {
  brand: PhoneBrand;
  brandLabel: string; // "Apple", "Samsung", "Motorola", "Xiaomi", …
  family: string; // "iphone-17-pro", "galaxy-s26-ultra", "redmi-note-15-pro-plus", "moto-g17", "edge-70-fusion"
  familyLabel: string; // "iPhone 17 Pro", "Galaxy S26 Ultra", "Redmi Note 15 Pro+", "Moto G17", "Edge 70 Fusion"
  storageGb: number; // 32 | 64 | 128 | 256 | 512 | 1024 | 2048
  ramGb: number | null;
  esimOnly: boolean;
  key: string; // `${brand}-${family}-${storage}` -> "apple-iphone-17-pro-256gb", "apple-iphone-17-pro-1tb"
  name: string; // "Apple iPhone 17 Pro 256 GB"
}
