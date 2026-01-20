import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // List all files in product-images bucket
    const { data: files, error: listError } = await supabase.storage
      .from("product-images")
      .list("", { limit: 500 });

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ message: "No images found to compress", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { name: string; status: string; originalSize?: number; newSize?: number }[] = [];
    let processedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      // Skip non-image files and folders
      if (!file.name || file.id === null) {
        continue;
      }

      const isImage = /\.(jpg|jpeg|png|webp)$/i.test(file.name);
      if (!isImage) {
        skippedCount++;
        results.push({ name: file.name, status: "skipped - not an image" });
        continue;
      }

      // Skip already small files (under 100KB)
      if (file.metadata?.size && file.metadata.size < 100 * 1024) {
        skippedCount++;
        results.push({ 
          name: file.name, 
          status: "skipped - already optimized",
          originalSize: file.metadata.size 
        });
        continue;
      }

      try {
        // Download the image
        const { data: imageData, error: downloadError } = await supabase.storage
          .from("product-images")
          .download(file.name);

        if (downloadError || !imageData) {
          results.push({ name: file.name, status: `download failed: ${downloadError?.message}` });
          continue;
        }

        const originalSize = imageData.size;

        // Skip if already small
        if (originalSize < 100 * 1024) {
          skippedCount++;
          results.push({ 
            name: file.name, 
            status: "skipped - already small",
            originalSize 
          });
          continue;
        }

        // For now, just report the files that would benefit from compression
        // Note: Full image compression in Deno requires additional libraries
        // This function identifies large images for manual re-upload with compression
        
        results.push({
          name: file.name,
          status: originalSize > 500 * 1024 ? "needs compression" : "acceptable size",
          originalSize,
        });

        if (originalSize > 500 * 1024) {
          processedCount++;
        }

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({ name: file.name, status: `error: ${errorMessage}` });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Analyzed ${files.length} files. ${processedCount} large images found (>500KB) that would benefit from re-uploading.`,
        totalFiles: files.length,
        largeImages: processedCount,
        skipped: skippedCount,
        results: results.slice(0, 50), // Limit results in response
        tip: "Large images will be automatically compressed on next upload via the admin panel."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});