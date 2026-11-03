import GalleryPage from "@/components/GalleryPage";
import { getGallery, extractFilters } from "@/lib/getImages";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const gallery = await getGallery();
  const filters = extractFilters(gallery.images);
  
  return <GalleryPage key={gallery.generatedAt} initialImages={gallery.images} filters={filters} />;
}
