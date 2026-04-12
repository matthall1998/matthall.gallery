"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Gallery from "@/components/Gallery";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import Spinner from "@/components/Spinner";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTag, setSelectedTag] = useState(null);
  const [shuffleKey, setShuffleKey] = useState(0);

  useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      try {
        // Fetch from the file system API (root level images only)
        const response = await fetch('/api/images');
        const data = await response.json();

        console.log("API response:", data);

        const rows = data.results;

        console.log("API response:", rows);

        let filteredData;
        if (selectedTag === "latest") {
          // Sort by export_date (newest exports first)
          filteredData = [...rows].sort(
            (a, b) => new Date(b.export_date) - new Date(a.export_date)
          );
        } else if (selectedTag === "by-date") {
          // Sort by shot_date (newest shots first)
          filteredData = [...rows].sort(
            (a, b) => new Date(b.shot_date) - new Date(a.shot_date)
          );
        } else if (selectedTag === "shuffle") {
          filteredData = [...rows].sort(() => Math.random() - 0.5);
        } else if (selectedTag) {
          // For filtering, use export_date sort
          const sorted = [...rows].sort(
            (a, b) => new Date(b.export_date) - new Date(a.export_date)
          );
          filteredData = sorted.filter((item) => {
            // Check tags
            const tags = (item.tags || "").split(",").map(t => t.trim());
            if (tags.includes(selectedTag)) return true;
            
            // Check people
            const people = (item.people || "").split(",").map(p => p.trim());
            if (people.includes(selectedTag)) return true;
            
            // Check camera (camera_make + camera)
            const cameraMake = (item.camera_make || "").trim();
            const camera = (item.camera || "").trim();
            const fullCamera = cameraMake && camera ? `${cameraMake} ${camera}` : camera;
            if (fullCamera === selectedTag) return true;
            
            // Check lens (lens_make + lens)
            const lensMake = (item.lens_make || "").trim();
            const lens = (item.lens || "").trim();
            const fullLens = lensMake && lens ? `${lensMake} ${lens}` : lens;
            if (fullLens === selectedTag) return true;
            
            return false;
          });
        } else {
          // Default: sort by export_date
          filteredData = [...rows].sort(
            (a, b) => new Date(b.export_date) - new Date(a.export_date)
          );
        }

        // Structure images
        const imageData = filteredData.map((item) => ({
          src: item.src,
          srcThumbnail: item.src,
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

        setImages(imageData);
      } catch (error) {
        console.error("Error loading images:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [selectedTag, shuffleKey]);

  const handleImageClick = (index) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  // Memoize slides to provide stable reference for YARL (per docs best practice)
  const slides = useMemo(() => {
    return images.map((img) => {
      const base = img.description || "";
      const exifLine = [
        img.iso && String(img.iso).trim() ? `ISO ${String(img.iso).replace(/^ISO\s*/i, "")}` : "",
        img.shutter || "",
        img.aperture || "",
      ]
        .filter(Boolean)
        .join(" • ");

      let descriptionNode = base;
      if (exifLine && base) {
        descriptionNode = (
          <div>
            <div>{base}</div>
            <div className="mt-1 text-sm text-gray-400">{exifLine}</div>
          </div>
        );
      } else if (exifLine) {
        descriptionNode = <div className="text-sm text-gray-400">{exifLine}</div>;
      }

      return { ...img, description: descriptionNode };
    });
  }, [images]);

  return (
    <div className="page-container">
      <Header
        onTagClick={(tag) => {
          if (tag === "shuffle") {
            setShuffleKey((prev) => prev + 1);
          }
          setSelectedTag(tag);
        }}
      />
      <main className="content-wrap">
        {loading ? (
          <Spinner />
        ) : (
          <Gallery images={images} onImageClick={handleImageClick} />
        )}
      </main>
      
      <Lightbox
        plugins={[Captions, Zoom]}
        open={isOpen}
        close={() => setIsOpen(false)}
        slides={slides}
        index={currentIndex}
        on={{
          view: ({ index }) => setCurrentIndex(index),
        }}
        captions={{ 
          showToggle: true,
          descriptionTextAlign: "center",
          descriptionMaxLines: 4,
        }}
      />
      
      <Footer />
    </div>
  );
}
