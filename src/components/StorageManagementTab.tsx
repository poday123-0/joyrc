import { useState, useEffect } from "react";
import { Trash2, Image, Video, Check, RefreshCw, HardDrive, AlertTriangle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "./ConfirmDialog";

interface StorageFile {
  id: string;
  name: string;
  bucket: string;
  url: string;
  size: number;
  created_at: string;
}

const StorageManagementTab = () => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeBucket, setActiveBucket] = useState<"all" | "product-images" | "videos">("all");

  const buckets = [
    { id: "all", label: "All Files", icon: HardDrive },
    { id: "product-images", label: "Images", icon: Image },
    { id: "videos", label: "Videos", icon: Video },
  ];

  useEffect(() => {
    fetchAllFiles();
  }, []);

  const fetchFilesFromFolder = async (
    bucket: string,
    folderPath: string = ""
  ): Promise<StorageFile[]> => {
    const files: StorageFile[] = [];
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath, { limit: 500, sortBy: { column: "created_at", order: "desc" } });

    if (error || !data) {
      console.error(`Error fetching from ${bucket}/${folderPath}:`, error);
      return files;
    }

    for (const item of data) {
      if (!item.name) continue;
      
      const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
      
      // Check if it's a folder (no id means it's a folder)
      if (item.id === null) {
        // Recursively fetch files from subfolder
        const subFiles = await fetchFilesFromFolder(bucket, fullPath);
        files.push(...subFiles);
      } else {
        // It's a file
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fullPath);
        
        files.push({
          id: `${bucket}/${fullPath}`,
          name: item.name,
          bucket: bucket,
          url: urlData.publicUrl,
          size: item.metadata?.size || 0,
          created_at: item.created_at || "",
        });
      }
    }

    return files;
  };

  const fetchAllFiles = async () => {
    setLoading(true);
    
    // Fetch from both buckets in parallel
    const [imageFiles, videoFiles] = await Promise.all([
      fetchFilesFromFolder("product-images"),
      fetchFilesFromFolder("videos"),
    ]);

    setFiles([...imageFiles, ...videoFiles]);
    setLoading(false);
  };

  const filteredFiles = activeBucket === "all" 
    ? files 
    : files.filter(f => f.bucket === activeBucket);

  const toggleSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleDownloadSelected = async () => {
    if (selectedFiles.size === 0) return;
    
    const filesToDownload = Array.from(selectedFiles);
    
    for (const fileId of filesToDownload) {
      const file = files.find(f => f.id === fileId);
      if (!file) continue;

      try {
        const response = await fetch(file.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading file:", file.name, error);
      }
    }

    toast({
      title: "Download Started",
      description: `Downloading ${filesToDownload.length} file(s)...`,
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    
    setDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    // Group files by bucket
    const imageFiles: string[] = [];
    const videoFiles: string[] = [];

    selectedFiles.forEach(fileId => {
      const [bucket, ...nameParts] = fileId.split("/");
      const fileName = nameParts.join("/");
      if (bucket === "product-images") {
        imageFiles.push(fileName);
      } else if (bucket === "videos") {
        videoFiles.push(fileName);
      }
    });

    // Delete from product-images bucket
    if (imageFiles.length > 0) {
      const { error } = await supabase.storage
        .from("product-images")
        .remove(imageFiles);
      
      if (error) {
        console.error("Error deleting images:", error);
        errorCount += imageFiles.length;
      } else {
        successCount += imageFiles.length;
      }
    }

    // Delete from videos bucket
    if (videoFiles.length > 0) {
      const { error } = await supabase.storage
        .from("videos")
        .remove(videoFiles);
      
      if (error) {
        console.error("Error deleting videos:", error);
        errorCount += videoFiles.length;
      } else {
        successCount += videoFiles.length;
      }
    }

    setDeleting(false);
    setDeleteDialogOpen(false);
    setSelectedFiles(new Set());

    if (successCount > 0) {
      toast({
        title: "Files Deleted",
        description: `Successfully deleted ${successCount} file(s) from storage.`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: "Some Deletions Failed",
        description: `${errorCount} file(s) could not be deleted.`,
        variant: "destructive",
      });
    }

    fetchAllFiles();
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const selectedSize = Array.from(selectedFiles).reduce((sum, id) => {
    const file = files.find(f => f.id === id);
    return sum + (file?.size || 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Storage Management</h3>
            <p className="text-xs text-muted-foreground">
              {files.length} files • {formatFileSize(totalSize)} total
            </p>
          </div>
          <button
            onClick={fetchAllFiles}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-600">Warning</p>
            <p className="text-xs text-muted-foreground">
              Deleting files is permanent and cannot be undone. Make sure products don't reference these files before deleting.
            </p>
          </div>
        </div>
      </div>

      {/* Bucket filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {buckets.map((bucket) => (
          <button
            key={bucket.id}
            onClick={() => setActiveBucket(bucket.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium ${
              activeBucket === bucket.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <bucket.icon className="w-4 h-4" />
            <span>{bucket.label}</span>
            <span className="text-xs opacity-70">
              ({bucket.id === "all" ? files.length : files.filter(f => f.bucket === bucket.id).length})
            </span>
          </button>
        ))}
      </div>

      {/* Selection controls */}
      {filteredFiles.length > 0 && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedFiles.size === filteredFiles.length
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {selectedFiles.size === filteredFiles.length ? "Deselect All" : "Select All"}
            </button>
            {selectedFiles.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedFiles.size} selected • {formatFileSize(selectedSize)}
              </span>
            )}
          </div>

          {selectedFiles.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSelected}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download ({selectedFiles.size})
              </button>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedFiles.size})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Files grid */}
      {filteredFiles.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => toggleSelect(file.id)}
              className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                selectedFiles.has(file.id)
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-border"
              }`}
            >
              {file.bucket === "videos" ? (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Video className="w-8 h-8 text-muted-foreground" />
                </div>
              ) : (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Selection overlay */}
              <div
                className={`absolute inset-0 transition-colors ${
                  selectedFiles.has(file.id)
                    ? "bg-primary/20"
                    : "bg-transparent hover:bg-black/10"
                }`}
              />

              {/* Checkbox */}
              <div
                className={`absolute top-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  selectedFiles.has(file.id)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background/80 border-border"
                }`}
              >
                {selectedFiles.has(file.id) && <Check className="w-3 h-3" />}
              </div>

              {/* File info */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-foreground/60 to-transparent">
                <p className="text-[10px] text-background truncate">{file.name}</p>
                <p className="text-[9px] text-background/70">{formatFileSize(file.size)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No files found</p>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Delete ${selectedFiles.size} File(s)?`}
        description={`This will permanently delete ${selectedFiles.size} file(s) (${formatFileSize(selectedSize)}) from cloud storage. This action cannot be undone.`}
        confirmText={deleting ? "Deleting..." : "Delete Files"}
        variant="destructive"
        onConfirm={handleDeleteSelected}
      />
    </div>
  );
};

export default StorageManagementTab;
