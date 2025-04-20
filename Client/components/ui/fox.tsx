// MetaMaskFox.tsx
import { useEffect, useRef } from 'react';
import ModelViewer from '@metamask/logo';

type MetaMaskFoxProps = {
  width?: number;
  height?: number;
  followMouse?: boolean;
  slowDrift?: boolean;
};

const MetaMaskFox: React.FC<MetaMaskFoxProps> = ({
  width = 400,
  height = 400,
  followMouse = true,
  slowDrift = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewer = ModelViewer({
      pxNotRatio: true,
      width,
      height,
      followMouse,
      slowDrift,
    });

    if (containerRef.current) {
      containerRef.current.innerHTML = ''; // clear any old instance
      containerRef.current.appendChild(viewer.container);
    }

    viewer.setFollowMouse(followMouse);

    return () => {
      viewer.stopAnimation();
    };
  }, [width, height, followMouse, slowDrift]);

  return <div ref={containerRef} style={{ width, height }} />;
};

export default MetaMaskFox;
