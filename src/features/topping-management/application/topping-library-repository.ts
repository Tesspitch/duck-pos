import type {
  SaveToppingGroupInput,
  SaveToppingInput,
  ToppingLibrary,
} from '../domain/topping-library'

export interface ToppingLibraryRepository {
  get(shopId: string): Promise<ToppingLibrary>
  saveGroup(input: SaveToppingGroupInput): Promise<string>
  deleteGroup(shopId: string, groupId: string): Promise<void>
  saveTopping(input: SaveToppingInput): Promise<string>
  deleteTopping(shopId: string, toppingId: string): Promise<void>
  setToppingAvailability(shopId: string, toppingId: string, available: boolean): Promise<void>
}
