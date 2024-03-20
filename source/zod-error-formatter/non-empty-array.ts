export type NonEmptyArray<Item> = readonly [Item, ...(readonly Item[])];

export function isNonEmptyArray<Item>(list: readonly Item[]): list is NonEmptyArray<Item> {
    return list.length > 0;
}
