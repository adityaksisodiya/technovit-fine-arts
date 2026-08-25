"use client";

import { useEffect, useRef } from "react";
import { decode } from "blurhash";

interface BlurhashCanvasProps {
  blurhash: string | null;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Lightweight canvas component that renders a decoded Blurhash string
 * as a smooth visual placeholder while the real image downloads.
 */
export function BlurhashCanvas({
  blurhash,
  width = 32,
  height = 32,
  className,
}: BlurhashCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pixels = decode(blurhash, width, height);
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Gracefully ignore invalid blurhash strings
    }
  }, [blurhash, width, height]);

  if (!blurhash) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        filter: "blur(12px)",
        transform: "scale(1.08)", // Slight upscale to hide blurred borders
      }}
    />
  );
}
