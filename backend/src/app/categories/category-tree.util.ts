export type TreeNode<T> = T & { children: TreeNode<T>[] };

interface TreeItem {
  id: string;
  parentID: string | null;
}

export const buildTree = <T extends TreeItem>(items: T[]): TreeNode<T>[] => {
  const nodes = new Map<string, TreeNode<T>>(
    items.map((item) => [item.id, { ...item, children: [] }]),
  );
  const roots: TreeNode<T>[] = [];
  for (const node of nodes.values()) {
    if (!node.parentID) roots.push(node);
    else nodes.get(node.parentID)?.children.push(node);
  }
  return roots;
};

export const getAncestors = <T extends TreeItem>(
  item: T,
  byID: Map<string, T>,
): T[] | null => {
  const ancestors: T[] = [];
  const visited = new Set([item.id]);
  let parentID = item.parentID;
  while (parentID) {
    const parent = byID.get(parentID);
    if (!parent || visited.has(parent.id)) return null;
    visited.add(parent.id);
    ancestors.unshift(parent);
    parentID = parent.parentID;
  }
  return ancestors;
};

export const getDescendantIDs = <T extends TreeItem>(
  rootID: string,
  items: T[],
): string[] => {
  const childrenOf = new Map<string, string[]>();
  for (const item of items) {
    if (!item.parentID) continue;
    childrenOf.set(item.parentID, [
      ...(childrenOf.get(item.parentID) ?? []),
      item.id,
    ]);
  }
  const result: string[] = [];
  const queue = [rootID];
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    result.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }
  return result;
};
