import type { AdminCategoryNode } from '@/features/categories/types';

export type FlatCategory = {
  node: AdminCategoryNode;
  depth: number;
  ancestors: AdminCategoryNode[];
  hiddenByAncestor: AdminCategoryNode | null;
};

export function flattenTree(
  nodes: AdminCategoryNode[],
  options: { collapsed?: ReadonlySet<string> } = {},
): FlatCategory[] {
  const result: FlatCategory[] = [];
  const walk = (list: AdminCategoryNode[], ancestors: AdminCategoryNode[]) => {
    for (const node of list) {
      const hiddenByAncestor =
        [...ancestors].reverse().find((ancestor) => !ancestor.isActive) ?? null;
      result.push({
        node,
        depth: ancestors.length,
        ancestors,
        hiddenByAncestor,
      });
      if (!options.collapsed?.has(node.id)) {
        walk(node.children, [...ancestors, node]);
      }
    }
  };
  walk(nodes, []);
  return result;
}

export function collectSubtreeIds(node: AdminCategoryNode): Set<string> {
  const ids = new Set<string>([node.id]);
  const walk = (list: AdminCategoryNode[]) => {
    for (const child of list) {
      ids.add(child.id);
      walk(child.children);
    }
  };
  walk(node.children);
  return ids;
}

export function collectParentIds(nodes: AdminCategoryNode[]): Set<string> {
  return new Set(
    flattenTree(nodes)
      .filter(({ node }) => node.children.length > 0)
      .map(({ node }) => node.id),
  );
}

export function countTree(nodes: AdminCategoryNode[]) {
  let total = 0;
  let hidden = 0;
  for (const { node } of flattenTree(nodes)) {
    total += 1;
    if (!node.isActive) hidden += 1;
  }
  return { total, hidden };
}

export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}
