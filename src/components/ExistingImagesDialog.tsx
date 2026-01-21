import { useState, useEffect } from "react";
import { Check, Image as ImageIcon, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExistingImage {
  url: string;
  name: string;
}

interface ExistingImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageUrl: string) => void;
  multiSelect?: boolean;
  onMultiSelect?: (imageUrls: string[]) => void;
  productImages?: { url: string; name?: string }[];
}

const ExistingImagesDialog = ({
  open,
  onOpenChange,
  onSelect,
  multiSelect = false,
  onMultiSelect,
  productImages,
}: ExistingImagesDialogProps) => {
  const [images, setImages] = useState<ExistingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (productImages && productImages.length > 0) {
        // Use provided product images instead of fetching
        setImages(productImages.map((img, idx) => ({
          url: img.url,
          name: img.name || `Image ${idx + 1}`,
        })));
        setLoading(false);
      } else {
        fetchImages();
      }
      setSelectedImages([]);
    }
  }, [open, productImages]);

  const fetchImages = async () => {
    setLoading(true);
    
    // Fetch from storage bucket
    const { data: storageFiles } = await supabase.storage
      .from("product-images")
      .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });

    const storageImages: ExistingImage[] = (storageFiles || [])
      .filter(file => file.name && !file.name.startsWith('.'))
      .map(file => {
        const { data } = supabase.storage.from("product-images").getPublicUrl(file.name);
        return {
          url: data.publicUrl,
          name: file.name,
        };
      });

    setImages(storageImages);
    setLoading(false);
  };

  const filteredImages = images.filter(img =>
    img.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleImageClick = (url: string) => {
    if (multiSelect) {
      setSelectedImages(prev =>
        prev.includes(url)
          ? prev.filter(u => u !== url)
          : [...prev, url]
      );
    } else {
      onSelect(url);
      onOpenChange(false);
    }
  };

  const handleConfirmMultiSelect = () => {
    if (onMultiSelect && selectedImages.length > 0) {
      onMultiSelect(selectedImages);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            {productImages ? "Select from Product Gallery" : "Select from Gallery"}
          </DialogTitle>
        </DialogHeader>

        {images.length > 6 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {search ? "No matching images found" : "No images in gallery yet"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredImages.map((img) => (
                <button
                  key={img.url}
                  onClick={() => handleImageClick(img.url)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-80 ${
                    selectedImages.includes(img.url)
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-muted"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedImages.includes(img.url) && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {multiSelect && selectedImages.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedImages.length} image(s) selected
            </span>
            <Button onClick={handleConfirmMultiSelect}>
              Add Selected
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExistingImagesDialog;
