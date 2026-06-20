import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Prices are stored in USD in the database. Rates are USD -> currency.
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", rate: 1 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", rate: 83.5 },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee", rate: 278 },
  { code: "EUR", symbol: "€", name: "Euro", rate: 0.92 },
  { code: "GBP", symbol: "£", name: "British Pound", rate: 0.78 },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", rate: 3.67 },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", rate: 3.75 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 156 },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", rate: 7.25 },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", rate: 1.36 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", rate: 1.51 },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

type Ctx = {
  code: CurrencyCode;
  setCode: (c: CurrencyCode) => void;
  format: (usd: number) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "ph_currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCodeState] = useState<CurrencyCode>("USD");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && CURRENCIES.some((c) => c.code === saved)) setCodeState(saved as CurrencyCode);
  }, []);

  function setCode(c: CurrencyCode) {
    setCodeState(c);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, c);
  }

  function format(usd: number) {
    const cur = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
    const value = Number(usd) * cur.rate;
    const isWhole = cur.code === "JPY" || cur.code === "INR" || cur.code === "PKR";
    const formatted = isWhole
      ? Math.round(value).toLocaleString()
      : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${cur.symbol}${formatted}`;
  }

  return <CurrencyContext.Provider value={{ code, setCode, format }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}

export function CurrencySelector({ className = "" }: { className?: string }) {
  const { code, setCode } = useCurrency();
  return (
    <select
      value={code}
      onChange={(e) => setCode(e.target.value as CurrencyCode)}
      title="Currency"
      className={`rounded-full border bg-card px-2 py-1.5 text-xs font-semibold hover:scale-105 transition cursor-pointer ${className}`}
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  );
}
