export type TreeNode<T> = T & { children: TreeNode<T>[] };

interface TreeItem {
  id: string;
  parentID: string | null;
}

/**
 * Dựng cây từ danh sách phẳng (giữ nguyên thứ tự đầu vào).
 * Node có cha không nằm trong danh sách (vd cha đang ẩn) bị bỏ cùng cả nhánh con.
 */
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

/**
 * Chuỗi tổ tiên từ gốc tới cha trực tiếp. Trả null nếu đứt giữa chừng
 * (một tổ tiên không có trong `byID`, vd đang ẩn) hoặc dữ liệu bị vòng lặp.
 */
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

/** ID của node và toàn bộ con cháu. */
export const getDescendantIDs = <T extends TreeItem>(
  rootID: string,
  items: T[],
): string[] => {
  const childrenOf = new Map<string, string[]>();
  for (const item of items) {
    if (!item.parentID) continue;
    childrenOf.set(item.parentID, [...(childrenOf.get(item.parentID) ?? []), item.id]);
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
