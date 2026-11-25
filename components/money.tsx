/**
 * A formatted amount with the euro sign set smaller and lighter, so the digits carry the figure.
 * Pass a string from lib/domain/money (formatEUR, formatEURWhole…).
 */
export function Money({ value }: { value: string }) {
  const at = value.indexOf("€");
  if (at === -1) return value;
  return (
    <>
      {value.slice(0, at)}
      <span className="currency">€</span>
      {value.slice(at + 1)}
    </>
  );
}
