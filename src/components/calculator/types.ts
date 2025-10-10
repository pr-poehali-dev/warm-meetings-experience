export interface Package {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  duration: number;
}

export interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface PriceBreakdown {
  basePrice: number;
  addonsTotal: number;
  areaMultiplier: number;
  dayMultiplier: number;
  personMultiplier: number;
  durationMultiplier: number;
  gross: number;
  discount: number;
}

export interface CalculatorState {
  selectedPackage: string;
  selectedDate: Date | undefined;
  selectedArea: string;
  persons: number;
  extraDuration: number;
  selectedAddons: string[];
  promoCode: string;
  promoApplied: boolean;
  name: string;
  phone: string;
  email: string;
  comment: string;
}
