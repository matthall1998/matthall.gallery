"use client";

import { useParams } from "next/navigation";
import GalleryPage from "@/components/GalleryPage";

export default function AlbumPage() {
  const params = useParams();
  return <GalleryPage slug={params.slug} />;
}
