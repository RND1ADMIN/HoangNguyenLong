// TonKhoManager.jsx
import React, { useEffect, useState } from 'react';
import TonKhoManagerPC from './TonKhoManagerPC';
import TonKhoManagerMobile from './TonKhoManagerMobile';

const TonKhoManager = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Function to check if viewport is mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // 768px is typical breakpoint for tablet/desktop
        };

        // Initial check
        checkMobile();

        // Add event listener for window resize
        window.addEventListener('resize', checkMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile ? <TonKhoManagerMobile /> : <TonKhoManagerPC />;
};

export default TonKhoManager;