'use client'

import { Box, Circle } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const MotionBox = motion.create(Box)
const MotionCircle = motion.create(Circle)

export default function GeometricBackground() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    // Generate random shapes
    const shapes = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        size: Math.random() * 100 + 20, // 20px to 120px
        x: Math.random() * 100, // 0% to 100%
        y: Math.random() * 100, // 0% to 100%
        duration: Math.random() * 20 + 10, // 10s to 30s
        delay: Math.random() * 5,
        type: Math.random() > 0.5 ? 'circle' : 'square',
        color: Math.random() > 0.5 ? 'brand.500' : 'purple.500',
    }))

    return (
        <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            overflow="hidden"
            zIndex={0}
            pointerEvents="none"
        >
            {shapes.map((shape) => (
                <MotionBox
                    key={shape.id}
                    position="absolute"
                    left={`${shape.x}%`}
                    top={`${shape.y}%`}
                    width={`${shape.size}px`}
                    height={`${shape.size}px`}
                    bg={shape.color}
                    borderRadius={shape.type === 'circle' ? 'full' : '2xl'}
                    filter="blur(40px)"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                        opacity: [0.7, 0.9, 0.7],
                        scale: [1, 1.2, 1],
                        x: [0, Math.random() * 400 - 200, 0],
                        y: [0, Math.random() * 400 - 200, 0],
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
                style={{ background: 'linear-gradient(to bottom, transparent, var(--chakra-colors-bg-canvas))' }}
            />
        </Box>
    )
}
