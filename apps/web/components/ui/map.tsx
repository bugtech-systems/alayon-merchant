"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  PlaceAutocomplete,
  type PlaceAutocompleteProps,
} from "@workspace/ui/components/place-autocomplete";
import type { CheckboxItem } from "@radix-ui/react-dropdown-menu";
import type {
  Circle,
  CircleMarker,
  DivIconOptions,
  Draw,
  DrawEvents,
  DrawMap,
  DrawOptions,
  EditToolbar,
  ErrorEvent,
  FeatureGroup,
  LatLngExpression,
  LayerGroup,
  Map as LeafletMap,
  LocateOptions,
  LocationEvent,
  Marker,
  MarkerCluster,
  PointExpression,
  Polygon,
  Polyline,
  Popup,
  Rectangle,
  TileLayer,
  Tooltip,
} from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet.fullscreen/dist/Control.FullScreen.css";
import type {} from "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet/dist/leaflet.css";
import {
  CircleIcon,
  LayersIcon,
  LoaderCircleIcon,
  MapPinIcon,
  MaximizeIcon,
  MinimizeIcon,
  MinusIcon,
  NavigationIcon,
  PenLineIcon,
  PentagonIcon,
  PlusIcon,
  SquareIcon,
  Trash2Icon,
  Undo2Icon,
  WaypointsIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import React, {
  Suspense,
  createContext,
  lazy,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type Ref,
} from "react";
import { renderToString } from "react-dom/server";
import {
  useMap,
  useMapEvents,
  type CircleMarkerProps,
  type CircleProps,
  type LayerGroupProps,
  type MapContainerProps,
  type MarkerProps,
  type PolygonProps,
  type PolylineProps,
  type PopupProps,
  type RectangleProps,
  type TileLayerProps,
  type TooltipProps,
} from "react-leaflet";
import type { MarkerClusterGroupProps } from "react-leaflet-markercluster";

// ============================================================
// 1. Lazy Loading Helpers
// ============================================================
function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(factory);
  return (props: React.ComponentProps<T>) => {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
      setIsMounted(true);
    }, []);
    if (!isMounted) return null;
    return (
      <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ============================================================
// 2. Lazy Loaded Leaflet Components
// ============================================================
const LeafletMapContainer = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.MapContainer }))
);
const LeafletTileLayer = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.TileLayer }))
);
const LeafletMarker = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.Marker }))
);
const LeafletPopup = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.Popup }))
);
const LeafletTooltip = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.Tooltip }))
);
const LeafletCircle = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.Circle }))
);
const LeafletCircleMarker = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.CircleMarker }))
);
const LeafletPolyline = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.Polyline }))
);
const LeafletPolygon = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.Polygon }))
);
const LeafletRectangle = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.Rectangle }))
);
const LeafletLayerGroup = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.LayerGroup }))
);
const LeafletFeatureGroup = createLazyComponent(() =>
  import("react-leaflet").then((mod) => ({ default: mod.FeatureGroup }))
);
const LeafletMarkerClusterGroup = createLazyComponent(async () =>
  import("react-leaflet-markercluster").then((mod) => ({
    default: mod.default,
  }))
);

// ============================================================
// 3. Core Map Component
// ============================================================
interface MapProps extends Omit<MapContainerProps, "zoomControl"> {
  center: LatLngExpression;
  zoom?: number;
  maxZoom?: number;
  className?: string;
  ref?: Ref<LeafletMap>;
}

