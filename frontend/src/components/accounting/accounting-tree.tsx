"use client";

import Link from "next/link";

import { type AccountingHierarchyNode } from "@/lib/accounting-hierarchy";

type AccountingTreeProps = {
  root: AccountingHierarchyNode;
};

function statusLabel(status?: AccountingHierarchyNode["status"]): string {
  if (status === "active") {
    return "نقطة البداية";
  }
  if (status === "ready") {
    return "جاهز";
  }
  if (status === "planned") {
    return "قابل للتوسع";
  }
  return "وحدة";
}

function TreeNode({ node, depth = 0 }: { node: AccountingHierarchyNode; depth?: number }) {
  const hasChildren = Boolean(node.children?.length);
  return (
    <li className="accounting-tree-item" data-depth={depth}>
      <article className="accounting-tree-node">
        <div className="accounting-tree-node-header">
          <p className="accounting-tree-title">{node.title}</p>
          <span className="status-badge status-info">{statusLabel(node.status)}</span>
        </div>
        <p className="accounting-tree-description">{node.description}</p>
        {node.href ? (
          <Link className="btn btn-outline" href={node.href}>
            فتح الوحدة
          </Link>
        ) : null}
      </article>
      {hasChildren ? (
        <ol className="accounting-tree-children">
          {node.children?.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

export function AccountingTree({ root }: AccountingTreeProps) {
  return (
    <section className="accounting-tree">
      <ol className="accounting-tree-list">
        <TreeNode node={root} />
      </ol>
    </section>
  );
}
