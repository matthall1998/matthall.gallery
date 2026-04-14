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
      const lightbox = new PhotoSwipeLightbox({
        gallery: '#gallery-container',
        children: 'a',
        pswpModule: () => import('photoswipe'),
        bgOpacity: 1,
        hideAnimationDuration: 200,
        showAnimationDuration: 200,
        initialZoomLevel: 'fit',
        secondaryZoomLevel: (z) => Math.min(1, z.fit * 1.5),
        maxZoomLevel: (z) => Math.min(1, z.fit * 2),
        paddingFn: () => ({ top: 30, bottom: 30, left: 0, right: 0 }),
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
              const currSlideElement = lightbox.pswp.currSlide?.data?.element;
              let captionHTML = '';
              if (currSlideElement) {
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
    });

    return () => {
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
    };
  }, []);

  return (
    <div id="gallery-container" className="mx-auto 2xl:w-5/6 pl-3 pr-3">
      <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 4, 900: 4 }}>
        <Masonry sequential={true} gutter="10px">
          {images.map((image, i) => (
            <a
              key={i}
              href={image.src}
              data-pswp-width={image.width}
              data-pswp-height={image.height}
              data-caption={image.title || ""}
              data-camera={image.camera || ""}
              data-lens={image.lens || ""}
              data-iso={image.iso || ""}
              data-shutter={image.shutter || ""}
              data-aperture={image.aperture || ""}
              target="_blank"
              rel="noreferrer"
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
