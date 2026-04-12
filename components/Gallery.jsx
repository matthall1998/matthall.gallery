"use client";

import React from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

const Gallery = ({ images }) => {
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
                src={image.src}
                alt={`Gallery image ${i + 1}`}
                effect="blur"
                style={{ width: "100%", display: "block", cursor: "pointer" }}
              />
            </a>
          ))}
        </Masonry>
      </ResponsiveMasonry>
    </div>
  );
};

export default Gallery;
