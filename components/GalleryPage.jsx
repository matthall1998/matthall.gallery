"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";
import { filterImages, initialImageOrder, shuffleImages, sortImages, toGalleryImage } from "@/lib/galleryImages.mjs";

// Masonry and lazy loading depend on browser APIs, so render the grid client-only.
const Gallery = dynamic(() => import("@/components/Gallery"), { ssr: false });

export default function GalleryPage({ initialImages = [], filters = { tags: [], people: [], cameras: [], lenses: [] }, album = null }) {
  const [rows, setRows] = useState(() => initialImageOrder(initialImages, album?.load_random));
  const images = useMemo(() => rows.map(toGalleryImage), [rows]);

  const handleSort = (option) => {
    setRows(current => option === "shuffle"
      ? shuffleImages(current)
      : sortImages(initialImages, option === "by-date" ? "shot_date" : "export_date"));
  };

  return (
    <div className="page-container">
      <Header filters={filters} onTagClick={handleSort}
        onFilterClick={value => setRows(filterImages(initialImages, value))} />
      <main className="content-wrap">
        {album && <h1 className="sr-only">{album.name}</h1>}
        {images.length > 0 ? <Gallery images={images} /> : (
          <p className="p-6 text-center text-gray-400">
            {album ? "This album has no photos yet." : "No photos to display yet."}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
