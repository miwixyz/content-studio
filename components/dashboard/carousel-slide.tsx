"use client";

import { cn } from "@/lib/utils";
import { studio } from "@/config/studio.config";

export interface SlideData {
  type: "hook" | "content" | "cta";
  heading: string;
  subheading?: string;
  body?: string;
  callout?: string;
  cta_primary?: string;
  cta_secondary?: string;
  backgroundUrl?: string;
}

interface CarouselSlideProps {
  slide: SlideData;
  index: number;
  total: number;
  preview?: boolean;
  previewScale?: number;
}

function renderHeading(text: string) {
  // Convert *word* to blue-accented spans
  const parts = text.split(/\*([^*]+)\*/);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ color: "#4F6AFF" }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function CarouselSlide({
  slide,
  index,
  total,
  preview = false,
  previewScale,
}: CarouselSlideProps) {
  const scale = preview ? (previewScale || 0.2) : 1;
  const w = 1080;
  const h = 1350;

  return (
    <div
      style={{
        width: w * scale,
        height: h * scale,
        overflow: "hidden",
      }}
    >
    <div
      style={{
        width: w,
        height: h,
        transform: preview ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
      }}
    >
      <div
        data-slide-index={index}
        className="carousel-slide"
        style={{
          width: w,
          height: h,
          background: "#060B18",
          backgroundImage: slide.backgroundUrl
            ? `url(${slide.backgroundUrl})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "70px 65px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Brand name */}
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 26,
            color: "#FFFFFF",
            letterSpacing: -0.3,
            position: "absolute",
            top: 70,
            left: 65,
          }}
        >
          {studio.carousel.brandName}
        </div>

        {/* X-pattern decoration */}
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 60,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 28,
                color: "#4F6AFF",
                opacity: 0.7,
              }}
            >
              &#x2715;
            </span>
          ))}
        </div>

        {/* Watermark number */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 30,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 320,
            color: "#FFFFFF",
            opacity: 0.06,
            letterSpacing: -15,
            lineHeight: 1,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </div>

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            marginTop: 60,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Profile section for hook and CTA slides */}
          {(slide.type === "hook" || slide.type === "cta") && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 25,
                marginBottom: 40,
              }}
            >
              <img
                src={studio.carousel.headshot}
                alt={studio.carousel.brandName}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  border: "3px solid #4F6AFF",
                  objectFit: "cover",
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 32,
                    color: "#FFFFFF",
                  }}
                >
                  {studio.carousel.creatorFullName}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: 22,
                    color: "#94A3B8",
                  }}
                >
                  {studio.carousel.handle}
                </div>
              </div>
            </div>
          )}

          {/* Quote marks for content slides */}
          {slide.type === "content" && (
            <div
              style={{
                fontSize: 72,
                color: "#4F6AFF",
                opacity: 0.9,
                lineHeight: 0.5,
                marginBottom: 20,
                fontFamily: "Georgia, serif",
              }}
            >
              &#x201C;
            </div>
          )}

          {/* Heading */}
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: slide.type === "hook" ? 100 : slide.type === "cta" ? 78 : 88,
              color: "#FFFFFF",
              lineHeight: 1.05,
              letterSpacing: -2,
              marginBottom: 30,
              margin: 0,
              padding: 0,
              paddingBottom: 30,
            }}
          >
            {renderHeading(slide.heading)}
          </h2>

          {/* Subheading (hook) */}
          {slide.subheading && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: 34,
                color: "#94A3B8",
                lineHeight: 1.5,
                marginBottom: 25,
              }}
            >
              {slide.subheading}
            </p>
          )}

          {/* Body text */}
          {slide.body && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: 34,
                color: "#94A3B8",
                lineHeight: 1.5,
                marginBottom: 25,
              }}
            >
              {slide.body}
            </p>
          )}

          {/* Callout box */}
          {slide.callout && (
            <span
              style={{
                display: "inline",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 34,
                background: "#4F6AFF",
                color: "#FFFFFF",
                padding: "6px 16px",
                boxDecorationBreak: "clone" as const,
                WebkitBoxDecorationBreak: "clone" as const,
              }}
            >
              {slide.callout}
            </span>
          )}

          {/* CTA body is rendered above as regular body text - no fake buttons */}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingTop: 40,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: 24,
              color: "#FFFFFF",
              opacity: 0.7,
            }}
          >
            {studio.carousel.handle}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                fontSize: 18,
                color: "#FFFFFF",
                opacity: 0.4,
              }}
            >
              {index + 1}/{total}
            </div>
            {index < total - 1 && (
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 36,
                  color: "#FFFFFF",
                  opacity: 0.7,
                }}
              >
                &#x2192;
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
