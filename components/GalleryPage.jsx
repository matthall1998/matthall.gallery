"use client";

import { useState, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";
import { extractFilters, initialImageOrder, toGalleryImage } from "@/lib/galleryImages.mjs";
import { galleryViewImages, readGalleryView, updateGalleryQuery } from "@/lib/galleryView.mjs";

// Masonry and lazy loading depend on browser APIs, so render the grid client-only.
const Gallery = dynamic(() => import("@/components/Gallery"), { ssr: false });

export default function GalleryPage({ initialImages = [], filters = { tags: [], people: [], cameras: [], lenses: [] }, album = null }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const [defaultOrder] = useState(() => initialImageOrder(initialImages, album?.load_random));
  const view = useMemo(() => readGalleryView(params), [params]);
  const rows = useMemo(() =>
    galleryViewImages(initialImages, defaultOrder, view),
  [initialImages, defaultOrder, view]);
  const images = useMemo(() => rows.map(toGalleryImage), [rows]);
  const availableFilters = useMemo(() =>
    view.filter || view.gear ? extractFilters(rows) : filters,
  [rows, view.filter, view.gear, filters]);

  const updateView = (changes) => {
    const query = updateGalleryQuery(new URLSearchParams(window.location.search), changes);
    window.history.pushState(null, "", `${pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  };
  const trackInteraction = (event, data) => {
    window.umami?.track(event, {
      album: pathname === "/" ? "home" : pathname.slice(1),
      ...data,
    });
  };
  const handleSort = (option) => {
    updateView({ sort: option, seed: option === "shuffle" ? crypto.randomUUID() : null });
    trackInteraction("gallery-sort", { sort: option });
  };
  const handleFilter = (category, value) => {
    const removing = view[category] === value;
    updateView({ [category]: removing ? null : value });
    trackInteraction(`gallery-${category}`, { value, action: removing ? "remove" : "apply" });
  };
  const handleClearFilters = () => {
    updateView({ filter: null, gear: null });
    trackInteraction("gallery-clear-filters", { filter: view.filter, gear: view.gear });
  };

  return (
    <div className="page-container">
      <Header filters={availableFilters} onTagClick={handleSort}
        onFilterClick={value => handleFilter("filter", value)}
        onGearClick={value => handleFilter("gear", value)} />
      <main className="content-wrap">
        {album && <h1 className="sr-only">{album.name}</h1>}
        {(view.filter || view.gear) && (
          <div className="flex flex-wrap items-center justify-center gap-3 p-4 text-sm text-gray-300">
            {view.filter && <span>Filter: {view.filter}</span>}
            {view.gear && <span>Gear: {view.gear}</span>}
            <button className="underline" onClick={handleClearFilters}>
              Clear filters
            </button>
          </div>
        )}
        {images.length > 0 ? <Gallery images={images} /> : (
          <p className="p-6 text-center text-gray-400">
            {view.filter || view.gear ? "No photos match these filters."
              : album ? "This album has no photos yet." : "No photos to display yet."}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
