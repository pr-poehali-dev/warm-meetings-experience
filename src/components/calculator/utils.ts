export const calculatePrice = (
  selectedPackage: string,
  selectedDate: Date | undefined,
  selectedArea: string,
  persons: number,
  extraDuration: number,
  selectedAddons: string[],
  promoApplied: boolean,
  promoCode: string,
  packages: any[] = [],
  addons: any[] = []
) => {
  const pkg = packages.find(p => p.id === selectedPackage);
  if (!pkg) return { total: 0, breakdown: {} };

  const basePrice = pkg.base_price;
  
  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const addon = addons.find(a => a.id === addonId);
    return sum + (addon?.price || 0);
  }, 0);

  const areaMultiplier = selectedArea === "area_moscow" ? 1.30 : 1.00;
  
  const isWeekend = selectedDate ? (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) : false;
  const dayMultiplier = isWeekend ? 1.20 : 1.00;
  
  const personMultiplier = persons === 2 ? 1.0 : persons === 3 ? 1.15 : 1.30;
  
  const durationMultiplier = 1 + (extraDuration / 30) * 0.20;

  const gross = (basePrice + addonsTotal) * areaMultiplier * dayMultiplier * personMultiplier * durationMultiplier;
  
  let discount = 0;
  if (promoApplied && promoCode === "WELCOME10") {
    discount = Math.min(gross * 0.10, 3000);
  }

  const total = Math.round((gross - discount) / 100) * 100;

  return {
    total,
    breakdown: {
      basePrice,
      addonsTotal,
      areaMultiplier,
      dayMultiplier,
      personMultiplier,
      durationMultiplier,
      gross,
      discount,
    }
  };
};