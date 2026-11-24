/** First-guess categories for item names (matches the default categories). First match wins. */
const RULES: [RegExp, string][] = [
  [/^credit$/i, "Credit card"],
  [/^revolut$/i, "Food"],
  [/^rent$|wiener netze|e-on|magenta|gasger/i, "Housing & utilities"],
  [/amazon prime/i, "Subscriptions"],
  [/super char|game|gaming|playstation|kino|hik(e|ing trip)|ski|duty free|^wine$/i, "Fun & trips"],
  [/b-?bah|badner|öbb|obb|wiener linien|winer linien|fuel|^gas$|gas station|postbus|bike/i, "Transport"],
  [/youtube|crunchyroll|orf|drei|gym/i, "Subscriptions"],
  [/alianz|allianz|vav|merkur|fielmann|versicherung/i, "Insurance"],
  [/bipa|^dm$|apotheke/i, "Health & care"],
  [/mcdonald|kaufland|^tee$|caramel|eduscho|spar|billa|hofer|lidl/i, "Food"],
  [/ikea|uniqlo|amazon|alza|obi|mediamarkt|tchibo|m[öo]belix|north ?face|bergzeit|gloves|shoes|depot|hervis|libro|temu|tk ?maxx?|willhaben/i, "Shopping"],
];

export function guessCategory(name: string): string {
  const n = name.trim();
  for (const [re, cat] of RULES) if (re.test(n)) return cat;
  return "Other";
}
