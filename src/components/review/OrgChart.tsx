"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface OrgEntity {
  id: string;
  name: string;
  type: string;
  ownershipPct: number | null;
  confidence: number;
  isUbo: boolean;
  children: OrgEntity[];
}

interface OrgChartProps {
  structure: OrgEntity[];
  selectedEntityId: string | null;
  onEntityClick: (entityId: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  INDIVIDUAL: "#dcfce7",
  COMPANY: "#dbeafe",
  TRUST: "#fed7aa",
  FUND: "#e9d5ff",
  OTHER: "#f4f4f5",
};

const TYPE_BORDERS: Record<string, string> = {
  INDIVIDUAL: "#86efac",
  COMPANY: "#93c5fd",
  TRUST: "#fdba74",
  FUND: "#c4b5fd",
  OTHER: "#d4d4d8",
};

function EntityNode({ data }: { data: { entity: OrgEntity; selected: boolean; onClick: () => void } }) {
  const { entity, selected, onClick } = data;
  const bgColor = TYPE_COLORS[entity.type] || TYPE_COLORS.OTHER;
  const borderColor = TYPE_BORDERS[entity.type] || TYPE_BORDERS.OTHER;

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border-2 px-4 py-3 shadow-sm transition-all hover:shadow-md ${
        selected ? "ring-2 ring-blue-500 ring-offset-2" : ""
      }`}
      style={{
        backgroundColor: bgColor,
        borderColor: entity.isUbo ? "#ef4444" : borderColor,
        minWidth: 180,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-400" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase text-zinc-500">
          {entity.type}
        </span>
        {entity.isUbo && (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
            UBO
          </span>
        )}
      </div>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{entity.name}</p>
      {entity.ownershipPct !== null && (
        <p className="mt-0.5 text-xs text-zinc-600">
          {entity.ownershipPct}% ownership
        </p>
      )}
      <div className="mt-1 flex items-center gap-1">
        <div
          className="h-1.5 rounded-full"
          style={{
            width: `${entity.confidence * 100}%`,
            maxWidth: 60,
            backgroundColor:
              entity.confidence > 0.7
                ? "#22c55e"
                : entity.confidence > 0.4
                  ? "#eab308"
                  : "#ef4444",
          }}
        />
        <span className="text-[10px] text-zinc-400">
          {(entity.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400" />
    </div>
  );
}

const nodeTypes = { entity: EntityNode };

export function OrgChart({
  structure,
  selectedEntityId,
  onEntityClick,
}: OrgChartProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    function traverse(
      entity: OrgEntity,
      x: number,
      y: number,
      parentId: string | null
    ) {
      nodes.push({
        id: entity.id,
        type: "entity",
        position: { x, y },
        data: {
          entity,
          selected: entity.id === selectedEntityId,
          onClick: () => onEntityClick(entity.id),
        },
      });

      if (parentId) {
        edges.push({
          id: `${parentId}-${entity.id}`,
          source: parentId,
          target: entity.id,
          label: entity.ownershipPct ? `${entity.ownershipPct}%` : undefined,
          style: { stroke: "#a1a1aa" },
          labelStyle: { fontSize: 11 },
        });
      }

      const childWidth = 250;
      const totalWidth = entity.children.length * childWidth;
      const startX = x - totalWidth / 2 + childWidth / 2;

      entity.children.forEach((child, i) => {
        traverse(child, startX + i * childWidth, y + 150, entity.id);
      });
    }

    structure.forEach((root, i) => {
      traverse(root, i * 400, 0, null);
    });

    return { nodes, edges };
  }, [structure, selectedEntityId, onEntityClick]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
