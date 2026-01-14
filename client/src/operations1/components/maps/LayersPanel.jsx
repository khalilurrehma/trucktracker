import React, { useRef, useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Plus,
  MoreVertical,
  GripVertical,
  MapPin,
  FileJson,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";

const LayersPanel = ({
  isOpen,
  onClose,
  layers = [],
  systemLayers = [],
  onSystemLayerToggle,
  onAddLayer,
  onLayerToggle,
  onLayerDelete,
  onLayerRename,
  onLayerOpacityChange,
  onGeoJSONUpload,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSystemLayers, setShowSystemLayers] = useState(false);
  const [uploadingGeoJSON, setUploadingGeoJSON] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case "POI":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "GeoJSON":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "System":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "";
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingGeoJSON(true);
    try {
      await onGeoJSONUpload?.(file);
    } finally {
      setUploadingGeoJSON(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleGeoJSONClick = () => {
    setShowAddMenu(false);
    fileInputRef.current?.click();
  };

  const handleSystemClick = () => {
    setShowAddMenu(false);
    setShowSystemLayers(true);
  };

  return (
    <div className="absolute top-14 right-3 z-30 w-80 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.geojson"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Layers</h3>
        <Button variant="ghost" size="iconSm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {showSystemLayers ? (
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">System Layers</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSystemLayers(false)}
            >
              Done
            </Button>
          </div>
          <div className="space-y-2">
            {systemLayers.map((layer) => (
              <div
                key={layer.id}
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span className="text-sm">{layer.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSystemLayerToggle?.(layer.id)}
                  className={cn(
                    "h-7 px-3 text-xs border",
                    layer.visible
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {layer.visible ? "On" : "Off"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ScrollArea className="max-h-80">
        <div className="p-2 space-y-1">
          {layers.length === 0 && !showSystemLayers ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No layers added yet
            </div>
          ) : (
            layers.map((layer) => (
              <div
                key={layer.id}
                className="group flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => onLayerToggle?.(layer.id)}
                  className="h-7 w-7"
                >
                  {layer.visible ? (
                    <Eye className="w-4 h-4 text-primary" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {layer.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        getTypeBadgeStyle(layer.type)
                      )}
                    >
                      {layer.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round((layer.opacity ?? 1) * 100)}
                      onChange={(event) =>
                        onLayerOpacityChange?.(
                          layer.id,
                          Number(event.target.value) / 100
                        )
                      }
                      className="w-20 accent-primary"
                    />
                    <span className="text-[10px] text-muted-foreground w-8">
                      {Math.round(layer.opacity * 100)}%
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        const newName = window.prompt(
                          "Enter new name:",
                          layer.name
                        );
                        if (newName) onLayerRename?.(layer.id, newName);
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onLayerDelete?.(layer.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <DropdownMenu open={showAddMenu} onOpenChange={setShowAddMenu}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Layer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuItem
              onClick={() => {
                onAddLayer?.("POI");
                setShowAddMenu(false);
              }}
              className="gap-2"
            >
              <MapPin className="w-4 h-4 text-blue-400" />
              <div>
                <div className="font-medium">What's here? (POI)</div>
                <div className="text-xs text-muted-foreground">
                  Find nearby points of interest
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleGeoJSONClick} className="gap-2">
              {uploadingGeoJSON ? (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4 text-purple-400" />
              )}
              <div>
                <div className="font-medium">GeoJSON Upload</div>
                <div className="text-xs text-muted-foreground">
                  Import custom geometry file
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSystemClick} className="gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-medium">System Layers</div>
                <div className="text-xs text-muted-foreground">
                  Toggle existing overlays
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default LayersPanel;
