function normalizeText(value = '') {
  return String(value ?? '').trim().toLowerCase();
}

export function isWeightEvent(event) {
  const type = normalizeText(event?.type);
  const title = normalizeText(event?.title);

  if (type.includes('weight')) return true;
  if (title.includes('weight')) return true;
  if (title.includes('kg')) return true;

  return false;
}

export function isMilkingEvent(event) {
  const type = normalizeText(event?.type);
  const title = normalizeText(event?.title);
  const customFields = event?.custom_fields || {};

  if (type.includes('milking')) return true;
  if (title.includes('milking')) return true;
  if (title.includes('milk yield')) return true;
  if (title.includes('milk')) return true;

  if (customFields.milk_liters != null || customFields.milk_yield != null) return true;

  return false;
}

export function getEventMetricValue(event, metric, fallbackValue = 0) {
  const title = String(event?.title || '');
  const customFields = event?.custom_fields || {};

  if (metric === 'weight') {
    if (customFields.weight_kg != null) return Number(customFields.weight_kg);

    const match = title.match(/(\d+(?:\.\d+)?)(?=\s*(kg|kilograms?))/i);
    if (match) return parseFloat(match[1]);
  }

  if (metric === 'milking') {
    if (customFields.milk_liters != null) return Number(customFields.milk_liters);
    if (customFields.milk_yield != null) return Number(customFields.milk_yield);

    const match = title.match(/(\d+(?:\.\d+)?)(?=\s*(l|liters?|litre|litres))/i);
    if (match) return parseFloat(match[1]);
  }

  const generalMatch = title.match(/(\d+(?:\.\d+)?)/);
  return generalMatch ? parseFloat(generalMatch[1]) : fallbackValue;
}
