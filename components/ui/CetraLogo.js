import React from 'react';

const CetraLogo = ({ color = "white", size = 32 }) => (
    // Expanded width (6.5x) and viewBox (260) to guarantee NO clipping
    <svg width={size * 6.5} height={size} viewBox="0 0 260 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* The Kinetic Chevrons (Forward Motion / Exchange) */}

        {/* Left Chevron (Larger, Enclosing) */}
        <path
            d="M14 6L2 20L14 34L20 28L12 20L20 12L14 6Z"
            fill={color}
        />

        {/* Right Chevron (Nested, Speed) */}
        <path
            d="M28 6L16 20L28 34L34 28L26 20L34 12L28 6Z"
            fill={color}
            fillOpacity="0.8"
        />

        {/* Dot Pointer (The Destination) */}
        <circle cx="38" cy="20" r="3" fill={color} />

        {/* Typography - Moved slightly right to give breathing room */}
        <text x="60" y="32" fill={color} className="font-logo" fontWeight="600" fontSize="30" letterSpacing="-0.03em">
            CETRA
        </text>
    </svg>
);

export default CetraLogo;
