"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { api } from "./cart-context";

export function ProductArtwork({
  productId,
  index,
}: {
  productId: string;
  index: number;
}) {
  const [image, setImage] = useState<{ id: string; altText: string } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(api + "/catalog/products/" + productId + "/images", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const images: { id: string; altText: string }[] = await response.json();
        setImage(images[0] ?? null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [productId]);
  if (image && !failed)
    return (
      <div className="product-art catalog-photo">
        <Image
          src={api + "/catalog/images/" + image.id}
          alt={image.altText}
          width={600}
          height={600}
          unoptimized
          onError={() => setFailed(true)}
        />
      </div>
    );
  return (
    <div className={"product-art art-" + (index % 4)} aria-hidden="true">
      <span className="sample-paper">
        <span>
          your idea,
          <br />
          <em>in print.</em>
        </span>
        <small>TWENTY9 ELEVEN</small>
      </span>
      <span className="preview-label">PRINT PREVIEW</span>
    </div>
  );
}
