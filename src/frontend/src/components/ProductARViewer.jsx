import React, { useState, useRef, useEffect } from 'react';
import '@google/model-viewer';

/**
 * ProductARViewer – component hiển thị gallery ảnh sản phẩm kèm trình xem 3D/AR.
 *
 * Props:
 *   images       – mảng URL ảnh sản phẩm
 *   arModelGltf  – URL file .glb (web/Android AR)
 *   arModelUsdz  – URL file .usdz (iOS AR Quick Look)
 *   productName  – tên sản phẩm (alt text)
 *
 * Fix chính:
 *  1. Chỉ dùng 1 <model-viewer> duy nhất (trước đó dùng 2, gây lag).
 *  2. Dùng ar-scale="auto" → người dùng tự do thay đổi kích thước model trong AR.
 *  3. Thêm loading="lazy", poster placeholder, reveal="auto" → giảm lag.
 */
const ProductARViewer = ({
  images = [],
  arModelGltf,
  arModelUsdz,
  productName,
}) => {
  const [activeImage, setActiveImage] = useState(images?.[0] || 'https://via.placeholder.com/500');
  const modelViewerRef = useRef(null);

  useEffect(() => {
    setActiveImage(images?.[0] || 'https://via.placeholder.com/500');
  }, [images?.[0]]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Ảnh lớn (Active Image) */}
      <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
        <img 
          src={activeImage} 
          alt={productName} 
          className="w-full h-full object-cover transition-transform duration-300"
        />
      </div>

      {/* 2. Hàng ngang Thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((imgUrl, index) => (
            <button
              key={index}
              onClick={() => setActiveImage(imgUrl)}
              className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                activeImage === imgUrl ? 'border-blue-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={imgUrl} alt={`${productName} thumbnail ${index}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* 3. Trình xem 3D/AR – CHỈ 1 model-viewer duy nhất (fix lag) */}
      {(arModelGltf || arModelUsdz) && (
        <div className="mt-4">
          <div className="relative w-full aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
            <model-viewer
              ref={modelViewerRef}
              src={arModelGltf}
              ios-src={arModelUsdz}
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              ar-placement="floor"
              camera-controls
              auto-rotate
              loading="lazy"
              reveal="auto"
              shadow-intensity="0.8"
              environment-image="neutral"
              alt={productName}
              style={{ width: '100%', height: '100%', outline: 'none' }}
            >
              <button 
                slot="ar-button" 
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm md:text-base border-none cursor-pointer flex items-center gap-2 z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                Xem trong phòng của bạn (AR)
              </button>

              {/* Loading placeholder – hiện khi model đang tải */}
              <div slot="poster" className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span className="text-sm">Đang tải mô hình 3D...</span>
                </div>
              </div>
            </model-viewer>
            {/* Chỉ báo kéo thả 3D */}
            <div className="absolute top-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
               Chạm để xoay 3D
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductARViewer;
