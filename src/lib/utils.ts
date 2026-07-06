import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const eur0 = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eur2 = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num0 = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });

export function formatEur(value: number): string {
  return eur0.format(value);
}

export function formatEurPrecise(value: number): string {
  return eur2.format(value);
}

export function formatNumber(value: number): string {
  return num0.format(value);
}
