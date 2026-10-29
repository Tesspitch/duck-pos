import { useMutation, useQueryClient } from '@tanstack/react-query'

import { catalogQueryKey } from '../../catalog/application/use-catalog'
import type { SaveToppingGroupInput, SaveToppingInput } from '../domain/topping-library'
import { useToppingLibraryRepository } from './topping-library-context'
import { toppingLibraryQueryKey } from './use-topping-library'

export function useToppingLibraryActions(shopId: string) {
  const repository = useToppingLibraryRepository()
  const queryClient = useQueryClient()
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: toppingLibraryQueryKey(shopId) }),
      queryClient.invalidateQueries({ queryKey: catalogQueryKey(shopId) }),
    ])
  }

  const saveGroup = useMutation({ mutationFn: (input: SaveToppingGroupInput) => repository.saveGroup(input), onSuccess: refresh })
  const deleteGroup = useMutation({ mutationFn: (groupId: string) => repository.deleteGroup(shopId, groupId), onSuccess: refresh })
  const saveTopping = useMutation({ mutationFn: (input: SaveToppingInput) => repository.saveTopping(input), onSuccess: refresh })
  const deleteTopping = useMutation({ mutationFn: (toppingId: string) => repository.deleteTopping(shopId, toppingId), onSuccess: refresh })
  const setAvailability = useMutation({
    mutationFn: ({ toppingId, available }: { toppingId: string; available: boolean }) =>
      repository.setToppingAvailability(shopId, toppingId, available),
    onSuccess: refresh,
  })

  return { saveGroup, deleteGroup, saveTopping, deleteTopping, setAvailability }
}
