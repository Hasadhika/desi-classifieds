import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/api/categoriesApi";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash, ImagePlus, Loader2, Pencil } from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function uploadCategoryIcon(slug, file) {
  const ext = file.name.split(".").pop();
  const path = `category-icons/${slug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("listing-images")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("listing-images").getPublicUrl(path);
  return publicUrl;
}

function IconPreviewInput({ preview, onChange, onRemove }) {
  return (
    <div className="mt-1.5 flex items-center gap-3">
      {preview ? (
        <img src={preview} alt="icon preview" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
      ) : (
        <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
          <ImagePlus className="w-5 h-5 text-gray-400" />
        </div>
      )}
      <label className="cursor-pointer">
        <span className="text-sm text-[#D80621] font-medium hover:underline">
          {preview ? "Change image" : "Upload image"}
        </span>
        <input type="file" accept="image/*" className="hidden" onChange={onChange} />
      </label>
      {preview && (
        <button className="text-xs text-gray-400 hover:text-red-500" onClick={onRemove}>
          Remove
        </button>
      )}
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function CategoryManager() {
  const queryClient = useQueryClient();

  // ── add category ────────────────────────────────────────────────────────────
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ parent_id: null, slug: "", label: "", sort_order: 0 });
  const [addIconFile, setAddIconFile] = useState(null);
  const [addIconPreview, setAddIconPreview] = useState(null);
  const [addIconUploading, setAddIconUploading] = useState(false);

  // ── edit category ───────────────────────────────────────────────────────────
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // full category object
  const [editIconFile, setEditIconFile] = useState(null);
  const [editIconPreview, setEditIconPreview] = useState(null);
  const [editIconUploading, setEditIconUploading] = useState(false);

  // ── add / delete field ──────────────────────────────────────────────────────
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newField, setNewField] = useState({
    category_id: "", slug: "", label: "", field_type: "text",
    required: false, placeholder: "", options: [], sort_order: 0,
  });

  // ── queries ─────────────────────────────────────────────────────────────────
  const { data: allCategories = [] } = useQuery({
    queryKey: ["allCategories"],
    queryFn: () => categoriesApi.getAllCategories(),
  });

  const parentCategories = allCategories.filter(c => !c.parent_id);

  const { data: categoryFields = [] } = useQuery({
    queryKey: ["allCategoryFields", selectedCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_fields")
        .select("*")
        .eq("category_id", selectedCategory)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategory,
  });

  // ── invalidate helper ────────────────────────────────────────────────────────
  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ["allCategories"] });
    queryClient.invalidateQueries({ queryKey: ["parentCategories"] });
  };

  // ── add category mutation ────────────────────────────────────────────────────
  const addCategoryMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("categories").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCategories();
      toast.success("Category added successfully");
      setIsAddCategoryOpen(false);
      setNewCategory({ parent_id: null, slug: "", label: "", sort_order: 0 });
      setAddIconFile(null);
      setAddIconPreview(null);
    },
    onError: (e) => toast.error(e.message || "Failed to add category"),
  });

  // ── edit category mutation ───────────────────────────────────────────────────
  const editCategoryMutation = useMutation({
    mutationFn: async ({ id, label, slug, sort_order, icon_url }) => {
      const updates = { label, slug, sort_order: sort_order ?? 0, icon_url };
      const { error } = await supabase.from("categories").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCategories();
      toast.success("Category updated successfully");
      setIsEditCategoryOpen(false);
      setEditingCategory(null);
      setEditIconFile(null);
      setEditIconPreview(null);
    },
    onError: (e) => toast.error(e.message || "Failed to update category"),
  });

  // ── delete category mutation ─────────────────────────────────────────────────
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id) => {
      // Find subcategory ids
      const { data: subs } = await supabase.from("categories").select("id").eq("parent_id", id);
      const subIds = (subs ?? []).map(s => s.id);
      const allIds = [id, ...subIds];

      // Delete fields for all affected categories
      await supabase.from("category_fields").delete().in("category_id", allIds);

      // Delete subcategories, then the category itself
      if (subIds.length > 0) {
        await supabase.from("categories").delete().in("id", subIds);
      }
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCategories();
      queryClient.invalidateQueries({ queryKey: ["allCategoryFields"] });
      toast.success("Category deleted");
    },
    onError: (e) => toast.error(e.message || "Failed to delete category"),
  });

  // ── add/delete field mutations ───────────────────────────────────────────────
  const addFieldMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("category_fields").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allCategoryFields"] });
      queryClient.invalidateQueries({ queryKey: ["categoryFields"] });
      toast.success("Field added successfully");
      setIsAddFieldOpen(false);
      setNewField({ category_id: "", slug: "", label: "", field_type: "text", required: false, placeholder: "", options: [], sort_order: 0 });
    },
    onError: (e) => toast.error(e.message || "Failed to add field"),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId) => {
      const { error } = await supabase.from("category_fields").delete().eq("id", fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allCategoryFields"] });
      toast.success("Field deleted");
    },
    onError: (e) => toast.error(e.message || "Failed to delete field"),
  });

  // ── handlers ─────────────────────────────────────────────────────────────────

  const handleAddCategory = async () => {
    if (!newCategory.slug || !newCategory.label) {
      toast.error("Slug and label are required");
      return;
    }
    let icon_url = null;
    if (addIconFile) {
      setAddIconUploading(true);
      try {
        icon_url = await uploadCategoryIcon(newCategory.slug, addIconFile);
      } catch {
        toast.error("Failed to upload icon image");
        setAddIconUploading(false);
        return;
      }
      setAddIconUploading(false);
    }
    addCategoryMutation.mutate({ ...newCategory, ...(icon_url ? { icon_url } : {}) });
  };

  const openEditDialog = (cat) => {
    setEditingCategory({ ...cat });
    setEditIconPreview(cat.icon_url || null);
    setEditIconFile(null);
    setIsEditCategoryOpen(true);
  };

  const handleEditCategory = async () => {
    if (!editingCategory?.slug || !editingCategory?.label) {
      toast.error("Slug and label are required");
      return;
    }
    let icon_url = editingCategory.icon_url ?? null;
    if (editIconFile) {
      setEditIconUploading(true);
      try {
        icon_url = await uploadCategoryIcon(editingCategory.slug, editIconFile);
      } catch {
        toast.error("Failed to upload icon image");
        setEditIconUploading(false);
        return;
      }
      setEditIconUploading(false);
    }
    editCategoryMutation.mutate({
      id: editingCategory.id,
      label: editingCategory.label,
      slug: editingCategory.slug,
      sort_order: editingCategory.sort_order ?? 0,
      icon_url,
    });
  };

  const handleDeleteCategory = (cat) => {
    const hasSubs = allCategories.some(c => c.parent_id === cat.id);
    const msg = hasSubs
      ? `Delete "${cat.label}" and all its subcategories? This cannot be undone.`
      : `Delete "${cat.label}"? This cannot be undone.`;
    if (confirm(msg)) deleteCategoryMutation.mutate(cat.id);
  };

  const handleAddField = () => {
    if (!newField.category_id || !newField.slug || !newField.label) {
      toast.error("Category, slug, and label are required");
      return;
    }
    let optionsData = newField.options;
    if (["dropdown", "radio", "checkbox"].includes(newField.field_type)) {
      try {
        optionsData = typeof newField.options === "string"
          ? JSON.parse(newField.options)
          : newField.options;
      } catch {
        toast.error("Invalid options format. Use JSON array format.");
        return;
      }
    }
    addFieldMutation.mutate({ ...newField, options: optionsData });
  };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1A1A1A]">Category Management</h2>
        <div className="flex gap-2">

          {/* ── Add Category dialog ── */}
          <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#D80621] hover:bg-[#B00520]">
                <Plus className="w-4 h-4 mr-2" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add New Category</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Parent Category (Optional)</Label>
                  <Select
                    value={newCategory.parent_id || "none"}
                    onValueChange={(v) => setNewCategory(p => ({ ...p, parent_id: v === "none" ? null : v }))}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="None (Top Level)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Top Level)</SelectItem>
                      {parentCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Slug *</Label>
                  <Input value={newCategory.slug} onChange={(e) => setNewCategory(p => ({ ...p, slug: e.target.value }))} placeholder="e.g., used_cars" className="mt-1.5" />
                </div>
                <div>
                  <Label>Label *</Label>
                  <Input value={newCategory.label} onChange={(e) => setNewCategory(p => ({ ...p, label: e.target.value }))} placeholder="e.g., Used Cars" className="mt-1.5" />
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={newCategory.sort_order} onChange={(e) => setNewCategory(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="mt-1.5" />
                </div>
                <div>
                  <Label>Category Icon (Image)</Label>
                  <IconPreviewInput
                    preview={addIconPreview}
                    onChange={(e) => { const f = e.target.files[0]; if (f) { setAddIconFile(f); setAddIconPreview(URL.createObjectURL(f)); } }}
                    onRemove={() => { setAddIconFile(null); setAddIconPreview(null); }}
                  />
                  <p className="text-xs text-gray-400 mt-1">Shown as the category icon instead of the default icon</p>
                </div>
                <Button onClick={handleAddCategory} disabled={addIconUploading || addCategoryMutation.isPending} className="w-full bg-[#D80621] hover:bg-[#B00520]">
                  {addIconUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : "Add Category"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Add Field dialog ── */}
          <Dialog open={isAddFieldOpen} onOpenChange={setIsAddFieldOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Field</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Custom Field</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Category *</Label>
                  <Select value={newField.category_id} onValueChange={(v) => setNewField(p => ({ ...p, category_id: v }))}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {parentCategories.map(parent => {
                        const subs = allCategories.filter(c => c.parent_id === parent.id);
                        return (
                          <React.Fragment key={parent.id}>
                            <SelectItem value={parent.id} className="font-semibold">{parent.label}</SelectItem>
                            {subs.map(sub => (
                              <SelectItem key={sub.id} value={sub.id} className="pl-6 text-gray-600">
                                &nbsp;&nbsp;↳ {sub.label}
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Field Slug *</Label>
                  <Input value={newField.slug} onChange={(e) => setNewField(p => ({ ...p, slug: e.target.value }))} placeholder="e.g., bedrooms" className="mt-1.5" />
                </div>
                <div>
                  <Label>Field Label *</Label>
                  <Input value={newField.label} onChange={(e) => setNewField(p => ({ ...p, label: e.target.value }))} placeholder="e.g., Number of Bedrooms" className="mt-1.5" />
                </div>
                <div>
                  <Label>Field Type</Label>
                  <Select value={newField.field_type} onValueChange={(v) => setNewField(p => ({ ...p, field_type: v }))}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="radio">Radio</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {["dropdown", "radio", "checkbox"].includes(newField.field_type) && (
                  <div>
                    <Label>Options (JSON format)</Label>
                    <Textarea
                      value={typeof newField.options === "string" ? newField.options : JSON.stringify(newField.options, null, 2)}
                      onChange={(e) => setNewField(p => ({ ...p, options: e.target.value }))}
                      placeholder='[{"label":"Option 1","value":"option1"}]'
                      className="mt-1.5 font-mono text-xs"
                      rows={4}
                    />
                  </div>
                )}
                <div>
                  <Label>Placeholder</Label>
                  <Input value={newField.placeholder} onChange={(e) => setNewField(p => ({ ...p, placeholder: e.target.value }))} placeholder="e.g., Enter value" className="mt-1.5" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="required" checked={newField.required} onChange={(e) => setNewField(p => ({ ...p, required: e.target.checked }))} className="w-4 h-4" />
                  <Label htmlFor="required" className="cursor-pointer">Required field</Label>
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={newField.sort_order} onChange={(e) => setNewField(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="mt-1.5" />
                </div>
                <Button onClick={handleAddField} disabled={addFieldMutation.isPending} className="w-full bg-[#D80621] hover:bg-[#B00520]">
                  Add Field
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Edit Category dialog (controlled, not via trigger) ── */}
      <Dialog open={isEditCategoryOpen} onOpenChange={(open) => { if (!open) { setIsEditCategoryOpen(false); setEditingCategory(null); setEditIconFile(null); setEditIconPreview(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          {editingCategory && (
            <div className="space-y-4 pt-4">
              <div>
                <Label>Slug *</Label>
                <Input
                  value={editingCategory.slug}
                  onChange={(e) => setEditingCategory(p => ({ ...p, slug: e.target.value }))}
                  placeholder="e.g., used_cars"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Label *</Label>
                <Input
                  value={editingCategory.label}
                  onChange={(e) => setEditingCategory(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g., Used Cars"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editingCategory.sort_order ?? 0}
                  onChange={(e) => setEditingCategory(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Category Icon (Image)</Label>
                <IconPreviewInput
                  preview={editIconPreview}
                  onChange={(e) => { const f = e.target.files[0]; if (f) { setEditIconFile(f); setEditIconPreview(URL.createObjectURL(f)); } }}
                  onRemove={() => { setEditIconFile(null); setEditIconPreview(null); setEditingCategory(p => ({ ...p, icon_url: null })); }}
                />
                <p className="text-xs text-gray-400 mt-1">Shown as the category icon instead of the default icon</p>
              </div>
              <Button
                onClick={handleEditCategory}
                disabled={editIconUploading || editCategoryMutation.isPending}
                className="w-full bg-[#D80621] hover:bg-[#B00520]"
              >
                {(editIconUploading || editCategoryMutation.isPending)
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Tabs ── */}
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="fields">Custom Fields</TabsTrigger>
        </TabsList>

        {/* ── Categories tab ── */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parent Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {parentCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {cat.icon_url ? (
                        <img src={cat.icon_url} alt={cat.label} className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                          <ImagePlus className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{cat.label}</p>
                        <p className="text-xs text-gray-500">{cat.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{allCategories.filter(c => c.parent_id === cat.id).length} subcategories</Badge>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(cat)}>
                        <Pencil className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deleteCategoryMutation.isPending}
                        onClick={() => handleDeleteCategory(cat)}
                      >
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Subcategories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {parentCategories.map(parent => {
                  const subs = allCategories.filter(c => c.parent_id === parent.id);
                  if (subs.length === 0) return null;
                  return (
                    <div key={parent.id} className="border-l-2 border-gray-200 pl-4">
                      <p className="text-sm font-semibold text-gray-600 mb-2">{parent.label}</p>
                      <div className="space-y-1">
                        {subs.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between text-sm p-2 hover:bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">→</span>
                              <span>{sub.label}</span>
                              <span className="text-xs text-gray-400">({sub.slug})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(sub)}>
                                <Pencil className="w-3.5 h-3.5 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deleteCategoryMutation.isPending}
                                onClick={() => handleDeleteCategory(sub)}
                              >
                                <Trash className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Fields tab ── */}
        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Select Category</Label>
                <Select value={selectedCategory || ""} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentCategories.map(parent => {
                      const subs = allCategories.filter(c => c.parent_id === parent.id);
                      return (
                        <React.Fragment key={parent.id}>
                          <SelectItem value={parent.id} className="font-semibold">{parent.label}</SelectItem>
                          {subs.map(sub => (
                            <SelectItem key={sub.id} value={sub.id} className="pl-6 text-gray-600">
                              &nbsp;&nbsp;↳ {sub.label}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && (
                <div className="space-y-2">
                  {categoryFields.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No fields defined for this category</p>
                  ) : (
                    categoryFields.map(field => (
                      <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{field.label}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{field.slug}</span>
                            <Badge variant="outline" className="text-xs">{field.field_type}</Badge>
                            {field.required && <Badge className="text-xs bg-red-100 text-red-700">Required</Badge>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteFieldMutation.isPending}
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this field?")) {
                              deleteFieldMutation.mutate(field.id);
                            }
                          }}
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
