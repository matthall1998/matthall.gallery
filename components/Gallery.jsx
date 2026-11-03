"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import "photoswipe/style.css";

const Gallery = ({ images }) => {
  const galleryRef = useRef(null);
  const previousImagesRef = useRef(images);
  const lightboxRef = useRef(null);
  const dataSourceRef = useRef([]);

  useLayoutEffect(() => {
    if (previousImagesRef.current === images) return;
    previousImagesRef.current = images;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gallery = galleryRef.current;
    let cancelled = false;
    let decoding = false;
    let revealing = false;
    let frame;
    let animation;

    gallery.style.opacity = "0";
    gallery.classList.add("gallery-transition");

    const visibleImages = () => Array.from(gallery.querySelectorAll('a[data-index]'))
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight
          && rect.right > 0 && rect.left < window.innerWidth;
      })
      .map((link) => link.querySelector('img'));

    const scheduleCheck = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(checkReady);
    };

    function checkReady() {
      if (cancelled || decoding || revealing) return;
      const thumbnails = visibleImages();
      if (thumbnails.some((image) => !image || !image.complete)) return;

      decoding = true;
      Promise.all(thumbnails.map((image) => image.decode().catch((error) => {
        if (!cancelled) {
          console.error("Error decoding gallery thumbnail:", image.src, error);
        }
      }))).then(() => {
        decoding = false;
        if (cancelled) return;

        // Scrolling or resizing while decoding can change the visible batch.
        const current = visibleImages();
        if (current.length !== thumbnails.length
          || current.some((image, index) => image !== thumbnails[index])) {
          scheduleCheck();
          return;
        }

        revealing = true;
        stopWatching();
        gallery.style.opacity = "";
        animation = gallery.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 300, easing: "ease-out" }
        );
        animation.onfinish = () => gallery.classList.remove("gallery-transition");
      });
    }

    const observer = new MutationObserver(scheduleCheck);
    observer.observe(gallery, { childList: true, subtree: true });
    gallery.addEventListener("load", scheduleCheck, true);
    gallery.addEventListener("error", scheduleCheck, true);
    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck);

    function stopWatching() {
      observer.disconnect();
      gallery.removeEventListener("load", scheduleCheck, true);
      gallery.removeEventListener("error", scheduleCheck, true);
      window.removeEventListener("scroll", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
      cancelAnimationFrame(frame);
    }

    scheduleCheck();

    return () => {
      cancelled = true;
      stopWatching();
      animation?.cancel();
      gallery.style.opacity = "";
      gallery.classList.remove("gallery-transition");
    };
  }, [images]);

  useEffect(() => {
    dataSourceRef.current = images.map((img, idx) => ({
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
    }));

    if (lightboxRef.current) {
      lightboxRef.current.pswp?.close();
      lightboxRef.current.options.dataSource = dataSourceRef.current;
    }
  }, [images]);

  useEffect(() => {
    let cancelled = false;
    let lightbox;

    import('photoswipe/lightbox').then((mod) => {
      if (cancelled) return;
      const PhotoSwipeLightbox = mod.default;
      
      // Use dataSource array approach instead of DOM order
      // This ensures slides navigate in array order, not visual masonry order
      lightbox = new PhotoSwipeLightbox({
        dataSource: dataSourceRef.current,
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
              el.replaceChildren();
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
                for (const [text, style] of [
                  [gear, 'font-size: 18px; margin-bottom: 4px;'],
                  [exif, 'font-size: 14px; color: #ccc;'],
                ]) {
                  if (!text) continue;
                  const line = document.createElement('div');
                  line.style.cssText = style;
                  line.textContent = text;
                  el.appendChild(line);
                }
              }
              el.style.display = el.childElementCount ? 'block' : 'none';
            });
          }
        });
      });

      lightbox.init();
      lightboxRef.current = lightbox;
    }).catch((error) => {
      console.error("Error initializing gallery lightbox:", error);
    });

    return () => {
      cancelled = true;
      lightbox?.destroy();
      lightboxRef.current = null;
    };
  }, []);

  const handleImageClick = (event) => {
    const link = event.target.closest('a[data-index]');
    if (link && lightboxRef.current) {
      event.preventDefault();
      lightboxRef.current.loadAndOpen(Number(link.dataset.index));
    }
  };

  return (
    <div ref={galleryRef} id="gallery-container" className="mx-auto 2xl:w-5/6 pl-3 pr-3" onClick={handleImageClick}>
      <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 4, 900: 4 }}>
        <Masonry>
          {images.map((image, i) => (
            <a
              key={image.id}
              href={image.src}
              data-index={i}
              data-photo-id={image.id}
              data-pswp-width={image.width}
              data-pswp-height={image.height}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", width: "100%", lineHeight: 0 }}
            >
              <LazyLoadImage
                src={image.srcThumbnail}
                alt={`Gallery image ${i + 1}`}
                width={image.width}
                height={image.height}
                effect="blur"
                visibleByDefault={i < 2}
                fetchPriority={i === 0 ? "high" : "auto"}
                threshold={100}
                wrapperProps={{ style: { display: "block", width: "100%" } }}
                placeholder={
                  <span
                    style={{
                      display: "block",
                      width: "100%",
                      aspectRatio: `${image.width} / ${image.height}`,
                    }}
                  />
                }
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
