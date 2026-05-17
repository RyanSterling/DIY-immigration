import type { JSX } from "react";
import React from "react";

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  background?: string;
  radius?: string;
  circle?: boolean;
  block?: boolean;
  style?: React.CSSProperties;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

function SkeletonLoader({
  width = "100%",
  height = "1em",
  background = "#E9ECEF",
  radius = "4px",
  circle = false,
  block = true,
  className = "",
  style = {},
  as: Tag = "div",
}: SkeletonLoaderProps) {
  return (
    <Tag
      className={`relative inline-block animate-pulse overflow-hidden bg-gray-200 ${
        block ? "block" : "inline-block"
      } before:animate-shimmer before:absolute before:inset-0 before:h-full before:w-full before:bg-linear-to-r before:from-transparent before:via-white/60 before:to-transparent ${className}`}
      style={{
        width,
        height,
        background,
        borderRadius: circle ? "50%" : radius,
        ...style,
      }}
    >
      &zwnj;
    </Tag>
  );
}

export default SkeletonLoader;
