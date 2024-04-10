export type NonEmptyArray<Item> = readonly [Item, ...(readonly Item[])];

export function isNonEmptyArray<Item>(list: readonly Item[]): list is NonEmptyArray<Item> {
    return list.length > 0;
}

export function mapTuple<Tuple extends readonly unknown[], MappedItem>(
    tuple: Tuple,
    mapItem: (
        item: Tuple[number]
    ) => MappedItem
): { [Key in keyof Tuple]: MappedItem; } {
    return tuple.map(mapItem) as unknown as { [Key in keyof Tuple]: MappedItem; };
}
