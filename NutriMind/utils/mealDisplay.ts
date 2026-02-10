// Show short dish name on lists; keep fluid format like "Protein Shake (12oz)" as-is
export function getMealDisplayName(name: string): string {
  if (!name || typeof name !== "string") return name;
  const ozMatch = name.match(/\(\s*\d+(\.\d+)?\s*oz\s*\)/i);
  if (ozMatch) return name;
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
