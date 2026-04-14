import GalleryPage from "@/components/GalleryPage";
import { getImages, extractFilters } from "@/lib/getImages";

export default async function Home() {
  const initialImages = await getImages();
  const filters = extractFilters(initialImages);
  
  return <GalleryPage initialImages={initialImages} filters={filters} />;
}
