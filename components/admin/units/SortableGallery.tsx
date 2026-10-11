"use client";

import * as React from "react";
import {
  setFeaturedPhoto,
  deleteUnitPhoto,
  reorderUnitPhotos,
  updateUnitPhotoMetadata,
} from "@/actions/media";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Star,
  Trash2,
  Edit2,
  MoveLeft,
  MoveRight,
  GripVertical,
  Loader2,
  Sparkles,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface GalleryPhoto {
  id: string;
  url: string;
  caption?: string | null;
  altText?: string | null;
  description?: string | null;
  orderIndex: number;
  isFeatured: boolean;
}

export interface SortableGalleryProps {
  unitId: string;
  photos: GalleryPhoto[];
  onPhotosChange: () => void;
  className?: string;
}

export function SortableGallery({
  unitId,
  photos: initialPhotos,
  onPhotosChange,
  className,
}: SortableGalleryProps) {
  const [photos, setPhotos] = React.useState<GalleryPhoto[]>(initialPhotos);
  const [draggedPhotoId, setDraggedPhotoId] = React.useState<string | null>(null);

  // Delete modal state
  const [photoToDelete, setPhotoToDelete] = React.useState<GalleryPhoto | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Metadata edit modal state
  const [photoToEdit, setPhotoToEdit] = React.useState<GalleryPhoto | null>(null);
  const [editCaption, setEditCaption] = React.useState("");
  const [editAltText, setEditAltText] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [isSavingMetadata, setIsSavingMetadata] = React.useState(false);

  // Pending action indicators
  const [settingFeaturedId, setSettingFeaturedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  // Set Featured Photo Handler
  const handleSetFeatured = async (photoId: string) => {
    if (settingFeaturedId) return;

    setSettingFeaturedId(photoId);

    // Optimistically update
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isFeatured: p.id === photoId,
      }))
    );

    try {
      const res = await setFeaturedPhoto({ photoId, unitId });
      if (!res.success) {
        toast.error(res.error || "Failed to set featured cover photo");
        setPhotos(initialPhotos);
      } else {
        toast.success("Featured cover photo updated.");
        onPhotosChange();
      }
    } catch (err: any) {
      toast.error(err?.message || "Internal error updating featured photo");
      setPhotos(initialPhotos);
    } finally {
      setSettingFeaturedId(null);
    }
  };

  // Delete Photo Handler
  const handleConfirmDelete = async () => {
    if (!photoToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      const res = await deleteUnitPhoto({
        photoId: photoToDelete.id,
        unitId,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to delete photo");
      } else {
        const promoted = (res.data as any)?.promotedPhoto;
        if (promoted) {
          toast.success(
            "Photo deleted. The next remaining photo was promoted to Featured Cover."
          );
        } else {
          toast.success("Photo deleted successfully.");
        }
        setPhotoToDelete(null);
        onPhotosChange();
      }
    } catch (err: any) {
      toast.error(err?.message || "Internal error deleting photo");
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Metadata Handler
  const handleOpenEdit = (photo: GalleryPhoto) => {
    setPhotoToEdit(photo);
    setEditCaption(photo.caption || "");
    setEditAltText(photo.altText || "");
    setEditDescription(photo.description || "");
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoToEdit || isSavingMetadata) return;

    setIsSavingMetadata(true);

    try {
      const res = await updateUnitPhotoMetadata({
        photoId: photoToEdit.id,
        unitId,
        caption: editCaption.trim() || undefined,
        altText: editAltText.trim() || undefined,
        description: editDescription.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update photo metadata");
      } else {
        toast.success("Photo details updated.");
        setPhotoToEdit(null);
        onPhotosChange();
      }
    } catch (err: any) {
      toast.error(err?.message || "Internal error saving photo metadata");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // Reorder helper: persist order to database
  const persistReorder = async (newOrderedList: GalleryPhoto[]) => {
    setPhotos(newOrderedList);
    const photoIds = newOrderedList.map((p) => p.id);

    try {
      const res = await reorderUnitPhotos({ unitId, photoIds });
      if (!res.success) {
        toast.error(res.error || "Failed to reorder photos");
        setPhotos(initialPhotos);
      } else {
        toast.info("Gallery order updated.");
        onPhotosChange();
      }
    } catch (err: any) {
      toast.error(err?.message || "Internal error reordering photos");
      setPhotos(initialPhotos);
    }
  };

  // Mobile / Keyboard Shift Position
  const handleMove = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const list = [...photos];
    const item = list.splice(index, 1)[0];
    list.splice(targetIndex, 0, item);

    persistReorder(list);
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPhotoId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnTarget = (targetId: string) => {
    if (!draggedPhotoId || draggedPhotoId === targetId) {
      setDraggedPhotoId(null);
      return;
    }

    const currentIndex = photos.findIndex((p) => p.id === draggedPhotoId);
    const targetIndex = photos.findIndex((p) => p.id === targetId);

    if (currentIndex === -1 || targetIndex === -1) {
      setDraggedPhotoId(null);
      return;
    }

    const list = [...photos];
    const draggedItem = list.splice(currentIndex, 1)[0];
    list.splice(targetIndex, 0, draggedItem);

    setDraggedPhotoId(null);
    persistReorder(list);
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed text-center bg-muted/10">
        <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-semibold text-foreground">No photos uploaded yet</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload photos above to create the gallery and select a featured cover.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing <strong className="text-foreground font-mono">{photos.length}</strong> photo(s)
        </span>
        <span className="text-[11px]">Drag tiles or use arrow controls to reorder</span>
      </div>

      {/* Grid of Draggable Photo Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => {
          const isFeatured = photo.isFeatured;
          const isSettingThis = settingFeaturedId === photo.id;
          const isDragging = draggedPhotoId === photo.id;

          return (
            <div
              key={photo.id}
              draggable
              onDragStart={(e) => handleDragStart(e, photo.id)}
              onDragEnd={() => setDraggedPhotoId(null)}
              onDragOver={handleDragOver}
              onDrop={() => handleDropOnTarget(photo.id)}
              className={cn(
                "group relative flex flex-col rounded-xl border bg-card overflow-hidden shadow-xs transition-all duration-200 ease-[var(--ease-snappy)]",
                isFeatured
                  ? "border-amber-500/50 ring-1 ring-amber-500/30"
                  : "border-border hover:border-primary/40",
                isDragging && "opacity-40 scale-95 border-primary border-dashed"
              )}
            >
              {/* Photo Thumbnail Container */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                <img
                  src={photo.url}
                  alt={photo.altText || photo.caption || "Unit Photo"}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-102"
                  loading="lazy"
                />

                {/* Top Badges */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                  {/* Order Chip */}
                  <Badge
                    variant="outline"
                    className="bg-black/60 text-white border-white/20 text-[10px] font-mono px-2 py-0.5 backdrop-blur-md"
                  >
                    #{index + 1}
                  </Badge>

                  {/* Featured Badge */}
                  {isFeatured && (
                    <Badge
                      variant="outline"
                      className="bg-amber-500 text-amber-950 font-bold border-amber-600/40 text-[10px] px-2 py-0.5 shadow-xs flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3 fill-amber-950" />
                      Featured Cover
                    </Badge>
                  )}
                </div>

                {/* Drag Handle Indicator */}
                <div
                  className="absolute bottom-2 left-2 rounded-md bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing backdrop-blur-md"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Photo Meta & Actions Bar */}
              <div className="p-3 flex flex-col gap-2 flex-1 justify-between bg-card">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-foreground truncate" title={photo.caption || "Untitled"}>
                    {photo.caption || "Untitled Photo"}
                  </div>
                  {photo.altText && (
                    <div className="text-[11px] text-muted-foreground truncate" title={photo.altText}>
                      Alt: {photo.altText}
                    </div>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="pt-2 border-t flex items-center justify-between gap-1">
                  {/* Left / Right Move Buttons for Mobile Ergonomics */}
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === 0}
                      onClick={() => handleMove(index, "left")}
                      title="Move photo left"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <MoveLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={index === photos.length - 1}
                      onClick={() => handleMove(index, "right")}
                      title="Move photo right"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <MoveRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Actions: Set Featured, Edit Metadata, Delete */}
                  <div className="flex items-center gap-1">
                    {!isFeatured && (
                      <Button
                        type="button"
                        variant="outline"
                        size="compact"
                        disabled={isSettingThis}
                        onClick={() => handleSetFeatured(photo.id)}
                        title="Set as featured cover photo"
                        className="h-7 text-[11px] px-2 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                      >
                        {isSettingThis ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Star className="h-3 w-3 mr-1 text-amber-500" />
                        )}
                        Feature
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleOpenEdit(photo)}
                      title="Edit photo metadata"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setPhotoToDelete(photo)}
                      title="Delete photo"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!photoToDelete} onOpenChange={(open) => !isDeleting && !open && setPhotoToDelete(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="gap-2">
            <div className="flex items-center gap-3 text-destructive">
              <div className="rounded-full bg-destructive/10 p-2.5 ring-1 ring-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Delete Unit Photo
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Permanently remove this photo from the resort unit
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {photoToDelete && (
            <div className="space-y-3 py-2 text-sm">
              <div className="relative aspect-16/9 w-full rounded-lg overflow-hidden border bg-muted">
                <img
                  src={photoToDelete.url}
                  alt={photoToDelete.caption || "Target Photo"}
                  className="h-full w-full object-cover"
                />
              </div>

              {photoToDelete.isFeatured && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Featured Cover Photo Invariant
                  </div>
                  <div>
                    This is currently the <strong>Featured Cover Photo</strong>. If deleted, the remaining photo with the lowest order index will be <strong>automatically promoted</strong> to the featured cover photo.
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Are you sure you want to delete this photo? This action cannot be undone.
              </p>
            </div>
          )}

          <DialogFooter className="sm:justify-end gap-2 pt-2 border-t -mx-6 -mb-6 p-4 bg-muted/30 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setPhotoToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Photo Metadata Dialog */}
      <Dialog open={!!photoToEdit} onOpenChange={(open) => !isSavingMetadata && !open && setPhotoToEdit(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-base font-semibold text-foreground">
              Edit Photo Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update caption, accessibility alt text, and SEO description
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMetadata} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="photo-caption" className="text-xs font-semibold">
                Photo Caption
              </Label>
              <Input
                id="photo-caption"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="e.g., King Bed & Panoramic Forest View"
                disabled={isSavingMetadata}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="photo-alt" className="text-xs font-semibold">
                Accessibility Alt Text
              </Label>
              <Input
                id="photo-alt"
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                placeholder="e.g., Interior view of Geodesic Dome showing king bed"
                disabled={isSavingMetadata}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="photo-desc" className="text-xs font-semibold">
                Extended Description (Optional)
              </Label>
              <Textarea
                id="photo-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Additional operational details or highlights..."
                disabled={isSavingMetadata}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="sm:justify-end gap-2 pt-2 border-t -mx-6 -mb-6 p-4 bg-muted/30 rounded-b-xl">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingMetadata}
                onClick={() => setPhotoToEdit(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={isSavingMetadata}
              >
                {isSavingMetadata ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Details"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
