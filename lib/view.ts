export type View =
  | { type: "all" }
  | { type: "favorites" }
  | { type: "recent" }
  | { type: "category"; name: string };

export function viewKey(v: View) {
  return v.type === "category" ? `c:${v.name}` : v.type;
}
