import { Card, Typography } from 'antd';
import { EdgeGetResponse, NodeGetResponse } from '../api/types';

interface Props {
  nodes: NodeGetResponse[];
  edges: EdgeGetResponse[];
  highlightEdges?: number[];
}

const colors = ['#1677ff', '#faad14', '#ff4d4f'];

function normalizeCoordinates(nodes: NodeGetResponse[]) {
  const padding = 20;
  const xs = nodes.map((n) => n.pos_x);
  const ys = nodes.map((n) => n.pos_y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  return nodes.map((n) => ({
    ...n,
    x: ((n.pos_x - minX) / width) * 800 + padding,
    y: ((n.pos_y - minY) / height) * 400 + padding,
  }));
}

function TopologyGraph({ nodes, edges, highlightEdges = [] }: Props) {
  const normalized = normalizeCoordinates(nodes);
  const nodeMap = new Map<number, { x: number; y: number; id: number }>();
  normalized.forEach((n) => nodeMap.set(n.id, n));

  return (
    <Card title="Топология теплосети" style={{ marginTop: 16 }}>
      <svg width="100%" height="480" viewBox="0 0 900 480" style={{ background: '#f8fafc' }}>
        {edges.map((edge) => {
          const from = nodeMap.get(edge.id_in);
          const to = nodeMap.get(edge.id_out);
          if (!from || !to) return null;
          const isHighlighted = highlightEdges.includes(edge.id);
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isHighlighted ? '#ff4d4f' : '#94a3b8'}
              strokeWidth={isHighlighted ? 4 : 2}
              strokeOpacity={0.9}
            />
          );
        })}
        {normalized.map((node) => {
          const isHighlighted = highlightEdges.some((id) => {
            const edge = edges.find((e) => e.id === id);
            return edge && (edge.id_in === node.id || edge.id_out === node.id);
          });
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={10}
                fill={isHighlighted ? colors[2] : '#1677ff'}
                opacity={0.85}
              />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="12" fill="#fff">
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>
      <Typography.Paragraph className="helper-text">
        Это топология теплосети. Каждый узел — участок сети, рёбра — соединения. Отклонения подсвечены
        красным цветом.
      </Typography.Paragraph>
    </Card>
  );
}

export default TopologyGraph;
