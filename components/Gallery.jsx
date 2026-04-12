"use client";

import React from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

const Gallery = ({ images, onImageClick }) => {
  return (
    <div className="mx-auto 2xl:w-5/6 pl-3 pr-3">
      <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 4, 900: 4 }}>
        <Masonry sequential={true} gutter="10px">
          {images.map((image, i) => (
            <LazyLoadImage
              key={i}
              src={image.src}
              alt={`Masonry item ${i + 1}`}
              effect="blur"
              style={{ width: "1000px", display: "block", cursor: "pointer" }}
              onClick={() => onImageClick(i)}
            />
          ))}
        </Masonry>
      </ResponsiveMasonry>
    </div>
  );
};

export default Gallery;
