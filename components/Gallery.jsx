"use client";

import React, { useEffect, useRef } from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import "photoswipe/style.css";

const Gallery = ({ images }) => {
  const lightboxRef = useRef(null);
  useEffect(() => {
    import('photoswipe/lightbox').then((mod) => {
      const PhotoSwipeLightbox = mod.default;
      
      // Use dataSource array approach instead of DOM order
      // This ensures slides navigate in array order, not visual masonry order
      const lightbox = new PhotoSwipeLightbox({
        dataSource: images.map((img, idx) => ({
          src: img.src,
          width: img.width,
          height: img.height,
          camera: img.camera,
          lens: img.lens,
          iso: img.iso,
          shutter: img.shutter,
          aperture: img.aperture,
          msrc: img.srcThumbnail,
          originalIndex: idx
        })),
        pswpModule: () => import('photoswipe'),
        bgOpacity: 1,
        hideAnimationDuration: 200,
        showAnimationDuration: 200,
        initialZoomLevel: 'fit',
        secondaryZoomLevel: (z) => Math.min(1, z.fit * 1.5),
        maxZoomLevel: (z) => Math.min(1, z.fit * 2),
        paddingFn: () => ({ top: 30, bottom: 30, left: 0, right: 0 }),
      });

      // Link dataSource items to their thumbnail elements for zoom animation
      lightbox.addFilter('thumbEl', (thumbEl, data) => {
        const el = document.querySelector(`#gallery-container a[data-index="${data.originalIndex}"]`);
        return el || thumbEl;
      });

      // Use thumbnail as placeholder
      lightbox.addFilter('placeholderSrc', (placeholderSrc, slide) => {
        return slide.data.msrc || placeholderSrc;
      });


      lightbox.on('uiRegister', function() {
        lightbox.pswp.ui.registerElement({
          name: 'custom-caption',
          order: 9,
          isButton: false,
          appendTo: 'root',
          html: '',
          onInit: (el) => {
            el.style.cssText = 'position: absolute; left: 0; right: 0; bottom: 0; width: 100%; background: rgba(0, 0, 0, 0.75); padding: 20px 16px; text-align: center; color: white;';
            lightbox.pswp.on('change', () => {
              const currSlide = lightbox.pswp.currSlide;
              let captionHTML = '';
              if (currSlide?.data) {
                const camera = currSlide.data.camera || '';
                const lens = currSlide.data.lens || '';
                const iso = currSlide.data.iso || '';
                const shutter = currSlide.data.shutter || '';
                const aperture = currSlide.data.aperture || '';
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

      // Handle clicks on gallery images
      const galleryContainer = document.querySelector('#gallery-container');
      if (galleryContainer) {
        galleryContainer.addEventListener('click', (e) => {
          const link = e.target.closest('a[data-index]');
          if (link) {
            e.preventDefault();
            const index = parseInt(link.dataset.index, 10);
            lightbox.loadAndOpen(index);
          }
        });
      }

      lightbox.init();
      lightboxRef.current = lightbox;
    });

    return () => {
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
    };
  }, [images]);

  return (
    <div id="gallery-container" className="mx-auto 2xl:w-5/6 pl-3 pr-3">
      <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 4, 900: 4 }}>
        <Masonry>
          {images.map((image, i) => (
            <a
              key={i}
              href={image.src}
              data-index={i}
              data-pswp-width={image.width}
              data-pswp-height={image.height}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", lineHeight: 0 }}
            >
              <LazyLoadImage
                src={image.srcThumbnail}
                alt={`Gallery image ${i + 1}`}
                effect="blur"
                threshold={i < 8 ? 0 : 100}
                style={{ width: "100%", height: "auto", display: "block", cursor: "pointer" }}
              />
            </a>
          ))}
        </Masonry>
      </ResponsiveMasonry>
    </div>
  );
};

export default Gallery;
