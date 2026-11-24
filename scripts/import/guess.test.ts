import { describe, expect, it } from "vitest";
import { guessCategory } from "./guess";

describe("guessCategory", () => {
  it.each([
    ["Credit", "Credit card"],
    ["Revolut", "Food"],
    ["Rent", "Housing & utilities"],
    ["E-On (Gas)", "Housing & utilities"],
    ["Gas", "Transport"],
    ["Fuel⛽", "Transport"],
    ["B-Bah", "Transport"],
    ["Badner Bahn", "Transport"],
    ["Öbb", "Transport"],
    ["YouTube Super Char", "Fun & trips"],
    ["YouTube Subscription", "Subscriptions"],
    ["Gym", "Subscriptions"],
    ["VAV Versicherung", "Insurance"],
    ["DM", "Health & care"],
    ["IKEA", "Shopping"],
    ["Skipass and Öbb", "Fun & trips"],
    ["Cash out", "Other"],
    ["Zinsen", "Other"],
    ["Ski rental", "Fun & trips"],
    ["Winer Linien", "Transport"],
    ["Wine", "Fun & trips"],
    ["Amazon Prime", "Subscriptions"],
    ["Gas Station", "Transport"],
    ["TkMaxx", "Shopping"],
    ["Bike Service", "Transport"],
    ["Playstation", "Fun & trips"],
  ])("%s → %s", (name, cat) => {
    expect(guessCategory(name)).toBe(cat);
  });
});
