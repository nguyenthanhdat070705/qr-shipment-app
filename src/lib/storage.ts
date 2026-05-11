import { getSupabaseAdmin } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * Downloads a file from a given URL and uploads it to Supabase Storage.
 * 
 * @param fileUrl The URL of the file to download (e.g., from Getfly or Drive)
 * @param bucketName The Supabase storage bucket (e.g., 'membership_documents')
 * @param prefix Optional folder prefix (e.g., contract ID)
 * @returns The public URL of the uploaded file, or null if failed.
 */
export async function downloadAndUploadToSupabase(
  fileUrl: string,
  bucketName: string,
  prefix: string = 'general'
): Promise<string | null> {
  if (!fileUrl) return null;

  try {
    // 1. Download file to buffer
    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error(`[Storage] Failed to download file from ${fileUrl}: ${response.statusText}`);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Create a unique filename based on hash to avoid duplicates and strange characters
    const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');
    
    // Try to guess extension
    let ext = '';
    if (contentType.includes('image/jpeg')) ext = '.jpg';
    else if (contentType.includes('image/png')) ext = '.png';
    else if (contentType.includes('application/pdf')) ext = '.pdf';
    else {
      // Fallback: try to get extension from URL
      const urlParts = fileUrl.split('?')[0].split('.');
      if (urlParts.length > 1) {
        ext = '.' + urlParts[urlParts.length - 1];
      }
    }
    
    const fileName = `${prefix}/${hash}${ext}`;
    const supabase = getSupabaseAdmin();

    // 2. Check if file already exists (optional optimization, we can just upsert)
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[Storage] Supabase upload error:`, uploadError);
      return null;
    }

    // 3. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;

  } catch (error) {
    console.error(`[Storage] Exception handling file ${fileUrl}:`, error);
    return null;
  }
}
