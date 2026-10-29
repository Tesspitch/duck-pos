export type OptionPricingMode = 'PER_TOPPING' | 'FIRST_FREE_THEN_FIXED'
export type OptionSelectionMode = 'SINGLE' | 'MULTIPLE'

interface SelectableOption {
  id: string
  name: string
  priceDeltaSatang: number
}

interface SelectableGroup<TOption extends SelectableOption> {
  id: string
  pricingMode: OptionPricingMode
  additionalSelectionPriceSatang: number
  options: TOption[]
}

export function priceSelectedOptions<TOption extends SelectableOption>(
  groups: Array<SelectableGroup<TOption>>,
  selected: Record<string, string[]>,
): Array<TOption & { priceDeltaSatang: number }> {
  return groups.flatMap((group) => {
    const selectedIds = new Set(selected[group.id] ?? [])
    return group.options
      .filter((option) => selectedIds.has(option.id))
      .map((option, index) => ({
        ...option,
        priceDeltaSatang: group.pricingMode === 'FIRST_FREE_THEN_FIXED'
          ? (index === 0 ? 0 : group.additionalSelectionPriceSatang)
          : option.priceDeltaSatang,
      }))
  })
}
