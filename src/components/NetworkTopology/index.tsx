import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import { useMemo } from 'react';
import { Topology } from '../../types/api';

const stylesheet = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      width: 30,
      height: 30,
      'background-color': '#1677ff',
      color: '#fff',
      'font-size': 10,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#666',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#666',
      'curve-style': 'bezier',
    },
  },
];

interface Props {
  topology: Topology;
}

export default function NetworkTopology({ topology }: Props) {
  const elements = useMemo(() => {
    const nodes = topology.nodes.map((node) => ({
      data: { id: String(node.id), label: String(node.id) },
      position: { x: node.pos_x, y: node.pos_y },
    }));
    const edges = topology.edges.map((edge) => ({
      data: {
        id: `edge-${edge.id}`,
        source: String(edge.id_in),
        target: String(edge.id_out),
      },
    }));
    return [...nodes, ...edges];
  }, [topology]);

  return (
    <CytoscapeComponent
      elements={elements as unknown as cytoscape.ElementsDefinition}
      style={{ width: '100%', height: '100%' }}
      stylesheet={stylesheet}
      wheelSensitivity={0.2}
    />
  );
}
