"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const HERO_VIDEO_SRC = "/assets/hero/footscray-drone.mp4";

/** Static local poster — always available even when listing API or Cloudinary is slow. */
export const HERO_POSTER_STATIC = "/assets/agent/jignesh.jpeg";

/** Homepage hero uses only the opening clip (seconds). */
export const HERO_VIDEO_CLIP_SECONDS = 7;

/** Full-bleed muted loop for the homepage hero. Still image is the fallback. */
export function HeroVideo({ alt, posterSrc }: { alt: string; posterSrc?: string }) {
  const poster = posterSrc ?? HERO_POSTER_STATIC;
  const [ready, setReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const markReady = useCallback(() => {
    if (!videoFailed) setReady(true);
  }, [videoFailed]);

  const loopClip = useCallback(() => {
    const video = videoRef.current;
    if (video && video.currentTime >= HERO_VIDEO_CLIP_SECONDS) {
      video.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlaying = () => markReady();
    const onCanPlay = () => markReady();

    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      markReady();
    }

    video.play().catch(() => {
      setVideoFailed(true);
      setReady(false);
    });

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [markReady]);

  const showPoster = !ready || videoFailed;

  return (
    <div className="absolute inset-0 overflow-hidden bg-oxblood">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt=""
        aria-hidden
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover object-center saturate-[0.94] contrast-[1.03] brightness-[0.84] transition-opacity duration-700 ${
          showPoster ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`absolute inset-0 transition-opacity duration-700 ${showPoster ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(210,173,117,0.18),transparent_32%),radial-gradient(circle_at_80%_24%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(135deg,rgba(92,31,39,0.96),rgba(61,20,26,1))]" />
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(115deg,transparent_22%,rgba(255,255,255,0.08)_36%,transparent_52%)] bg-[length:220%_100%]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-oxblood to-transparent" />
      </div>
      <video
        ref={videoRef}
        className={`hero-video absolute inset-0 h-full w-full object-cover object-center saturate-[0.92] contrast-[1.04] brightness-[0.98] transition-opacity duration-700 ${
          ready && !videoFailed ? "opacity-100" : "opacity-0"
        }`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        aria-label={alt}
        onPlaying={markReady}
        onCanPlay={markReady}
        onTimeUpdate={loopClip}
        onError={() => {
          setVideoFailed(true);
          setReady(false);
        }}
      >
        <source src={HERO_VIDEO_SRC} type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-oxblood/15 mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-oxblood/80 via-oxblood/10 to-oxblood/15" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-oxblood to-transparent" />
    </div>
  );
}
