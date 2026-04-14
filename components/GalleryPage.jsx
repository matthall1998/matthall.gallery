"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import dynamic from "next/dynamic";
import Spinner from "@/components/Spinner";

// Gallery uses react-responsive-masonry and LazyLoadImage which both depend on
// browser APIs (window.innerWidth, IntersectionObserver). SSR produces different
// HTML than the client, causing hydration errors. Render client-only.
const Gallery = dynamic(() => import("@/components/Gallery"), { ssr: false });

// Pure function to process images - outside component to avoid hydration issues
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
    filteredData = [...filteredData].sort(() => Math.random() - 0.5);
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

export default function GalleryPage({ slug = null, initialImages = [], filters = { tags: [], people: [], cameras: [], lenses: [] } }) {
  const [images, setImages] = useState(() => processImages(initialImages));
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [shuffleKey, setShuffleKey] = useState(0);

  // Fetch fresh data when filters change
  useEffect(() => {
    if (selectedTag || shuffleKey > 0) {
      const loadImages = async () => {
        setLoading(true);
        try {
          const url = slug ? `/api/images?slug=${slug}` : '/api/images';
          const response = await fetch(url);
          const data = await response.json();
          setImages(processImages(data.results, selectedTag, shuffleKey));
        } catch (error) {
          console.error("Error loading images:", error);
        } finally {
          setLoading(false);
        }
      };
      loadImages();
    }
  }, [selectedTag, shuffleKey, slug]);

  const handleTagClick = (tag) => {
    if (tag === "shuffle") {
      // Shuffle the current view without changing the active filter
      setShuffleKey((prev) => prev + 1);
    } else {
      setSelectedTag(tag);
    }
  };

  return (
    <div className="page-container">
      <Header filters={filters} onTagClick={handleTagClick} />
      <main className="content-wrap">
        {loading ? <Spinner /> : <Gallery images={images} />}
      </main>
      <Footer />
    </div>
  );
}
