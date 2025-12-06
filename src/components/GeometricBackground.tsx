"use client";

import { Box } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useMemo } from "react";

const MotionBox = motion.create(Box);

type Shape = {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  type: "circle" | "square";
  color: string;
  driftX: number;
  driftY: number;
};

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const createShapes = (count: number): Shape[] => {
  return Array.from({ length: count }).map((_, i) => {
    const rand = (offset: number, min = 0, max = 1) => {
      const value = pseudoRandom(i * 13 + offset);
      return min + value * (max - min);
    };

    return {
      id: i,
      size: rand(1, 20, 120),
      x: rand(2, 0, 100),
      y: rand(3, 0, 100),
      duration: rand(4, 10, 30),
      delay: rand(5, 0, 5),
      type: rand(6) > 0.5 ? "circle" : "square",
      color: rand(7) > 0.5 ? "brand.500" : "purple.500",
      driftX: rand(8, -200, 200),
      driftY: rand(9, -200, 200),
    };
  });
};

export default function GeometricBackground() {
  const shapes = useMemo(() => createShapes(15), []);

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} overflow="hidden" zIndex={0} pointerEvents="none">
      {shapes.map((shape) => (
        <MotionBox
          key={shape.id}
          position="absolute"
          left={`${shape.x}%`}
          top={`${shape.y}%`}
          width={`${shape.size}px`}
          height={`${shape.size}px`}
          bg={shape.color}
          borderRadius={shape.type === "circle" ? "full" : "2xl"}
          filter="blur(40px)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.7, 0.9, 0.7],
            scale: [1, 1.2, 1],
            x: [0, shape.driftX, 0],
            y: [0, shape.driftY, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            ease: "linear",
            delay: shape.delay,
          }}
        />
      ))}

      {/* Gradient Overlay to ensure text readability */}
      <Box
        position="absolute"
        inset={0}
        bgGradient="to-b"
        gradientFrom="bg.canvas/0"
        gradientTo="bg.canvas"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--chakra-colors-bg-canvas))",
        }}
      />
    </Box>
  );
}
