// Mağaza ürünleri — fiyatlar kredi cinsinden (1 Kredi = 1 ₺)
export type Product = { id: string; name: string; price: number; category: "vip" | "kasa" | "item" };

export const PRODUCTS: Product[] = [
  { id: "vip", name: "VIP", price: 70, category: "vip" },
  { id: "syfielvip", name: "SYFIELVIP", price: 120, category: "vip" },
  { id: "groudon", name: "GROUDON", price: 160, category: "vip" },
  { id: "gear-crate", name: "Gear Crate Anahtarı", price: 20, category: "kasa" },
  { id: "koth-kasa", name: "KOTH Kasa Anahtarı", price: 40, category: "kasa" },
  { id: "syfiel-kasasi", name: "SYFIEL KASASI Anahtarı", price: 60, category: "kasa" },
  { id: "buzul-elytra-seti", name: "Buzul Elytra Seti", price: 75, category: "item" },
  { id: "donduran-kilic", name: "Donduran Kılıç", price: 45, category: "item" },
  { id: "roket-paketi", name: "Roket Paketi", price: 20, category: "item" },
  { id: "kanat-izi", name: "Kanat İzi Efekti", price: 30, category: "item" },
];

// Gerçek para ile alınan kredi paketleri (TRY)
export type CreditPack = { id: string; credits: number; bonus: number; priceTry: number };

export const CREDIT_PACKS: CreditPack[] = [
  { id: "k50", credits: 50, bonus: 0, priceTry: 50 },
  { id: "k100", credits: 100, bonus: 5, priceTry: 100 },
  { id: "k250", credits: 250, bonus: 25, priceTry: 250 },
  { id: "k500", credits: 500, bonus: 75, priceTry: 500 },
];
