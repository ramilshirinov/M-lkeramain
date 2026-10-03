import React from 'react';

export default function YouTubePlayer({ url }) {
  // Əgər url-dən ID çıxarmaq lazımdırsa və ya birbaşa embed edəcəksinizsə
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg">
      <iframe
        src={url}
        title="YouTube video player"
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}