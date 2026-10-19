"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";

// Gallery uses react-responsive-masonry and LazyLoadImage which both depend on
// browser APIs (window.innerWidth, IntersectionObserver). SSR produces different
// HTML than the client, causing hydration errors. Render client-only.
const Gallery = dynamic(() => import("@/components/Gallery"), { ssr: false });

function processImages(rows, selectedTag = null, shuffleKey = 0) {
  let filteredData;
  if (selectedTag === "latest") {
    filteredData = [...rows].sort(
      (a, b) => new Date(b.export_date) - new Date(a.export_date)
    );
  } else if (selectedTag === "by-date") {
    filteredData = [...rows].sort(
      (a, b) => new Date(b.shot_date) - new Date(a.shot_date)
    );
  } else if (selectedTag) {
    const sorted = [...rows].sort(
      (a, b) => new Date(b.export_date) - new Date(a.export_date)
    );
    filteredData = sorted.filter((item) => {
      const tags = (item.tags || "").split(",").map(t => t.trim());
      if (tags.includes(selectedTag)) return true;
      
      const people = (item.people || "").split(",").map(p => p.trim());
      if (people.includes(selectedTag)) return true;
      
      const cameraMake = (item.camera_make || "").trim();
      const camera = (item.camera || "").trim();
      const fullCamera = cameraMake && camera ? `${cameraMake} ${camera}` : camera;
      if (fullCamera === selectedTag) return true;
      
      const lensMake = (item.lens_make || "").trim();
      const lens = (item.lens || "").trim();
      const fullLens = lensMake && lens ? `${lensMake} ${lens}` : lens;
      if (fullLens === selectedTag) return true;
      
      return false;
    });
  } else {
    filteredData = [...rows].sort(
      (a, b) => new Date(b.export_date) - new Date(a.export_date)
    );
  }

  // Apply shuffle on top of whatever filter is active
  if (shuffleKey > 0) {
    for (let i = filteredData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filteredData[i], filteredData[j]] = [filteredData[j], filteredData[i]];
    }
  }

  return filteredData.map((item) => ({
    src: item.src,
    srcThumbnail: item.srcOptimized || item.src,
    width: item.image_width,
    height: item.image_height,
    title: item.caption || "",
    camera: item.camera_make && item.camera ? `${item.camera_make} ${item.camera}` : item.camera || "",
    lens: item.lens_make && item.lens ? `${item.lens_make} ${item.lens}` : item.lens || "",
    iso: item.iso || "",
    shutter: item.shutter || "",
    aperture: item.aperture || "",
    description: [
      item.camera_make && item.camera ? `${item.camera_make} ${item.camera}` : item.camera,
      item.lens_make && item.lens ? `${item.lens_make} ${item.lens}` : item.lens
    ].filter(Boolean).join(" • ") || "",
  }));
}

export default function GalleryPage({ initialImages = [], filters = { tags: [], people: [], cameras: [], lenses: [] } }) {
  const [selectedTag, setSelectedTag] = useState(null);
  const [shuffleKey, setShuffleKey] = useState(0);
  const images = useMemo(
    () => processImages(initialImages, selectedTag, shuffleKey),
    [initialImages, selectedTag, shuffleKey]
  );

  const handleTagClick = (tag) => {
    if (tag === "shuffle") {
      // Shuffle the current view without changing the active filter
      setShuffleKey((prev) => prev + 1);
    } else {
      setSelectedTag(tag);
      setShuffleKey(0); // Reset shuffle when selecting a sort option
    }
  };

  return (
    <div className="page-container">
      <Header filters={filters} onTagClick={handleTagClick} />
      <main className="content-wrap">
        <Gallery images={images} />
      </main>
      <Footer />
    </div>
  );
}