function Map({
  zoom = 15,
  maxZoom = 18,
  className,
  children,
  ...props
}: MapProps) {
  return (
    <LeafletMapContainer
      zoom={zoom}
      maxZoom={maxZoom}
      attributionControl={false}
      zoomControl={false}
      className={cn(
        "z-50 size-full min-h-96 flex-1 rounded-md border border-border shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </LeafletMapContainer>
  );
}

// ============================================================
// 4. Tile Layer with Theme Support
// ============================================================
interface MapTileLayerOption {
  name: string;
  url: string;
  attribution?: string;
}

interface MapTileLayerProps extends Partial<TileLayerProps> {
  name?: string;
  darkUrl?: string;
  darkAttribution?: string;
  ref?: Ref<TileLayer>;
}

function MapTileLayer({
  name = "Default",
  url,
  attribution,
  darkUrl,
  darkAttribution,
  ...props
}: MapTileLayerProps) {
  const map = useMap();
  const context = useContext(MapLayersContext);
  const { resolvedTheme } = useTheme();

  const DEFAULT_URL =
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
  const DEFAULT_DARK_URL =
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";

  const resolvedUrl =
    resolvedTheme === "dark"
      ? darkUrl ?? url ?? DEFAULT_DARK_URL
      : url ?? DEFAULT_URL;

  const resolvedAttribution =
    resolvedTheme === "dark" && darkAttribution
      ? darkAttribution
      : attribution ??
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>';

  if (map.attributionControl) {
    map.attributionControl.setPrefix("");
  }

  useEffect(() => {
    if (context) {
      context.registerTileLayer({ name, url: resolvedUrl, attribution: resolvedAttribution });
    }
  }, [context, name, resolvedUrl, resolvedAttribution]);

  if (context && context.selectedTileLayer !== name) {
    return null;
  }

  return <LeafletTileLayer url={resolvedUrl} attribution={resolvedAttribution} {...props} />;
}

// ============================================================
// 5. Layer Groups
// ============================================================
interface MapLayerGroupOption
  extends Pick<React.ComponentProps<typeof CheckboxItem>, "disabled"> {
  name: string;
}

interface MapLayerGroupProps extends LayerGroupProps, MapLayerGroupOption {
  ref?: Ref<LayerGroup>;
}

function MapLayerGroup({ name, disabled, ...props }: MapLayerGroupProps) {
  const context = useMapLayersContext();
  useEffect(() => {
    if (context) context.registerLayerGroup({ name, disabled });
  }, [context, name, disabled]);
  if (context && !context.activeLayerGroups.includes(name)) return null;
  return <LeafletLayerGroup {...props} />;
}

interface MapFeatureGroupProps extends LayerGroupProps, MapLayerGroupOption {
  ref?: Ref<FeatureGroup>;
}

function MapFeatureGroup({ name, disabled, ...props }: MapFeatureGroupProps) {
  const context = useMapLayersContext();
  useEffect(() => {
    if (context) context.registerLayerGroup({ name, disabled });
  }, [context, name, disabled]);
  if (context && !context.activeLayerGroups.includes(name)) return null;
  return <LeafletFeatureGroup {...props} />;
}

// ============================================================
// 6. Layers Context & Provider
// ============================================================
interface MapLayersContextType {
  registerTileLayer: (layer: MapTileLayerOption) => void;
  tileLayers: MapTileLayerOption[];
  selectedTileLayer: string;
  setSelectedTileLayer: (name: string) => void;
  registerLayerGroup: (layer: MapLayerGroupOption) => void;
  layerGroups: MapLayerGroupOption[];
  activeLayerGroups: string[];
  setActiveLayerGroups: (names: string[]) => void;
}

const MapLayersContext = createContext<MapLayersContextType | null>(null);

function useMapLayersContext() {
  const context = useContext(MapLayersContext);
  if (!context) {
    throw new Error("useMapLayersContext must be used within MapLayers");
  }
  return context;
}

interface MapLayersProps {
  children: ReactNode;
  defaultTileLayer?: string;
  defaultLayerGroups?: string[];
}

function MapLayers({
  children,
  defaultTileLayer,
  defaultLayerGroups = [],
}: MapLayersProps) {
  const [tileLayers, setTileLayers] = useState<MapTileLayerOption[]>([]);
  const [selectedTileLayer, setSelectedTileLayer] = useState<string>("");
  const [layerGroups, setLayerGroups] = useState<MapLayerGroupOption[]>([]);
  const [activeLayerGroups, setActiveLayerGroups] =
    useState<string[]>(defaultLayerGroups);

  const registerTileLayer = (tileLayer: MapTileLayerOption) => {
    setTileLayers((prev) => {
      if (prev.some((layer) => layer.name === tileLayer.name)) return prev;
      return [...prev, tileLayer];
    });
  };

  const registerLayerGroup = (layerGroup: MapLayerGroupOption) => {
    setLayerGroups((prev) => {
      if (prev.some((group) => group.name === layerGroup.name)) return prev;
      return [...prev, layerGroup];
    });
  };

  // Auto-select first tile layer when available
  useEffect(() => {
    if (tileLayers.length > 0 && !selectedTileLayer) {
      const validDefault =
        defaultTileLayer && tileLayers.some((l) => l.name === defaultTileLayer)
          ? defaultTileLayer
          : tileLayers[0].name;
      setSelectedTileLayer(validDefault);
    }
  }, [tileLayers, defaultTileLayer, selectedTileLayer]);

  return (
    <MapLayersContext.Provider
      value={{
        registerTileLayer,
        tileLayers,
        selectedTileLayer,
        setSelectedTileLayer,
        registerLayerGroup,
        layerGroups,
        activeLayerGroups,
        setActiveLayerGroups,
      }}
    >
      {children}
    </MapLayersContext.Provider>
  );
}

// ============================================================
// 7. Layers Control UI
// ============================================================
interface MapLayersControlProps extends React.ComponentProps<"button"> {
  tileLayersLabel?: string;
  layerGroupsLabel?: string;
  position?: string;
}

function MapLayersControl({
  tileLayersLabel = "Map Type",
  layerGroupsLabel = "Layers",
  position = "top-1 right-1",
  className,
  ...props
}: MapLayersControlProps) {
  const {
    tileLayers,
    selectedTileLayer,
    setSelectedTileLayer,
    layerGroups,
    activeLayerGroups,
    setActiveLayerGroups,
  } = useMapLayersContext();

  const showTileLayersDropdown = tileLayers.length > 1;
  const showLayerGroupsDropdown = layerGroups.length > 0;

  if (!showTileLayersDropdown && !showLayerGroupsDropdown) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label="Select layers"
          title="Select layers"
          className={cn("absolute z-[1000] border shadow-sm", position, className)}
          {...props}
        >
          <LayersIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[1000] min-w-[180px]">
        {showTileLayersDropdown && (
          <>
            <DropdownMenuLabel>{tileLayersLabel}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={selectedTileLayer}
              onValueChange={setSelectedTileLayer}
            >
              {tileLayers.map((tileLayer) => (
                <DropdownMenuRadioItem key={tileLayer.name} value={tileLayer.name}>
                  {tileLayer.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
        {showTileLayersDropdown && showLayerGroupsDropdown && (
          <DropdownMenuSeparator />
        )}
        {showLayerGroupsDropdown && (
          <>
            <DropdownMenuLabel>{layerGroupsLabel}</DropdownMenuLabel>
            {layerGroups.map((layerGroup) => (
              <DropdownMenuCheckboxItem
                key={layerGroup.name}
                checked={activeLayerGroups.includes(layerGroup.name)}
                disabled={layerGroup.disabled}
                onCheckedChange={(checked) =>
                  setActiveLayerGroups(
                    checked
                      ? [...activeLayerGroups, layerGroup.name]
                      : activeLayerGroups.filter((n) => n !== layerGroup.name)
                  )
                }
              >
                {layerGroup.name}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================
// 8. Map Control Container
// ============================================================
function MapControlContainer({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { L } = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!L || !containerRef.current) return;
    const element = containerRef.current;
    L.DomEvent.disableClickPropagation(element);
    L.DomEvent.disableScrollPropagation(element);
  }, [L]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute z-[1000] size-fit cursor-default", className)}
      {...props}
    />
  );
}

// ============================================================
// 9. Zoom Control
// ============================================================
interface MapZoomControlProps extends React.ComponentProps<"div"> {
  position?: string;
}

function MapZoomControl({
  position = "top-1 left-1",
  className,
  ...props
}: MapZoomControlProps) {
  const map = useMap();
  const [zoomLevel, setZoomLevel] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoomLevel(map.getZoom()),
  });

  return (
    <MapControlContainer className={cn(position, className)}>
      <ButtonGroup orientation="vertical" aria-label="Zoom controls" {...props}>
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label="Zoom in"
          title="Zoom in"
          className="border border-b-0 rounded-b-none"
          disabled={zoomLevel >= map.getMaxZoom()}
          onClick={() => map.zoomIn()}
        >
          <PlusIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label="Zoom out"
          title="Zoom out"
          className="border rounded-t-none"
          disabled={zoomLevel <= map.getMinZoom()}
          onClick={() => map.zoomOut()}
        >
          <MinusIcon className="size-4" />
        </Button>
      </ButtonGroup>
    </MapControlContainer>
  );
}

// ============================================================
// 10. Fullscreen Control
// ============================================================
function MapFullscreenControl({
  position = "top-1 right-1",
  className,
  ...props
}: React.ComponentProps<"button"> & { position?: string }) {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { L } = useLeaflet();

  useEffect(() => {
    if (!L) return;
    const fullscreenControl = new L.Control.FullScreen();
    fullscreenControl.addTo(map);
    const container = fullscreenControl.getContainer();
    if (container) container.style.display = "none";

    const handleEnter = () => setIsFullscreen(true);
    const handleExit = () => setIsFullscreen(false);

    map.on("enterFullscreen", handleEnter);
    map.on("exitFullscreen", handleExit);

    return () => {
      fullscreenControl.remove();
      map.off("enterFullscreen", handleEnter);
      map.off("exitFullscreen", handleExit);
    };
  }, [L, map]);

  return (
    <MapControlContainer className={cn(position, className)}>
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        onClick={() => map.toggleFullscreen()}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className="border shadow-sm"
        {...props}
      >
        {isFullscreen ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
      </Button>
    </MapControlContainer>
  );
}

// ============================================================
// 11. Locate Control
// ============================================================
function MapLocatePulseIcon() {
  return (
    <div className="absolute -top-1 -end-1 flex size-3 rounded-full">
      <div className="bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-75" />
      <div className="bg-primary relative inline-flex size-3 rounded-full" />
    </div>
  );
}

function MapLocateControl({
  watch = false,
  onLocationFound,
  onLocationError,
  position = "right-1 bottom-1",
  className,
  ...props
}: React.ComponentProps<"button"> &
  Pick<LocateOptions, "watch"> & {
    onLocationFound?: (location: LocationEvent) => void;
    onLocationError?: (error: ErrorEvent) => void;
    position?: string;
  }) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState<LatLngExpression | null>(null);

  const startLocating = () => {
    setIsLocating(true);
    map.locate({ setView: true, maxZoom: map.getMaxZoom(), watch });
    map.on("locationfound", (loc: LocationEvent) => {
      setLocation(loc.latlng);
      setIsLocating(false);
      onLocationFound?.(loc);
    });
    map.on("locationerror", (err: ErrorEvent) => {
      setLocation(null);
      setIsLocating(false);
      onLocationError?.(err);
    });
  };

  const stopLocating = () => {
    map.stopLocate();
    map.off("locationfound");
    map.off("locationerror");
    setLocation(null);
    setIsLocating(false);
  };

  useEffect(() => () => stopLocating(), []);

  return (
    <MapControlContainer className={cn(position, className)}>
      <Button
        type="button"
        size="icon-sm"
        variant={location ? "default" : "secondary"}
        onClick={location ? stopLocating : startLocating}
        disabled={isLocating}
        title={
          isLocating
            ? "Locating..."
            : location
            ? "Stop tracking"
            : "Track location"
        }
        aria-label={
          isLocating
            ? "Locating..."
            : location
            ? "Stop location tracking"
            : "Start location tracking"
        }
        className="border shadow-sm"
        {...props}
      >
        {isLocating ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <NavigationIcon className="size-4" />
        )}
      </Button>
      {location && <MapMarker position={location} icon={<MapLocatePulseIcon />} />}
    </MapControlContainer>
  );
}

// ============================================================
// 12. Search Control
// ============================================================
function MapSearchControl({
  position = "top-1 left-1",
  className,
  ...props
}: PlaceAutocompleteProps & { position?: string }) {
  return (
    <MapControlContainer className={cn("z-[1001] w-60", position, className)}>
      <PlaceAutocomplete {...props} />
    </MapControlContainer>
  );
}

// ============================================================
// 13. Marker Components
// ============================================================
interface MapMarkerProps extends Omit<MarkerProps, "icon"> {
  icon?: ReactNode;
  iconAnchor?: PointExpression;
  bgPos?: PointExpression;
  popupAnchor?: PointExpression;
  tooltipAnchor?: PointExpression;
  ref?: Ref<Marker>;
}

function MapMarker({
  icon = <MapPinIcon className="size-6" />,
  iconAnchor = [12, 12],
  bgPos,
  popupAnchor,
  tooltipAnchor,
  ...props
}: MapMarkerProps) {
  const { L } = useLeaflet();
  if (!L) return null;

  return (
    <LeafletMarker
      icon={L.divIcon({
        html: renderToString(icon),
        iconAnchor,
        ...(bgPos ? { bgPos } : {}),
        ...(popupAnchor ? { popupAnchor } : {}),
        ...(tooltipAnchor ? { tooltipAnchor } : {}),
      })}
      riseOnHover
      {...props}
    />
  );
}

interface MapMarkerClusterGroupProps extends Omit<MarkerClusterGroupProps, "iconCreateFunction"> {
  children: ReactNode;
  icon?: (markerCount: number) => ReactNode;
}

function MapMarkerClusterGroup({
  polygonOptions = {
    className: "fill-foreground stroke-foreground stroke-2",
  },
  spiderLegPolylineOptions = {
    className: "fill-foreground stroke-foreground stroke-2",
  },
  icon,
  ...props
}: MapMarkerClusterGroupProps) {
  const { L } = useLeaflet();
  if (!L) return null;

  const iconCreateFunction = icon
    ? (cluster: MarkerCluster) => {
        const markerCount = cluster.getChildCount();
        return L.divIcon({
          html: renderToString(icon(markerCount)),
        });
      }
    : undefined;

  return (
    <LeafletMarkerClusterGroup
      polygonOptions={polygonOptions}
      spiderLegPolylineOptions={spiderLegPolylineOptions}
      iconCreateFunction={iconCreateFunction}
      {...props}
    />
  );
}

// ============================================================
// 14. Shape Components (with proper styling)
// ============================================================
interface MapShapeProps {
  className?: string;
}

function MapCircle({ className, ...props }: CircleProps & MapShapeProps & { ref?: Ref<Circle> }) {
  return (
    <LeafletCircle
      className={cn("fill-foreground/20 stroke-foreground stroke-2", className)}
      {...props}
    />
  );
}

function MapCircleMarker({
  className,
  ...props
}: CircleMarkerProps & MapShapeProps & { ref?: Ref<CircleMarker> }) {
  return (
    <LeafletCircleMarker
      className={cn("fill-foreground/20 stroke-foreground stroke-2", className)}
      {...props}
    />
  );
}

function MapPolyline({
  className,
  ...props
}: PolylineProps & MapShapeProps & { ref?: Ref<Polyline> }) {
  return (
    <LeafletPolyline
      className={cn("stroke-foreground stroke-2", className)}
      {...props}
    />
  );
}

function MapPolygon({
  className,
  ...props
}: PolygonProps & MapShapeProps & { ref?: Ref<Polygon> }) {
  return (
    <LeafletPolygon
      className={cn("fill-foreground/20 stroke-foreground stroke-2", className)}
      {...props}
    />
  );
}

function MapRectangle({
  className,
  ...props
}: RectangleProps & MapShapeProps & { ref?: Ref<Rectangle> }) {
  return (
    <LeafletRectangle
      className={cn("fill-foreground/20 stroke-foreground stroke-2", className)}
      {...props}
    />
  );
}

// ============================================================
// 15. Popup & Tooltip
// ============================================================
function MapPopup({
  className,
  ...props
}: Omit<PopupProps, "content"> & { ref?: Ref<Popup> }) {
  return (
    <LeafletPopup
      className={cn(
        "bg-popover text-popover-foreground animate-in fade-out-0 fade-in-0 zoom-out-95 zoom-in-95 slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 font-sans shadow-md outline-hidden",
        className
      )}
      {...props}
    />
  );
}

interface MapTooltipProps extends Omit<TooltipProps, "offset"> {
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  ref?: Ref<Tooltip>;
}

function MapTooltip({
  className,
  children,
  side = "top",
  sideOffset = 15,
  ...props
}: MapTooltipProps) {
  const ARROW_POSITION_CLASSES = {
    top: "bottom-0.5 left-1/2 -translate-x-1/2 translate-y-1/2",
    bottom: "top-0.5 left-1/2 -translate-x-1/2 -translate-y-1/2",
    left: "right-0.5 top-1/2 translate-x-1/2 -translate-y-1/2",
    right: "left-0.5 top-1/2 -translate-x-1/2 -translate-y-1/2",
  };
  const DEFAULT_OFFSET: Record<"top" | "bottom" | "left" | "right", PointExpression> = {
    top: [0, -sideOffset],
    bottom: [0, sideOffset],
    left: [-sideOffset, 0],
    right: [sideOffset, 0],
  };

  return (
    <LeafletTooltip
      className={cn(
        "animate-in fade-in-0 zoom-in-95 fade-out-0 zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 w-fit text-xs text-balance transition-opacity",
        className
      )}
      data-side={side}
      direction={side}
      offset={DEFAULT_OFFSET[side]}
      opacity={1}
      {...props}
    >
      {children}
      <div
        className={cn(
          "bg-foreground fill-foreground absolute z-50 size-2.5 rotate-45 rounded-[2px]",
          ARROW_POSITION_CLASSES[side]
        )}
      />
    </LeafletTooltip>
  );
}

// ============================================================
// 16. Draw Components
// ============================================================
type MapDrawShape = "marker" | "polyline" | "circle" | "rectangle" | "polygon";
type MapDrawAction = "edit" | "delete";
type MapDrawMode = MapDrawShape | MapDrawAction | null;

interface MapDrawContextType {
  readonly featureGroup: L.FeatureGroup | null;
  activeMode: MapDrawMode;
  setActiveMode: (mode: MapDrawMode) => void;
  readonly editControlRef: React.RefObject<EditToolbar.Edit | null>;
  readonly deleteControlRef: React.RefObject<EditToolbar.Delete | null>;
  readonly layersCount: number;
}

const MapDrawContext = createContext<MapDrawContextType | null>(null);

function useMapDrawContext() {
  const context = useContext(MapDrawContext);
  if (!context) {
    throw new Error("useMapDrawContext must be used within MapDrawControl");
  }
  return context;
}

function MapDrawControl({
  onLayersChange,
  position = "bottom-1 left-1",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  onLayersChange?: (layers: L.FeatureGroup) => void;
  position?: string;
}) {
  const { L, LeafletDraw } = useLeaflet();
  const map = useMap();
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const editControlRef = useRef<EditToolbar.Edit | null>(null);
  const deleteControlRef = useRef<EditToolbar.Delete | null>(null);
  const [activeMode, setActiveMode] = useState<MapDrawMode>(null);
  const [layersCount, setLayersCount] = useState(0);

  const updateLayersCount = () => {
    if (featureGroupRef.current) {
      setLayersCount(featureGroupRef.current.getLayers().length);
    }
  };

  const handleDrawCreated = (event: DrawEvents.Created) => {
    if (!featureGroupRef.current) return;
    featureGroupRef.current.addLayer(event.layer);
    onLayersChange?.(featureGroupRef.current);
    updateLayersCount();
    setActiveMode(null);
  };

  const handleDrawEditedOrDeleted = () => {
    if (!featureGroupRef.current) return;
    onLayersChange?.(featureGroupRef.current);
    updateLayersCount();
    setActiveMode(null);
  };

  useEffect(() => {
    if (!L || !LeafletDraw || !map) return;
    map.on(L.Draw.Event.CREATED, handleDrawCreated);
    map.on(L.Draw.Event.EDITED, handleDrawEditedOrDeleted);
    map.on(L.Draw.Event.DELETED, handleDrawEditedOrDeleted);
    return () => {
      map.off(L.Draw.Event.CREATED, handleDrawCreated);
      map.off(L.Draw.Event.EDITED, handleDrawEditedOrDeleted);
      map.off(L.Draw.Event.DELETED, handleDrawEditedOrDeleted);
    };
  }, [L, LeafletDraw, map]);

  return (
    <MapDrawContext.Provider
      value={{
        featureGroup: featureGroupRef.current,
        activeMode,
        setActiveMode,
        editControlRef,
        deleteControlRef,
        layersCount,
      }}
    >
      <LeafletFeatureGroup ref={featureGroupRef} />
      <MapControlContainer className={cn(position, className)}>
        <ButtonGroup orientation="vertical" {...props}>
          {children}
        </ButtonGroup>
      </MapControlContainer>
    </MapDrawContext.Provider>
  );
}

// ... (Draw shape buttons, Edit, Delete, Undo - same as before)

// ============================================================
// 17. Leaflet Hook
// ============================================================
function useLeaflet() {
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [LeafletDraw, setLeafletDraw] = useState<typeof import("leaflet-draw") | null>(null);

  useEffect(() => {
    async function loadLeaflet() {
      const leaflet = await import("leaflet");
      const leafletFullscreen = await import("leaflet.fullscreen");
      const leafletDraw = await import("leaflet-draw");

      const L_object = leaflet.default;
      if (L_object.Control && !L_object.Control.FullScreen) {
        L_object.Control.FullScreen = leafletFullscreen.default || leafletFullscreen;
      }

      setLeafletDraw(leafletDraw);
      setL(L_object);
    }

    if (L && LeafletDraw) return;
    if (typeof window === "undefined") return;
    loadLeaflet();
  }, [L, LeafletDraw]);

  return { L, LeafletDraw };
}

// ============================================================
// 18. Exports
// ============================================================
export {
  Map,
  MapCircle,
  MapCircleMarker,
  MapControlContainer,
  MapDrawCircle,
  MapDrawControl,
  MapDrawDelete,
  MapDrawEdit,
  MapDrawMarker,
  MapDrawPolygon,
  MapDrawPolyline,
  MapDrawRectangle,
  MapDrawUndo,
  MapFeatureGroup,
  MapFullscreenControl,
  MapLayerGroup,
  MapLayers,
  MapLayersControl,
  MapLocateControl,
  MapMarker,
  MapMarkerClusterGroup,
  MapPolygon,
  MapPolyline,
  MapPopup,
  MapRectangle,
  MapSearchControl,
  MapTileLayer,
  MapTooltip,
  MapZoomControl,
  useLeaflet,
};