export function formatMoney(value: string | number, currency = "KWD", locale = "ar-KW") {
  const amount = typeof value === "number" ? value : Number(value);
  if (!isFinite(amount)) {
    return value?.toString() ?? "";
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatCurrency(value: string | number, currency = "KWD", locale = "ar-KW") {
  return formatMoney(value, currency, locale);
}

export function formatNumber(value: string | number, locale = "ar-KW", maximumFractionDigits = 2) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!isFinite(amount)) {
    return value?.toString() ?? "";
  }
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(amount);
  } catch {
    return String(amount);
  }
}

export function formatDate(value: string | Date | null | undefined, locale = "ar-KW") {
  if (!value) {
    return "";
  }
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return String(value);
  }
  try {
    return new Intl.DateTimeFormat(locale).format(dateValue);
  } catch {
    return dateValue.toISOString().slice(0, 10);
  }
}
