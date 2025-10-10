import { Package, Addon } from "./types";

export const packages: Package[] = [
  {
    id: "intro",
    name: "Intro / Первое свидание",
    description: "Лёгкий ритуал для знакомства с форматом",
    basePrice: 12000,
    duration: 120,
  },
  {
    id: "signature",
    name: 'Signature «Ближе»',
    description: "Основной фирменный ритуал",
    basePrice: 20000,
    duration: 150,
  },
  {
    id: "premium",
    name: "Premium / Глубина доверия",
    description: "Развёрнутый ритуал с VIP-элементами",
    basePrice: 45000,
    duration: 210,
  },
];

export const addons: Addon[] = [
  { id: "photo_30", name: "Фотосъёмка 30 мин", description: "20-40 фото", price: 5000 },
  { id: "photo_video", name: "Фото + мини-ролик", description: "60 мин + видео", price: 15000 },
  { id: "massage_30", name: "Синхронный массаж 30 мин", description: "Парный массаж", price: 8000 },
  { id: "massage_60", name: "Синхронный массаж 60 мин", description: "Удлинённая версия", price: 14000 },
  { id: "romantic_set", name: "Романтический сет", description: "Цветы + десерт", price: 3000 },
  { id: "lovebox", name: "LoveBox", description: "Свечи, чай, масло", price: 1800 },
  { id: "transfer", name: "Трансфер", description: "В одну сторону", price: 2500 },
  { id: "private_entry", name: "Приватный вход", description: "Отдельный подъезд", price: 4000 },
];
