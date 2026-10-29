export function nextSortOrder(items: ReadonlyArray<{ sortOrder: number }>): number {
  return items.reduce((highest, item) => Math.max(highest, item.sortOrder), -1) + 1
}
