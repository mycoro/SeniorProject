// Show short dish name on lists; keep fluid format and vitamin amounts as-is
export function getMealDisplayName(name: string): string {
  if (!name || typeof name !== "string") return name;
  const ozMatch = name.match(/\(\s*\d+(\.\d+)?\s*oz\s*\)/i);
  if (ozMatch) return name;
  // Preserve vitamin/supplement amounts: "B12 (500mcg)", "Iron (65mg)", "Vitamin D (2000 IU)"
  const doseMatch = name.match(/\(\s*[\d.]+\s*(mcg|mg|g|iu)\s*\)/i);
  if (doseMatch) return name;
  const idx = name.indexOf(" (");
  if (idx > 0) return name.slice(0, idx).trim();
  return name;
}

// Split stored name into dish and ingredients for edit form
export function parseMealNameForEdit(name: string): { dishName: string; ingredients: string } {
  if (!name || typeof name !== "string") return { dishName: name || "", ingredients: "" };
  const ozMatch = name.match(/^(.+?)\s*\(\s*(\d+(?:\.\d+)?\s*oz)\s*\)\s*$/i);
  if (ozMatch) return { dishName: name, ingredients: "" };
  const idx = name.indexOf(" (");
  if (idx > 0) {
    const dishName = name.slice(0, idx).trim();
    const ingredients = name.slice(idx + 2).replace(/\)\s*$/, "").trim();
    return { dishName, ingredients };
  }
  return { dishName: name, ingredients: "" };
}

// Vitamin name without dose, when dose is shown separately (avoids "Calcium (300 mg)" + "300 mg" duplication)
export function getVitaminBaseName(name: string): string {
  if (!name || typeof name !== "string") return name;
  const match = name.match(/^(.+?)\s*\(\s*[\d.]+\s*(?:mcg|mg|g|iu)\s*\)\s*$/i);
  return match ? match[1].trim() : name;
}

// Extract dose/amount from vitamin name for display, e.g. "B12 (500mcg)" -> "500mcg"
export function getVitaminAmount(name: string): string | null {
  if (!name || typeof name !== "string") return null;
  const match = name.match(/\(\s*([\d.]+\s*(?:mcg|mg|g|iu))\s*\)/i);
  return match ? match[1].trim() : null;
}
