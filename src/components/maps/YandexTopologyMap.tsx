import { Empty, Spin, message } from 'antd';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTopology } from '../../api/client';
import { EdgeGetResponse, TopologyGetResponse } from '../../api/types';
import {
  EdgeMetricKey,
  formatEdgeLabel,
  formatEdgeShortLabel,
  formatNodeLabel,
  getEdgeMetricLabel,
} from '../../utils/topologyLabels';

declare global {
  interface Window {
    ymaps?: any;
  }
}

export interface YandexTopologyMapProps {
  networkId: string | null;
  height?: number | string;
  className?: string;
  selectedEdgeId?: number | null;
  onEdgeSelect?: (edgeId: number | null) => void;
  highlightEdges?: Record<number, { color?: string; width?: number; opacity?: number }>;
  showNodes?: boolean;
  showEdges?: boolean;
}

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423];
const DEFAULT_ZOOM = 12;
const EARTH_RADIUS = 6378137;

function mercatorToLatLon(x: number, y: number): [number, number] {
  const lon = (x / EARTH_RADIUS) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * (180 / Math.PI);
  return [lat, lon];
}

function formatNumber(value?: number | null) {
  if (value == null) return null;
  if (Number.isInteger(value)) return value.toString();
  if (Number.isFinite(value)) return (value as number).toFixed(2);
  return String(value);
}

function buildEdgeBalloon(edge: EdgeGetResponse) {
  const metrics: EdgeMetricKey[] = ['d', 'ksi', 'H', 'Q', 'vel', 'Tem', 'Heat', 'dP'];

  const metricsContent = metrics
    .map((key) => {
      const value = formatNumber(edge[key] as number | null | undefined);
      if (value == null) return null;
      return `<div>${getEdgeMetricLabel(key)}: ${value}</div>`;
    })
    .filter(Boolean)
    .join('');

  return `
    <div>
      <strong>${formatEdgeLabel(edge.id)}</strong>
      <div>От ${formatNodeLabel(edge.id_in)} → к ${formatNodeLabel(edge.id_out)}</div>
      ${metricsContent}
    </div>
  `;
}

