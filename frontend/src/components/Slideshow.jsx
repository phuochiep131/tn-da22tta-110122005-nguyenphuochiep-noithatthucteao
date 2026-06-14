import React, { useEffect, useState, useRef } from "react";
import api from "../config/api";

export default function Slideshow() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    api.get("/api/slideshows/public")
      .then((res) => { setSlides(res.data); setLoading(false); })
      .catch((err) => { console.error("Failed to fetch slides:", err); setLoading(false); });
  }, []);

  const go = (n) => setCurrent((n + slides.length) % slides.length);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 4500);
  };

  useEffect(() => {
    if (slides.length > 1) {
      timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 4500);
    }
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 font-montserrat">
        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#B8960C]">
          Đang tải...
        </span>
      </div>
    );
  }

  if (slides.length === 0) return null;

  const handlePrev = () => { go(current - 1); resetTimer(); };
  const handleNext = () => { go(current + 1); resetTimer(); };

  return (
    // Full width — không có max-w, không có px, không có mx-auto
    <div className="w-full font-montserrat">

      {/* Main frame — full width, sát mép */}
      <div className="relative w-full border-y border-[#B8960C] bg-[#1A1710] overflow-hidden">

        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-4 h-4 z-10 pointer-events-none"
          style={{ borderTop: "1.5px solid #B8960C", borderLeft: "1.5px solid #B8960C" }} />
        <div className="absolute top-2 right-2 w-4 h-4 z-10 pointer-events-none"
          style={{ borderTop: "1.5px solid #B8960C", borderRight: "1.5px solid #B8960C" }} />
        <div className="absolute bottom-2 left-2 w-4 h-4 z-10 pointer-events-none"
          style={{ borderBottom: "1.5px solid #B8960C", borderLeft: "1.5px solid #B8960C" }} />
        <div className="absolute bottom-2 right-2 w-4 h-4 z-10 pointer-events-none"
          style={{ borderBottom: "1.5px solid #B8960C", borderRight: "1.5px solid #B8960C" }} />

        {/* Slides */}
        <div className="relative overflow-hidden h-[52vw] max-h-[600px] min-h-[220px]">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
              style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
            >
              <a
                href={slide.targetUrl || "#"}
                className={`block w-full h-full ${slide.targetUrl ? "cursor-pointer" : "cursor-default"}`}
                tabIndex={i === current ? 0 : -1}
              >
                <img
                  src={slide.imageUrl}
                  alt={slide.title || "Slideshow image"}
                  className="w-full h-full object-cover block"
                  style={{
                    transition: "transform 8s ease",
                    transform: i === current ? "scale(1)" : "scale(1.04)",
                  }}
                  loading="lazy"
                  onError={(e) => { e.target.src = "https://placehold.co/1600x700/1A1710/B8960C?text=No+Image"; }}
                />
              </a>

              {/* Gradient veil */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(10,9,6,0.75) 0%, rgba(10,9,6,0.08) 55%, transparent 100%)" }}
              />

              {/* Caption */}
              {(slide.title || slide.description) && (
                <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none px-8 pb-8 md:px-16 md:pb-12">
                  {slide.title && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-6 h-px bg-[#B8960C]" />
                      <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-[#B8960C]">
                        {slide.category || "Nội thất"}
                      </span>
                    </div>
                  )}
                  {slide.title && (
                    <h3
                      className="font-light text-[#F5EDD8] tracking-wide leading-snug mb-1.5"
                      style={{ fontSize: "clamp(18px, 3.5vw, 36px)" }}
                    >
                      {slide.title}
                    </h3>
                  )}
                  {slide.description && (
                    <p
                      className="font-normal tracking-wider"
                      style={{ fontSize: "clamp(10px, 1.4vw, 14px)", color: "rgba(245,237,216,0.58)" }}
                    >
                      {slide.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Nav buttons */}
        {slides.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Slide trước"
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center text-[#B8960C] transition-colors duration-200 hover:bg-[#B8960C]/10"
              style={{ background: "rgba(26,23,16,0.55)", border: "0.5px solid rgba(184,150,12,0.4)" }}
            >
              ←
            </button>
            <button
              onClick={handleNext}
              aria-label="Slide tiếp theo"
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center text-[#B8960C] transition-colors duration-200 hover:bg-[#B8960C]/10"
              style={{ background: "rgba(26,23,16,0.55)", border: "0.5px solid rgba(184,150,12,0.4)" }}
            >
              →
            </button>
          </>
        )}
      </div>

      {/* Bottom bar: eyebrow + dots + counter */}
      {slides.length > 1 && (
        <div
          className="flex items-center justify-between px-8 md:px-16 py-3 border-b border-[#B8960C]/30"
          style={{ background: "#1A1710" }}
        >
          {/* Eyebrow label */}
          <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-[#B8960C]/50">
            Collection
          </span>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { go(i); resetTimer(); }}
                aria-label={`Slide ${i + 1}`}
                className="h-px border-none p-0 cursor-pointer outline-none transition-all duration-300"
                style={{
                  width: i === current ? 36 : 20,
                  background: i === current ? "#B8960C" : "rgba(184,150,12,0.3)",
                }}
              />
            ))}
          </div>

          {/* Counter */}
          <div
            className="text-[10px] font-medium tracking-[0.15em] flex items-center"
            style={{ color: "rgba(184,150,12,0.65)" }}
          >
            {String(current + 1).padStart(2, "0")}
            <span className="mx-1.5 opacity-40">—</span>
            {String(slides.length).padStart(2, "0")}
          </div>
        </div>
      )}

    </div>
  );
}