import GalleryPage from "@/components/GalleryPage";
import { getImages, extractFilters } from "@/lib/getImages";

// Helper to format slug into a title
function formatSlugToTitle(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate metadata for each album page
export async function generateMetadata({ params }) {
  const albumTitle = formatSlugToTitle(params.slug);
  
  return {
    title: `${albumTitle} - matthall.gallery`,
    description: `Photo album: ${albumTitle}`,
  };
}

export default async function AlbumPage({ params }) {
  const initialImages = await getImages(params.slug);
  const filters = extractFilters(initialImages);
  
  return <GalleryPage slug={params.slug} initialImages={initialImages} filters={filters} />;
}
