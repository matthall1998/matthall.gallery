"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Gallery from "@/components/Gallery";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import Spinner from "@/components/Spinner";

export default function GalleryPage({ slug = null }) {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [shuffleKey, setShuffleKey] = useState(0);
  const lightboxRef = useRef(null);

  // Initialize PhotoSwipe
  useEffect(() => {
    if (!lightboxRef.current && images.length > 0) {
      const lightbox = new PhotoSwipeLightbox({
        gallery: '#gallery-container',
        children: 'a',
        pswpModule: () => import('photoswipe'),
        bgOpacity: 1,
        hideAnimationDuration: 200,
        showAnimationDuration: 200,
        initialZoomLevel: 'fit',
        secondaryZoomLevel: (zoomLevelObject) => {
          // Zoom to 1.5x the fit level, but never beyond actual size
          return Math.min(1, zoomLevelObject.fit * 1.5);
        },
        maxZoomLevel: (zoomLevelObject) => {
          // Max 2x the fit level, but never beyond actual size
          return Math.min(1, zoomLevelObject.fit * 2);
        },
        paddingFn: (viewportSize) => {
          return {
            top: 30,
            bottom: 30,
            left: 0,
            right: 0
          };
        },
      });

      // Add caption display
      lightbox.on('uiRegister', function() {
        lightbox.pswp.ui.registerElement({
          name: 'custom-caption',
          order: 9,
          isButton: false,
          appendTo: 'root',
          html: '',
          onInit: (el, pswp) => {
            el.style.cssText = 'position: absolute; left: 0; right: 0; bottom: 0; width: 100%; background: rgba(0, 0, 0, 0.75); padding: 20px 16px; text-align: center; color: white;';
            
            lightbox.pswp.on('change', () => {
              const currSlideElement = lightbox.pswp.currSlide?.data?.element;
              let captionHTML = '';
              
              if (currSlideElement) {
                const caption = currSlideElement.dataset.caption || '';
                const camera = currSlideElement.dataset.camera || '';
                const lens = currSlideElement.dataset.lens || '';
                const iso = currSlideElement.dataset.iso || '';
                const shutter = currSlideElement.dataset.shutter || '';
                const aperture = currSlideElement.dataset.aperture || '';
                
                const gear = [camera, lens].filter(Boolean).join(' • ');
                const exif = [
                  iso ? `ISO ${iso.replace(/^ISO\s*/i, '')}` : '',
                  shutter,
                  aperture
                ].filter(Boolean).join(' • ');
                
                if (gear) captionHTML += `<div style="font-size: 18px; margin-bottom: 4px;">${gear}</div>`;
                if (exif) captionHTML += `<div style="font-size: 14px; color: #ccc;">${exif}</div>`;
              }
              
              el.innerHTML = captionHTML || '';
              el.style.display = captionHTML ? 'block' : 'none';
            });
          }
        });
      });

      lightbox.init();
      lightboxRef.current = lightbox;
    }

    return () => {
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
    };
  }, [images]);

  useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      try {
        // Fetch from API - with or without slug
        const url = slug ? `/api/images?slug=${slug}` : '/api/images';
        const response = await fetch(url);
        const data = await response.json();

        console.log("API response:", data);

        const rows = data.results;

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

        setImages(imageData);
      } catch (error) {
        console.error("Error loading images:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [slug, selectedTag, shuffleKey]);

  if (loading) {
    return (
      <div className="page-container">
        <Header
          slug={slug}
          onTagClick={(tag) => {
            if (tag === "shuffle") {
              setShuffleKey((prev) => prev + 1);
            }
            setSelectedTag(tag);
          }}
        />
        <main className="content-wrap">
          <Spinner />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header
        slug={slug}
        onTagClick={(tag) => {
          if (tag === "shuffle") {
            setShuffleKey((prev) => prev + 1);
          }
          setSelectedTag(tag);
        }}
      />
      <main className="content-wrap">
        <Gallery images={images} />
      </main>
      <Footer />
    </div>
  );
}
