import GalleryPage from "@/components/GalleryPage";
import { getGallery, extractFilters } from "@/lib/getImages";
import { cache } from "react";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

// Share one catalog snapshot between metadata and content within a request.
const readAlbum = cache(async (slug) => {
  const gallery = await getGallery(slug);
  if (!gallery) notFound();
  return gallery;
});

// Generate metadata for each album page
export async function generateMetadata({ params }) {
  const { album } = await readAlbum(params.slug);
  
  return {
    title: `${album.name} - matthall.gallery`,
    description: `Photo album: ${album.name}`,
  };
}

export default async function AlbumPage({ params }) {
  const gallery = await readAlbum(params.slug);
  const filters = extractFilters(gallery.images);
  
  return <GalleryPage key={`${params.slug}:${gallery.generatedAt}`}
    initialImages={gallery.images} filters={filters} album={gallery.album} />;
}
