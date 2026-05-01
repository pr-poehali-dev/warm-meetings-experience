// ─── Типы ────────────────────────────────────────────────────────────────────

export interface CostItem {
  id: string;
  label: string;
  amount: number;
}

export interface CalcParams {
  fixedItems: CostItem[];
  varItems: CostItem[];
  platformCommission: number;
  clubFee: number;
  participants: number;
  guestPrice: number;
  markup: number;
  priceMode: "manual" | "markup";
}

export interface Template {
  id: string;
  name: string;
  params: CalcParams;
  createdAt: string;
}

export interface CalcResults {
  fixedTotal: number;
  varPerPerson: number;
  totalCosts: number;
  costPerPerson: number;
  guestPrice: number;
  revenue: number;
  commission: number;
  clubTotal: number;
  profit: number;
  markupPct: number;
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

export const uid = () => Math.random().toString(36).slice(2, 8);
export const fmt = (n: number) => n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
export const STORAGE_KEY = "calc_templates_v2";

export function loadTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
export function saveTemplates(t: Template[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); }

export const defaultParams = (): CalcParams => ({
  fixedItems: [
    { id: uid(), label: "Аренда бани", amount: 9000 },
    { id: uid(), label: "Мастер", amount: 5000 },
    { id: uid(), label: "Реклама", amount: 1000 },
  ],
  varItems: [
    { id: uid(), label: "Чай и травы", amount: 100 },
    { id: uid(), label: "Расходники (простыни, тапочки)", amount: 50 },
  ],
  platformCommission: 10,
  clubFee: 100,
  participants: 10,
  guestPrice: 1800,
  markup: 20,
  priceMode: "manual",
});

// ─── Расчёты ─────────────────────────────────────────────────────────────────

export function calcResults(p: CalcParams): CalcResults {
  const fixedTotal = p.fixedItems.reduce((s, i) => s + i.amount, 0);
  const varPerPerson = p.varItems.reduce((s, i) => s + i.amount, 0);
  const costPerPerson = p.participants > 0 ? fixedTotal / p.participants + varPerPerson : 0;

  let guestPrice = p.guestPrice;
  if (p.priceMode === "markup") {
    guestPrice = Math.ceil((costPerPerson + p.clubFee) * (1 + p.markup / 100));
  }

  const revenue = guestPrice * p.participants;
  const commission = (revenue * p.platformCommission) / 100;
  const clubTotal = p.clubFee * p.participants;
  const totalCosts = fixedTotal + varPerPerson * p.participants;
  const profit = revenue - commission - clubTotal - totalCosts;
  const markupPct = costPerPerson > 0
    ? ((guestPrice - costPerPerson - p.clubFee) / costPerPerson) * 100 : 0;

  return { fixedTotal, varPerPerson, totalCosts, costPerPerson, guestPrice, revenue, commission, clubTotal, profit, markupPct };
}

export function buildChartData(p: CalcParams) {
  const fixedTotal = p.fixedItems.reduce((s, i) => s + i.amount, 0);
  const varPerPerson = p.varItems.reduce((s, i) => s + i.amount, 0);
  const maxN = Math.max(20, p.participants + 6);
  const points = [];
  for (let n = 1; n <= maxN; n++) {
    const costPerPerson = n > 0 ? fixedTotal / n + varPerPerson : 0;
    let guestPrice = p.guestPrice;
    if (p.priceMode === "markup") {
      guestPrice = Math.ceil((costPerPerson + p.clubFee) * (1 + p.markup / 100));
    }
    const revenue = guestPrice * n;
    const commission = (revenue * p.platformCommission) / 100;
    const clubTotal = p.clubFee * n;
    const totalCosts = fixedTotal + varPerPerson * n;
    const profit = revenue - commission - clubTotal - totalCosts;
    points.push({ n, profit, revenue, costs: totalCosts + commission + clubTotal });
  }
  return points;
}

export function findBreakeven(p: CalcParams): number | null {
  const data = buildChartData(p);
  for (const d of data) {
    if (d.profit >= 0) return d.n;
  }
  return null;
}
