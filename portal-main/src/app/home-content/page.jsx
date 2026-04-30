"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash, Eye, EyeOff } from "lucide-react";
import Loader from "@/components/custom/loader";
import useToast from "@/hooks/useToast";
import {
  getHomeContents,
  createHomeContent,
  updateHomeContent,
  deleteHomeContent,
} from "@/services/homecontent";

const SECTIONS = [
  { value: "feature", label: "Feature (Grid Cards)" },
  { value: "test", label: "Test Card" },
  { value: "hero", label: "Hero Banner" },
  { value: "footer", label: "Footer" },
];

const EMPTY_FORM = {
  section: "feature",
  icon: "",
  title: "",
  description: "",
  bgColor: "",
  btnColor: "",
  imageUrl: "",
  sortOrder: 0,
  isActive: true,
};

export default function HomeContentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [filterSection, setFilterSection] = useState("all");

  const { showError, showSuccess } = useToast();

  const loadItems = async () => {
    try {
      setIsLoading(true);
      const { data } = await getHomeContents();
      setItems(data);
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onAdd = () => {
    setIsOpen(true);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
  };

  const onEdit = (item) => {
    setIsOpen(true);
    setEditingItem(item);
    setFormData({
      section: item.section,
      icon: item.icon || "",
      title: item.title,
      description: item.description || "",
      bgColor: item.bgColor || "",
      btnColor: item.btnColor || "",
      imageUrl: item.imageUrl || "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  };

  const onCancel = () => {
    setIsOpen(false);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      if (editingItem) {
        await updateHomeContent(editingItem.id, formData);
      } else {
        await createHomeContent(formData);
      }
      await loadItems();
      onCancel();
      showSuccess(`Content ${editingItem ? "updated" : "added"} successfully`);
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async (item) => {
    if (confirm("Delete this content?")) {
      try {
        setIsLoading(true);
        await deleteHomeContent(item.id);
        await loadItems();
        showSuccess("Deleted");
      } catch (error) {
        showError(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const onToggleActive = async (item) => {
    try {
      await updateHomeContent(item.id, { isActive: !item.isActive });
      await loadItems();
      showSuccess(item.isActive ? "Hidden from app" : "Visible in app");
    } catch (error) {
      showError(error);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filtered =
    filterSection === "all"
      ? items
      : items.filter((i) => i.section === filterSection);

  if (isLoading && items.length === 0) return <Loader />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Home Screen Content
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage features, test cards, hero banner &amp; footer shown in the
            app
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Content
        </Button>
      </div>

      {/* Section Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterSection === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterSection("all")}
        >
          All ({items.length})
        </Button>
        {SECTIONS.map((s) => {
          const count = items.filter((i) => i.section === s.value).length;
          return (
            <Button
              key={s.value}
              variant={filterSection === s.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSection(s.value)}
            >
              {s.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <Card
            key={item.id}
            className={`relative ${!item.isActive ? "opacity-50" : ""}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {item.section}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onToggleActive(item)}
                    className="p-1.5 rounded-md hover:bg-secondary"
                    title={item.isActive ? "Hide" : "Show"}
                  >
                    {item.isActive ? (
                      <Eye className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1.5 rounded-md hover:bg-secondary"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="p-1.5 rounded-md hover:bg-destructive/10"
                  >
                    <Trash className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              {item.icon && (
                <span className="text-2xl mr-2">{item.icon}</span>
              )}
              <h3 className="font-bold text-foreground">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                {item.bgColor && (
                  <span className="text-[10px] px-2 py-0.5 rounded border text-muted-foreground">
                    bg: {item.bgColor}
                  </span>
                )}
                {item.btnColor && (
                  <span className="text-[10px] px-2 py-0.5 rounded border text-muted-foreground">
                    btn: {item.btnColor}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded border text-muted-foreground">
                  order: {item.sortOrder}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No content found. Click &quot;Add Content&quot; to get started.
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Content" : "Add Content"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Section */}
            <div>
              <label className="text-sm font-medium mb-1 block">Section</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background text-foreground"
                value={formData.section}
                onChange={(e) =>
                  setFormData({ ...formData, section: e.target.value })
                }
              >
                {SECTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Icon */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Icon (emoji)
              </label>
              <Input
                value={formData.icon}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value })
                }
                placeholder="💡"
              />
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Feature name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Short description..."
                rows={2}
              />
            </div>

            {/* Colors — only for test cards */}
            {formData.section === "test" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    BG Color
                  </label>
                  <Input
                    value={formData.bgColor}
                    onChange={(e) =>
                      setFormData({ ...formData, bgColor: e.target.value })
                    }
                    placeholder="#E8F5E9"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Button Color
                  </label>
                  <Input
                    value={formData.btnColor}
                    onChange={(e) =>
                      setFormData({ ...formData, btnColor: e.target.value })
                    }
                    placeholder="#2E7D32"
                  />
                </div>
              </div>
            )}

            {/* Image URL — for hero/footer */}
            {(formData.section === "hero" || formData.section === "footer") && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Image URL
                </label>
                <Input
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Sort Order */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Sort Order
              </label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="rounded"
                id="isActive"
              />
              <label htmlFor="isActive" className="text-sm">
                Active (visible in app)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading
                  ? "Saving..."
                  : editingItem
                    ? "Update"
                    : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