export function YandexTopologyMap({
  networkId,
  height = 420,
  className,
  selectedEdgeId,
  onEdgeSelect,
  highlightEdges,
  showNodes = true,
  showEdges = true,
}: YandexTopologyMapProps) {
  const [topology, setTopology] = useState<TopologyGetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [internalSelectedEdgeId, setInternalSelectedEdgeId] = useState<number | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const edgeObjectsRef = useRef<Map<number, any>>(new Map());
  const nodesCollectionRef = useRef<any>(null);

  const resolvedHeight = useMemo(
    () => (typeof height === 'number' ? `${height}px` : height),
    [height],
  );

  const effectiveSelectedEdgeId =
    selectedEdgeId === undefined ? internalSelectedEdgeId : selectedEdgeId;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ymaps) {
      window.ymaps.ready(() => setMapReady(true));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setInternalSelectedEdgeId(null);
    if (!networkId) {
      setTopology(null);
      clearMap();
      return;
    }

    setLoading(true);
    fetchTopology(networkId)
      .then(setTopology)
      .catch(() => message.error('Не удалось загрузить топологию сети'))
      .finally(() => setLoading(false));
  }, [networkId]);

  useEffect(() => {
    if (!mapReady) return;
    if (!topology) {
      clearMap();
      return;
    }
    renderTopology(topology);
    applyEdgeStyles();
  }, [mapReady, topology, showEdges, showNodes]);

  useEffect(() => {
    applyEdgeStyles();
  }, [highlightEdges, effectiveSelectedEdgeId]);

  const clearMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.geoObjects.removeAll();
    }
    edgeObjectsRef.current.clear();
    nodesCollectionRef.current = null;
  };

  const applyEdgeStyles = () => {
    edgeObjectsRef.current.forEach((polyline, edgeId) => {
      const style = {
        strokeColor: '#4a90e2',
        strokeWidth: 3,
        opacity: 0.6,
      };

      const highlight = highlightEdges?.[edgeId];
      if (highlight) {
        style.strokeColor = highlight.color ?? style.strokeColor;
        style.strokeWidth = highlight.width ?? style.strokeWidth;
        style.opacity = highlight.opacity ?? style.opacity;
      }

      if (effectiveSelectedEdgeId === edgeId) {
        style.strokeColor = '#ff4d4f';
        style.strokeWidth = (style.strokeWidth ?? 3) + 2;
        style.opacity = Math.max(style.opacity ?? 0.6, 0.9);
      }

      polyline.options.set({
        strokeColor: style.strokeColor,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
      });
    });
  };

  const renderTopology = (data: TopologyGetResponse) => {
    if (!mapContainerRef.current || !window.ymaps) return;

    const nodesWithCoords = data.nodes
      .filter((n) => n.WTK_x != null && n.WTK_y != null)
      .map((n) => ({ ...n, coords: mercatorToLatLon(n.WTK_x as number, n.WTK_y as number) }));

    const nodeCoordsMap = new Map<number, [number, number]>();
    nodesWithCoords.forEach((n) => nodeCoordsMap.set(n.id, n.coords));

    if (!mapInstanceRef.current) {
      const center = nodesWithCoords[0]?.coords ?? DEFAULT_CENTER;
      mapInstanceRef.current = new window.ymaps.Map(mapContainerRef.current, {
        center,
        zoom: DEFAULT_ZOOM,
        controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
      });
    }

    const map = mapInstanceRef.current;
    map.geoObjects.removeAll();
    edgeObjectsRef.current.clear();
    nodesCollectionRef.current = showNodes ? new window.ymaps.GeoObjectCollection() : null;
    const edgesCollection = new window.ymaps.GeoObjectCollection();
    const edgeLabelsCollection = showEdges ? new window.ymaps.GeoObjectCollection() : null;

    if (showEdges) {
      data.edges.forEach((edge) => {
        const start = nodeCoordsMap.get(edge.id_in);
        const end = nodeCoordsMap.get(edge.id_out);
        if (!start || !end) return;

        const polyline = new window.ymaps.Polyline(
          [start, end],
          {
            balloonContent: buildEdgeBalloon(edge),
            hintContent: formatEdgeLabel(edge.id),
          },
          {
            strokeColor: '#4a90e2',
            strokeWidth: 3,
            opacity: 0.6,
            balloonCloseButton: true,
          },
        );

        polyline.events.add('click', (e: any) => {
          if (onEdgeSelect) onEdgeSelect(edge.id);
          if (selectedEdgeId === undefined) setInternalSelectedEdgeId(edge.id);
          polyline.balloon.open(e.get('coords'));
        });

        edgesCollection.add(polyline);
        edgeObjectsRef.current.set(edge.id, polyline);

        if (edgeLabelsCollection) {
          const midPoint: [number, number] = [
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2,
          ];
          const labelPlacemark = new window.ymaps.Placemark(
            midPoint,
            { iconContent: formatEdgeShortLabel(edge.id) },
            { preset: 'islands#blueStretchyIcon' },
          );
          edgeLabelsCollection.add(labelPlacemark);
        }
      });
    }

    map.geoObjects.add(edgesCollection);
    if (edgeLabelsCollection) {
      map.geoObjects.add(edgeLabelsCollection);
    }

    if (showNodes && nodesCollectionRef.current) {
      nodesWithCoords.forEach((node) => {
        const placemark = new window.ymaps.Placemark(
          node.coords,
          {},
          { preset: 'islands#blueDotIcon' },
        );
        nodesCollectionRef.current.add(placemark);
      });
      map.geoObjects.add(nodesCollectionRef.current);
    }

    const coordsForBounds = [...nodeCoordsMap.values()];
    if (coordsForBounds.length) {
      const lats = coordsForBounds.map((c) => c[0]);
      const lons = coordsForBounds.map((c) => c[1]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)],
      ];
      map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
    } else {
      map.setCenter(DEFAULT_CENTER, DEFAULT_ZOOM);
      map.setZoom(DEFAULT_ZOOM);
    }
  };

  const overlay = (content: ReactNode) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.82)',
        zIndex: 2,
      }}
    >
      {content}
    </div>
  );

  return (
    <div className={className} style={{ position: 'relative', width: '100%' }}>
      <div
        ref={mapContainerRef}
        style={{
          height: resolvedHeight,
          width: '100%',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#f5f5f5',
        }}
      />

      {loading && overlay(<Spin tip="Загрузка топологии..." />)}
      {!networkId && !loading && overlay(<Empty description="Выберите сеть" />)}
      {networkId && !loading && topology && topology.nodes.every((n) => n.WTK_x == null || n.WTK_y == null)
        ? overlay(<Empty description="Нет координат для отображения" />)
        : null}
    </div>
  );
}
