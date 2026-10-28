import { useMutation, useQueryClient } from '@tanstack/react-query'

import type {
  SaveCategoryInput,
  SaveOptionGroupInput,
  SaveProductInput,
  SaveProductOptionInput,
} from '../domain/catalog'
import { useCatalogServices } from './catalog-services-context'
import { catalogQueryKey } from './use-catalog'

interface SaveProductWithImageInput extends SaveProductInput {
  imageFile?: File | null
}

export function useCatalogActions(shopId: string) {
  const { repository, imageService } = useCatalogServices()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: catalogQueryKey(shopId) })

  const saveCategory = useMutation({
    mutationFn: (input: SaveCategoryInput) => repository.saveCategory(input),
    onSuccess: refresh,
  })

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) => repository.deleteCategory(shopId, categoryId),
    onSuccess: refresh,
  })

  const saveProduct = useMutation({
    mutationFn: async ({ imageFile, ...input }: SaveProductWithImageInput) => {
      const productId = await repository.saveProduct(input)
      if (!imageFile) return productId

      const newPath = await imageService.upload({ shopId, productId, file: imageFile })
      try {
        await repository.setProductImage(shopId, productId, newPath)
      } catch (error) {
        await imageService.remove(newPath).catch(() => undefined)
        throw error
      }

      if (input.imagePath && input.imagePath !== newPath) {
        await imageService.remove(input.imagePath).catch(() => undefined)
      }
      return productId
    },
    onSuccess: refresh,
  })

  const deleteProduct = useMutation({
    mutationFn: async ({ productId, imagePath }: { productId: string; imagePath: string | null }) => {
      await repository.deleteProduct(shopId, productId)
      if (imagePath) await imageService.remove(imagePath).catch(() => undefined)
    },
    onSuccess: refresh,
  })

  const setProductAvailability = useMutation({
    mutationFn: ({ productId, available }: { productId: string; available: boolean }) =>
      repository.setProductAvailability(shopId, productId, available),
    onSuccess: refresh,
  })

  const saveOptionGroup = useMutation({
    mutationFn: (input: SaveOptionGroupInput) => repository.saveOptionGroup(input),
    onSuccess: refresh,
  })

  const deleteOptionGroup = useMutation({
    mutationFn: (optionGroupId: string) => repository.deleteOptionGroup(shopId, optionGroupId),
    onSuccess: refresh,
  })

  const saveProductOption = useMutation({
    mutationFn: (input: SaveProductOptionInput) => repository.saveProductOption(input),
    onSuccess: refresh,
  })

  const deleteProductOption = useMutation({
    mutationFn: (productOptionId: string) =>
      repository.deleteProductOption(shopId, productOptionId),
    onSuccess: refresh,
  })

  const setProductOptionAvailability = useMutation({
    mutationFn: ({ optionId, available }: { optionId: string; available: boolean }) =>
      repository.setProductOptionAvailability(shopId, optionId, available),
    onSuccess: refresh,
  })

  return {
    saveCategory,
    deleteCategory,
    saveProduct,
    deleteProduct,
    setProductAvailability,
    saveOptionGroup,
    deleteOptionGroup,
    saveProductOption,
    deleteProductOption,
    setProductOptionAvailability,
  }
}
