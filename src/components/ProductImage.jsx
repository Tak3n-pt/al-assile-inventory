import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';

const ProductImage = ({ product, size = 24, fill = false, className = '', fallbackClass = 'text-violet-400' }) => {
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    if (product?.image_path && window.api?.products?.getImagePath) {
      window.api.products.getImagePath(product.image_path).then(res => {
        if (res?.success && res.data) {
          setImgSrc(res.data);
        } else {
          setImgSrc(null);
        }
      });
    } else {
      setImgSrc(null);
    }
  }, [product?.image_path]);

  if (imgSrc) {
    if (fill) {
      return (
        <img
          src={imgSrc}
          alt={product?.name || 'Product'}
          className={`w-full h-full object-cover ${className}`}
          onError={() => setImgSrc(null)}
        />
      );
    }
    return (
      <img
        src={imgSrc}
        alt={product?.name || 'Product'}
        className={`rounded-lg object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgSrc(null)}
      />
    );
  }

  return <Package size={size} className={fallbackClass} />;
};

export default ProductImage;
