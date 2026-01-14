import React, { useEffect, useRef, useState } from "react";
import {
  X,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Search,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "../../lib/utils";
import {
  fetchPOICategories,
  searchPOIs,
  getCategoryIcon,
  addCustomCategory,
} from "../../services/poiService";

const radiusOptions = [
  { value: 250, label: "250m" },
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
  { value: 5000, label: "5km" },
];

const POILayerWizard = ({
  isOpen,
  onClose,
  onCreateLayer,
  onPickPoint,
  pickedPoint,
}) => {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [radius, setRadius] = useState(1000);
  const [cluster, setCluster] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [layerName, setLayerName] = useState("POI Layer");
  const [customIcon, setCustomIcon] = useState(undefined);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryGroup, setNewCategoryGroup] = useState("Custom");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchPOICategories().then(setCategories);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedCategories([]);
      setRadius(1000);
      setPreviewCount(null);
      setSearchQuery("");
      setCustomIcon(undefined);
      setShowAddCategory(false);
      setNewCategoryName("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (pickedPoint && selectedCategories.length > 0) {
      setPreviewCount(1);
    } else {
      setPreviewCount(null);
    }
  }, [pickedPoint, selectedCategories]);

  const toggleCategory = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleIconUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomIcon(e.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory = addCustomCategory(
      newCategoryName.trim(),
      newCategoryGroup
    );
    setCategories((prev) => [...prev, newCategory]);
    setSelectedCategories((prev) => [...prev, newCategory.id]);
    setNewCategoryName("");
    setShowAddCategory(false);
  };

  const handleCreate = async () => {
    if (!pickedPoint || selectedCategories.length === 0) return;
    setLoading(true);
    const primaryCategory = selectedCategories[0];
    const pois = [
      {
        id: `poi-${Date.now()}`,
        name: layerName || "POI",
        categoryId: primaryCategory,
        lat: pickedPoint.lat,
        lng: pickedPoint.lng,
        address: "Selected location",
        distanceMeters: 0,
      },
    ];
    onCreateLayer({
      name: layerName,
      center: pickedPoint,
      radiusMeters: radius,
      categoryIds: selectedCategories,
      cluster,
      showLabels,
      pois,
      customIcon,
    });
    setLoading(false);
    onClose();
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="absolute top-14 right-3 z-40 w-96 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Add POI Layer</h3>
        </div>
        <Button variant="ghost" size="iconSm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                step === s && "bg-primary text-primary-foreground",
                step > s && "bg-green-500 text-white",
                step < s && "bg-secondary text-muted-foreground"
              )}
            >
              {step > s ? <Check className="w-3 h-3" /> : s}
            </div>
            <span
              className={cn(
                "text-xs",
                step === s ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s === 1 ? "Location" : s === 2 ? "Categories" : "Create"}
            </span>
            {s < 3 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <div className="p-4">
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick a point on the map to search for nearby POIs
            </p>
            <Button onClick={onPickPoint} className="w-full gap-2">
              <MapPin className="w-4 h-4" />
              {pickedPoint ? "Re-pick point on map" : "Pick point on map"}
            </Button>
            {pickedPoint && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  Selected Location
                </div>
                <div className="font-mono text-sm">
                  {pickedPoint.lat.toFixed(6)}, {pickedPoint.lng.toFixed(6)}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Search Radius
              </label>
              <div className="flex gap-2 flex-wrap">
                {radiusOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={radius === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRadius(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">POI Categories</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Category
                </Button>
              </div>

              {showAddCategory && (
                <div className="p-3 mb-2 bg-secondary/50 rounded-lg space-y-2">
                  <Input
                    placeholder="Category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Group (e.g., Custom)"
                      value={newCategoryGroup}
                      onChange={(e) => setNewCategoryGroup(e.target.value)}
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-48 border border-border rounded-lg p-2">
                {Object.entries(groupedCategories).map(([group, cats]) => (
                  <div key={group} className="mb-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {group}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cats.map((cat) => (
                        <Badge
                          key={cat.id}
                          variant={
                            selectedCategories.includes(cat.id)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:bg-primary/20"
                          onClick={() => toggleCategory(cat.id)}
                        >
                          <span className="mr-1">
                            {getCategoryIcon(cat.id)}
                          </span>
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
              {selectedCategories.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  {selectedCategories.length} categories selected
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cluster when zoomed out</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCluster((prev) => !prev)}
                  className={cn(
                    "h-7 px-3 text-xs border",
                    cluster
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {cluster ? "On" : "Off"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Show labels</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLabels((prev) => !prev)}
                  className={cn(
                    "h-7 px-3 text-xs border",
                    showLabels
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {showLabels ? "On" : "Off"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Layer Name
              </label>
              <Input
                value={layerName}
                onChange={(e) => setLayerName(e.target.value)}
                placeholder="Enter layer name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Custom Layer Icon (Optional)
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Icon
                </Button>
                {customIcon && (
                  <div className="flex items-center gap-2">
                    <img
                      src={customIcon}
                      alt="Custom icon"
                      className="w-8 h-8 rounded object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomIcon(undefined)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Upload an image to use as the marker icon for this layer
              </p>
            </div>

            <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span className="font-mono text-xs">
                  {pickedPoint?.lat.toFixed(4)}, {pickedPoint?.lng.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Radius</span>
                <span>
                  {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Categories</span>
                <span>{selectedCategories.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preview Count</span>
                <span className="font-semibold text-primary">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `${previewCount || 0} POIs`
                  )}
                </span>
              </div>
              {customIcon && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Custom Icon</span>
                  <span className="text-green-500">Uploaded</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
        {step > 1 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <Button
            size="sm"
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 1 && !pickedPoint) ||
              (step === 2 && selectedCategories.length === 0)
            }
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleCreate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Layer"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default POILayerWizard;
