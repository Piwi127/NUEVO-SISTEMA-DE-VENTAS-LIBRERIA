type TimeContext = {
  locale: string;
  timeZone: string;
};

const fallbackContext: TimeContext = {
  locale: "es-PE",
  timeZone: "America/Lima",
};

export const detectTimeContext = (): TimeContext => {
  try {
    const locale = navigator.language || fallbackContext.locale;
    const options = Intl.DateTimeFormat().resolvedOptions();
    return {
      locale,
      timeZone: options.timeZone || fallbackContext.timeZone,
    };
  } catch {
    return fallbackContext;
  }
};

const parseBackendDate = (value: string): Date | null => {
  if (!value) return null;
  const normalized = value.trim().replace(" ", "T");
  const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized);
  const iso = hasZone ? normalized : `${normalized}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const formatDateTimeRegional = (value: string): string => {
  const date = parseBackendDate(value);
  if (!date) return value;
  const ctx = detectTimeContext();
  return new Intl.DateTimeFormat(ctx.locale, {
    timeZone: ctx.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};
