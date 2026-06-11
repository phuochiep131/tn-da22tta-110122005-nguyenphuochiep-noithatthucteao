import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Box,
  Check,
  ChevronRight,
  Heart,
  Loader2,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import Cookies from "js-cookie";
import { CartContext } from "../../context/CartContext";
import "@google/model-viewer";
import api from "../../config/api";
import SimilarProducts from "../../components/SimilarProducts";


const LUXURY_EASE = [0.22, 1, 0.36, 1];
const MONEY_FORMATTER = new Intl.NumberFormat("vi-VN");

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: LUXURY_EASE } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const MOCK_PRODUCT = {
  productId: "atelier-sofa-01",
  productName: "Sofa Module Aveline",
  price: 128000000,
  discount: 8,
  quantity: 12,
  description:
    "Một thiết kế sofa thấp, rộng và giàu tính kiến trúc, được hoàn thiện bằng chi tiết gỗ óc chó thủ công. Dành cho những không gian sống yên tĩnh, nơi sự thoải mái, chất liệu và đường nét được đặt ngang hàng.",
  size: "320 x 112 x 72 cm",
  color: "Ngà ấm",
  material: "Vải bouclé Ý, chân đế gỗ óc chó, đệm lông vũ pha",
  warranty: "36 tháng",
  origin: "Ý",
  imageUrls: [
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=90&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=90&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=90&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618220179428-22790b461013?q=90&w=1600&auto=format&fit=crop",
  ],
};

const MOCK_RELATED_PRODUCTS = [
  {
    productId: "atelier-chair-02",
    productName: "Ghế thư giãn điêu khắc Marlow",
    price: 46000000,
    discount: 0,
    imageUrls: [
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?q=90&w=900&auto=format&fit=crop",
    ],
  },
  {
    productId: "walnut-table-03",
    productName: "Bàn trà thấp gỗ óc chó Sora",
    price: 38500000,
    discount: 6,
    imageUrls: [
      "https://images.unsplash.com/photo-1532372320978-9d84286f2c12?q=90&w=900&auto=format&fit=crop",
    ],
  },
  {
    productId: "linen-bed-04",
    productName: "Giường bọc vải linen Luca",
    price: 76000000,
    discount: 0,
    imageUrls: [
      "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?q=90&w=900&auto=format&fit=crop",
    ],
  },
  {
    productId: "stone-console-05",
    productName: "Bàn console đá travertine Caldera",
    price: 59000000,
    discount: 4,
    imageUrls: [
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=90&w=900&auto=format&fit=crop",
    ],
  },
];

const COLOR_OPTIONS = [
  { name: "Ngà ấm", value: "#e8dfd1" },
  { name: "Óc chó", value: "#7b5637" },
  { name: "Than xám", value: "#2f302e" },
  { name: "Champagne", value: "#c4aa75" },
];

const MATERIAL_OPTIONS = ["Vải bouclé Ý", "Da aniline", "Linen Bỉ", "Gỗ óc chó phủ dầu"];

const TAB_KEYS = [
  { key: "description", label: "Mô tả sản phẩm" },
  { key: "specifications", label: "Thông số kỹ thuật" },
  { key: "reviews", label: "Đánh giá" },
];

function formatMoney(value) {
  return `${MONEY_FORMATTER.format(Math.round(Number(value || 0)))}đ`;
}

function resolveImages(product) {
  if (product?.imageUrls?.length) return product.imageUrls;
  if (product?.imageUrl) return [product.imageUrl];
  return MOCK_PRODUCT.imageUrls;
}

function getProductPriceInfo(product, flashSale) {
  if (!product) return {};

  if (flashSale?.items) {
    const saleItem = flashSale.items.find((item) => item.productId === product.productId);
    if (saleItem && saleItem.soldCount < saleItem.quantity) {
      return {
        finalPrice: saleItem.flashSalePrice,
        originalPrice: product.price,
        discountPercent: Math.round(((product.price - saleItem.flashSalePrice) / product.price) * 100),
        isFlashSale: true,
        maxAvailable: saleItem.quantity - saleItem.soldCount,
      };
    }
  }

  const discount = Number(product.discount || 0);
  const finalPrice = discount > 0 ? product.price * (1 - discount / 100) : product.price;

  return {
    finalPrice,
    originalPrice: product.price,
    discountPercent: discount,
    isFlashSale: false,
    maxAvailable: product.quantity,
  };
}

function ProductDetailSkeleton() {
  return (
    <main className="min-h-screen bg-white px-5 py-10">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="aspect-[4/5] animate-pulse rounded-[2rem] bg-white" />
        <div className="space-y-6 pt-8">
          <div className="h-4 w-32 animate-pulse rounded-full bg-white" />
          <div className="h-16 w-4/5 animate-pulse rounded-2xl bg-white" />
          <div className="h-6 w-48 animate-pulse rounded-full bg-white" />
          <div className="h-28 animate-pulse rounded-3xl bg-white" />
        </div>
      </div>
    </main>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.98 }}
          transition={{ duration: 0.35, ease: LUXURY_EASE }}
          className="fixed right-4 top-4 z-[80] max-w-sm rounded-2xl border border-white/50 bg-[#1f1f1d]/95 px-5 py-4 text-sm text-[#f8f6f2] shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#c4aa75]/20 text-[#d8c390]">
              {toast.type === "success" ? <Check size={15} /> : <Sparkles size={15} />}
            </span>
            <p className="leading-relaxed">{toast.message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StarRating({ value = 0, size = 16, interactive = false, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= Math.round(value);
        const IconWrapper = interactive ? "button" : "span";
        return (
          <IconWrapper
            key={star}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => onChange(star) : undefined}
            className={interactive ? "transition hover:scale-110" : ""}
          >
            <Star
              size={size}
              fill={active ? "#c4aa75" : "transparent"}
              className={active ? "text-[#c4aa75]" : "text-[#c8bba8]"}
            />
          </IconWrapper>
        );
      })}
    </div>
  );
}

function QuantitySelector({ value, max, allowPreorder, onChange }) {
  const normalizeQuantity = (nextValue) => {
    const parsed = Number.parseInt(nextValue, 10);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    if (!allowPreorder && max > 0) return Math.min(parsed, max);
    return parsed;
  };

  const increment = () => {
    if (!allowPreorder && max > 0 && value >= max) return;
    onChange(value + 1);
  };

  return (
    <div className="inline-flex h-12 items-center overflow-hidden rounded-full border border-[#d7ccbc] bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-full w-12 items-center justify-center text-[#3a3935] transition hover:bg-white"
        aria-label="Giảm số lượng"
      >
        <Minus size={16} />
      </button>
      <input
        type="number"
        min="1"
        max={!allowPreorder && max > 0 ? max : undefined}
        value={value}
        onChange={(event) => onChange(normalizeQuantity(event.target.value))}
        onBlur={(event) => onChange(normalizeQuantity(event.target.value))}
        className="h-full w-16 border-x border-[#e1d8ca] bg-transparent text-center text-sm font-semibold text-[#232320] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Nhập số lượng"
      />
      <button
        type="button"
        onClick={increment}
        className="flex h-full w-12 items-center justify-center text-[#3a3935] transition hover:bg-white"
        aria-label="Tăng số lượng"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function ProductGallery({
  product,
  images,
  activeImageIndex,
  setActiveImageIndex,
  activeMedia,
  setActiveMedia,
  isOutOfStock,
  discountPercent,
}) {
  const currentImage = images[activeImageIndex] || images[0];
  const hasModel = Boolean(product?.arModelGltf || product?.arLink);
  const modelViewerRef = useRef(null);

  /**
   * Khi model-viewer load xong, tính scale để model hiển thị đúng kích thước
   * thực tế từ database (length × width × height, đơn vị cm → m).
   */
  const handleModelLoad = useCallback(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;

    const prodLength = product?.length;
    const prodWidth = product?.width;
    const prodHeight = product?.height;

    if (!prodLength && !prodWidth && !prodHeight) return;

    try {
      const dim = mv.getDimensions();
      if (!dim) return;

      const modelW = dim.x;
      const modelH = dim.y;
      const modelD = dim.z;

      // Kích thước thực từ DB (cm → m)
      const realW = prodWidth ? prodWidth / 100 : null;
      const realH = prodHeight ? prodHeight / 100 : null;
      const realD = prodLength ? prodLength / 100 : null;

      const ratios = [];
      if (realW && modelW > 0.0001) ratios.push(realW / modelW);
      if (realH && modelH > 0.0001) ratios.push(realH / modelH);
      if (realD && modelD > 0.0001) ratios.push(realD / modelD);

      if (ratios.length === 0) return;

      // Uniform scale
      const scale = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      mv.scale = `${scale} ${scale} ${scale}`;
    } catch (err) {
      console.warn('[ProductGallery] Error computing model scale:', err);
    }
  }, [product?.length, product?.width, product?.height]);

  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;
    mv.addEventListener('load', handleModelLoad);
    return () => mv.removeEventListener('load', handleModelLoad);
  }, [handleModelLoad, activeMedia]);

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="lg:sticky lg:top-24 lg:self-start"
    >
      <div className="grid gap-4 lg:grid-cols-[92px_1fr]">
        <div className="order-2 flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:flex-col lg:overflow-visible">
          {images.map((image, index) => (
            <motion.button
              key={image}
              type="button"
              whileHover={{ y: -3 }}
              onClick={() => {
                setActiveImageIndex(index);
                setActiveMedia("image");
              }}
              className={`h-20 w-20 flex-none overflow-hidden rounded-2xl border bg-white transition lg:h-24 lg:w-24 ${
                activeMedia === "image" && activeImageIndex === index
                  ? "border-[#2a2925] shadow-[0_18px_40px_rgba(52,43,32,0.18)]"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={image} alt={`${product.productName} - góc nhìn ${index + 1}`} className="h-full w-full object-cover" />
            </motion.button>
          ))}

          {hasModel && (
            <motion.button
              type="button"
              whileHover={{ y: -3 }}
              onClick={() => setActiveMedia("model")}
              className={`flex h-20 w-20 flex-none items-center justify-center rounded-2xl border bg-[#24231f] text-[#f8f6f2] transition lg:h-24 lg:w-24 ${
                activeMedia === "model"
                  ? "border-[#c4aa75] shadow-[0_18px_40px_rgba(52,43,32,0.22)]"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
              aria-label="Xem mô hình 3D"
            >
              <Box size={24} />
            </motion.button>
          )}
        </div>

        <div className="order-1 overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_32px_90px_rgba(74,58,39,0.18)] lg:order-2">
          <div className="relative aspect-[4/5] min-h-[440px]">
            <div className="absolute left-5 top-5 z-20 flex gap-2">
              {discountPercent > 0 && !isOutOfStock && (
                <span className="rounded-full bg-[#26231f]/90 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[#f8f6f2] backdrop-blur">
                  -{discountPercent}%
                </span>
              )}
              {isOutOfStock && (
                <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[#26231f]">
                  Hết hàng
                </span>
              )}
            </div>

            <AnimatePresence mode="wait">
              {activeMedia === "model" && hasModel ? (
                <motion.div
                  key="model"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: LUXURY_EASE }}
                  className="absolute inset-0 bg-white"
                >
                  <model-viewer
                    ref={modelViewerRef}
                    src={product.arModelGltf || product.arLink}
                    ios-src={product.arModelUsdz}
                    ar
                    ar-modes="scene-viewer quick-look webxr"
                    ar-scale="fixed"
                    ar-placement="floor"
                    camera-controls
                    auto-rotate
                    loading="lazy"
                    reveal="auto"
                    shadow-intensity="0.85"
                    environment-image="neutral"
                    alt={product.productName}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <button
                      slot="ar-button"
                      className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-[#1f1f1d] px-6 py-3 text-sm font-medium text-[#f8f6f2] shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
                    >
                      Ướm thử trong không gian
                    </button>

                    {/* Loading poster */}
                    <div slot="poster" className="absolute inset-0 flex items-center justify-center bg-white">
                      <div className="flex flex-col items-center gap-3 text-[#9a7d46]">
                        <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span className="text-sm text-[#86796a]">Đang tải mô hình 3D...</span>
                      </div>
                    </div>
                  </model-viewer>
                </motion.div>
              ) : (
                <motion.div
                  key={currentImage}
                  initial={{ opacity: 0, scale: 1.025 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.985 }}
                  transition={{ duration: 0.65, ease: LUXURY_EASE }}
                  className="group absolute inset-0"
                >
                  <img
                    src={currentImage}
                    alt={product.productName}
                    className="h-full w-full object-cover transition duration-[1200ms] ease-out group-hover:scale-[1.045]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/10" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ProductInfo({
  product,
  priceInfo,
  averageRating,
  reviewCount,
  quantity,
  setQuantity,
  selectedColor,
  setSelectedColor,
  selectedMaterial,
  setSelectedMaterial,
  isWishlisted,
  setIsWishlisted,
  isOutOfStock,
  onAddToCart,
  onBuyNow,
  onShare,
}) {
  const max = Number(priceInfo.maxAvailable || product.quantity || 0);
  const normalizedReviewCount = Number(reviewCount);
  const displayReviewCount = Number.isFinite(normalizedReviewCount) && normalizedReviewCount > 0 ? normalizedReviewCount : 0;
  const normalizedRating = Number(averageRating);
  const displayRating = displayReviewCount > 0 && Number.isFinite(normalizedRating) ? normalizedRating : 0;
  const ratingText = displayReviewCount > 0 ? displayRating.toFixed(1) : "0";

  return (
    <motion.aside variants={stagger} initial="hidden" animate="show" className="flex flex-col">
      <motion.div variants={fadeUp} className="mb-5 flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#9a7d46]">Bộ sưu tập Atelier</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWishlisted((value) => !value)}
            className={`flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm transition ${
              isWishlisted
                ? "border-[#c4aa75] bg-[#c4aa75] text-white"
                : "border-[#d6cbbb] bg-white/55 text-[#2a2925] hover:border-[#a88c55]"
            }`}
            aria-label="Yêu thích"
          >
            <Heart size={18} fill={isWishlisted ? "currentColor" : "transparent"} />
            <span className="hidden sm:inline"></span>
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#d6cbbb] bg-white/55 px-4 text-sm text-[#2a2925] transition hover:border-[#a88c55]"
            aria-label="Chia sẻ"
          >
            <Share2 size={18} />
            <span className="hidden sm:inline"></span>
          </button>
        </div>
      </motion.div>

      <motion.h1
        variants={fadeUp}
        className="max-w-2xl text-4xl font-light leading-[1.03] tracking-[-0.02em] text-[#20201d] sm:text-5xl xl:text-6xl"
      >
        {product.productName}
      </motion.h1>

      <motion.div variants={fadeUp} className="mt-5 flex flex-wrap items-center gap-3">
        <StarRating value={displayRating} />
        <span className="text-sm text-[#736b60]">{ratingText} · {displayReviewCount} đánh giá</span>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 border-y border-[#ded4c5] py-7">
        <div className="flex flex-wrap items-end gap-4">
          <p className="text-3xl font-light tracking-[-0.02em] text-[#191915] sm:text-4xl">
            {formatMoney(priceInfo.finalPrice)}
          </p>
          {priceInfo.discountPercent > 0 && (
            <p className="pb-1 text-base text-[#9c9285] line-through">{formatMoney(priceInfo.originalPrice)}</p>
          )}
        </div>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#635b50]">
          {product.description || MOCK_PRODUCT.description}
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-7 space-y-7">    
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#4c463d]">Số lượng</p>
            <QuantitySelector value={quantity} max={max} allowPreorder={isOutOfStock} onChange={setQuantity} />
          </div>
          <div className="rounded-3xl border border-[#ded4c5] bg-white/45 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#86796a]">Tình trạng</p>
            <p className="mt-1 text-sm font-semibold text-[#26231f]">
              {isOutOfStock ? "Tạm hết hàng" : `Còn ${max || product.quantity} sản phẩm`}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-9 grid gap-3 sm:grid-cols-2">
        <motion.button
          type="button"
          whileHover={{ y: -2, boxShadow: "0 22px 60px rgba(31,31,29,0.22)" }}
          whileTap={{ scale: 0.985 }}
          onClick={onAddToCart}
          className="flex h-14 items-center justify-center gap-3 rounded-full border border-[#24231f] bg-[#24231f] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#f8f6f2] transition"
        >
          <ShoppingBag size={18} />
          Thêm vào giỏ hàng
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ y: -2, boxShadow: "0 22px 60px rgba(155,125,70,0.24)" }}
          whileTap={{ scale: 0.985 }}
          onClick={onBuyNow}
          disabled={isOutOfStock}
          className="flex h-14 items-center justify-center rounded-full border border-[#c4aa75] bg-[#c4aa75] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#211f1b] transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mua ngay
        </motion.button>
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8 grid gap-3 text-sm text-[#5f574d] sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white/45 p-4">
          <Truck size={18} className="text-[#9a7d46]" />
          Giao hàng lắp đặt tận nơi
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/45 p-4">
          <ShieldCheck size={18} className="text-[#9a7d46]" />
          Bảo hành {product.warranty || "36 tháng"}
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/45 p-4">
          <RotateCcw size={18} className="text-[#9a7d46]" />
          Tư vấn phối cảnh
        </div>
      </motion.div>
    </motion.aside>
  );
}

function ProductTabs({ product, activeTab, setActiveTab, reviews, averageRating, reviewForm, onReviewChange, onSubmitReview, submittingReview, token, hasPurchased }) {
  const formatDimensions = (p) => {
    if (p && p.length && p.width && p.height) {
      return `${p.length} × ${p.width} × ${p.height} cm`;
    }
    return p ? p.size || "Có thể tùy chỉnh theo không gian" : "Có thể tùy chỉnh theo không gian";
  };

  const specs = [
    ["Kích thước", formatDimensions(product)],
    ...(product && product.weight ? [["Cân nặng", product.weight >= 1000 ? `${(product.weight / 1000).toFixed(1).replace(/\.0$/, '')} kg` : `${product.weight} g`]] : []),
    ["Màu sắc", product.color || "Ngà ấm"],
    ["Chất liệu", product.material || "Vải bọc cao cấp, chi tiết gỗ óc chó"],
    ["Xuất xứ", product.origin || "Ý"],
    ["Bảo hành", product.warranty || "36 tháng"],
    ["Giao hàng dự kiến", product.quantity > 0 ? "3-7 ngày làm việc" : "8-12 tuần"],
  ];

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="mx-auto mt-24 max-w-7xl px-5 sm:px-8"
    >
      <div className="border-y border-[#ded4c5] py-8">
        <div className="flex gap-3 overflow-x-auto">
          {TAB_KEYS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-none rounded-full px-5 py-3 text-sm uppercase tracking-[0.18em] transition ${
                activeTab === tab.key ? "text-[#f8f6f2]" : "text-[#665d52] hover:text-[#211f1c]"
              }`}
            >
              {activeTab === tab.key && (
                <motion.span
                  layoutId="active-product-tab"
                  className="absolute inset-0 rounded-full bg-[#24231f]"
                  transition={{ duration: 0.45, ease: LUXURY_EASE }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: LUXURY_EASE }}
            className="min-h-[300px] pt-12"
          >
            {activeTab === "description" && (
              <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#9a7d46]">Ghi chú thiết kế</p>
                <div>
                  <h2 className="text-3xl font-light leading-tight tracking-[-0.02em] text-[#20201d] md:text-5xl">
                    Tỷ lệ tĩnh tại, chất liệu giàu xúc cảm và dáng hình dành cho nhịp sống chậm.
                  </h2>
                  <p className="mt-6 max-w-3xl text-lg leading-9 text-[#62594f]">
                    {product.description || MOCK_PRODUCT.description}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="grid gap-4 md:grid-cols-2">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-[#e1d7c9] py-5">
                    <span className="text-sm uppercase tracking-[0.2em] text-[#8a7f70]">{label}</span>
                    <span className="max-w-[55%] text-right text-[#272521]">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
                <div className="rounded-[1.75rem] border border-white/70 bg-white/50 p-7">
                  <p className="text-sm uppercase tracking-[0.24em] text-[#8a7f70]">Điểm đánh giá</p>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="text-5xl font-light text-[#211f1c]">{averageRating.toFixed(1)}</span>
                    <StarRating value={averageRating} size={18} />
                  </div>

                  <div className="mt-8">
                    <p className="mb-3 text-sm uppercase tracking-[0.22em] text-[#8a7f70]">Đánh giá của bạn</p>
                    {!token ? (
                      <p className="rounded-2xl bg-white p-4 text-sm text-[#62594f]">Vui lòng đăng nhập để viết đánh giá.</p>
                    ) : !hasPurchased ? (
                      <p className="rounded-2xl bg-white p-4 text-sm text-[#62594f]">Bạn có thể đánh giá sau khi đơn hàng được giao thành công.</p>
                    ) : (
                      <div className="space-y-4">
                        <StarRating value={reviewForm.rating} size={22} interactive onChange={(rating) => onReviewChange("rating", rating)} />
                        <textarea
                          value={reviewForm.comment}
                          onChange={(event) => onReviewChange("comment", event.target.value)}
                          rows={5}
                          className="w-full resize-none rounded-2xl border border-[#d8cebf] bg-white p-4 text-sm text-[#2f2d29] outline-none transition focus:border-[#9a7d46]"
                          placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                        />
                        <button
                          type="button"
                          onClick={onSubmitReview}
                          disabled={submittingReview}
                          className="flex h-12 w-full items-center justify-center rounded-full bg-[#24231f] text-sm font-semibold uppercase tracking-[0.18em] text-[#f8f6f2] disabled:opacity-60"
                        >
                          {submittingReview ? <Loader2 className="animate-spin" size={18} /> : "Gửi đánh giá"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-[#e1d7c9] p-8 text-[#62594f]">
                      Chưa có đánh giá nào.
                    </div>
                  ) : (
                    reviews.map((review, index) => (
                      <motion.article
                        key={review.reviewId || `${review.userId}-${index}`}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, ease: LUXURY_EASE }}
                        className="rounded-[1.75rem] border border-white/70 bg-white/55 p-6"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-[#25231f]">{review.user?.fullName || review.user?.email || "Khách hàng đã mua"}</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-[#9b9285]">Đơn mua đã xác thực</p>
                          </div>
                          <StarRating value={review.rating} size={15} />
                        </div>
                        <p className="mt-4 leading-7 text-[#62594f]">{review.comment}</p>
                      </motion.article>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function RelatedProducts({ products, onAddToCart }) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="mx-auto mt-24 max-w-7xl px-5 pb-28 sm:px-8 lg:pb-24"
    >
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#9a7d46]">Hoàn thiện không gian</p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] text-[#20201d] md:text-5xl">Sản phẩm liên quan</h2>
        </div>
        <Link to="/" className="group inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-[#4b453d]">
          Xem bộ sưu tập
          <ChevronRight size={16} className="transition group-hover:translate-x-1" />
        </Link>
      </div>

      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.12 }} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const finalPrice = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price;
          const image = resolveImages(product)[0];

          return (
            <motion.article
              key={product.productId}
              variants={fadeUp}
              whileHover={{ y: -8 }}
              className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/48 shadow-[0_18px_60px_rgba(74,58,39,0.08)] transition"
            >
              <Link to={`/product/${product.productId}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                  <img src={image} alt={product.productName} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
                </div>
              </Link>
              <div className="p-5">
                <Link to={`/product/${product.productId}`} className="block">
                  <h3 className="min-h-12 text-lg font-light leading-snug text-[#25231f] transition group-hover:text-[#8a6d3b]">
                    {product.productName}
                  </h3>
                </Link>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#25231f]">{formatMoney(finalPrice)}</p>
                    {product.discount > 0 && <p className="text-xs text-[#9c9285] line-through">{formatMoney(product.price)}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddToCart(product, 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#24231f] text-[#f8f6f2] transition hover:bg-[#c4aa75] hover:text-[#211f1b]"
                    aria-label="Thêm sản phẩm liên quan vào giỏ hàng"
                  >
                    <ShoppingBag size={16} />
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

function MobilePurchaseBar({ product, price, quantity, setQuantity, max, allowPreorder, onAddToCart }) {
  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: LUXURY_EASE }}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/60 bg-white/92 px-4 py-3 shadow-[0_-18px_50px_rgba(54,43,29,0.16)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#25231f]">{product.productName}</p>
          <p className="text-sm text-[#8a6d3b]">{formatMoney(price)}</p>
        </div>
        <div className="scale-90">
          <QuantitySelector value={quantity} max={max} allowPreorder={allowPreorder} onChange={setQuantity} />
        </div>
        <button type="button" onClick={onAddToCart} className="h-11 rounded-full bg-[#24231f] px-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#f8f6f2]">
          Thêm giỏ
        </button>
      </div>
    </motion.div>
  );
}

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { refreshCartCount } = useContext(CartContext);

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [flashSale, setFlashSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeMedia, setActiveMedia] = useState("image");
  const [activeTab, setActiveTab] = useState("description");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedMaterial, setSelectedMaterial] = useState(MATERIAL_OPTIONS[0]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [toast, setToast] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  const token = Cookies.get("jwt");
  const currentUserId = Cookies.get("user_id");

  const notify = (message, type = "default") => setToast({ message, type });

  useEffect(() => {
    const fetchFlashSale = async () => {
      try {
        const res = await api.get("/api/flash-sales/current");
        if (res.data?.status === "Active") setFlashSale(res.data);
      } catch (err) {
        console.error("Flash sale error:", err);
      }
    };
    fetchFlashSale();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/products/${productId}`);
        setProduct(res.data);
      } catch (err) {
        console.error("Product API error:", err);
        setProduct({ ...MOCK_PRODUCT, productId: productId || MOCK_PRODUCT.productId });
      } finally {
        setQuantity(1);
        setActiveImageIndex(0);
        setActiveMedia("image");
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    fetchProduct();
  }, [productId]);

  // === GHI NHẬN LƯỢT XEM SẢN PHẨM CHO HỆ THỐNG GỢI Ý ===
  useEffect(() => {
    if (!productId || !currentUserId || !token) return;
    api.post('/api/recommend/track-view', { userId: currentUserId, productId })
      .catch(err => console.error('Track view error:', err));
  }, [productId, currentUserId, token]);


  useEffect(() => {
    if (!productId) return;

    const fetchRelated = async () => {
      try {
        const res = await api.get(`/api/products/${productId}/related`);
        setRelatedProducts(res.data || []);
      } catch (err) {
        console.error("Related products error:", err);
        setRelatedProducts([]);
      }
    };

    const fetchReviews = async () => {
      try {
        const res = await api.get(`/api/reviews/product/${productId}`);
        setReviews([...(res.data || [])].reverse());
      } catch (err) {
        console.error("Reviews error:", err);
        setReviews([]);
      }
    };

    fetchRelated();
    fetchReviews();
  }, [productId]);

  useEffect(() => {
    if (!token || !currentUserId || !productId) return;

    const checkPurchaseStatus = async () => {
      try {
        const res = await api.get(`/api/orders/user/${currentUserId}`);
        const bought = (res.data || []).some((order) => {
          const delivered = (order.orderStatus || "").toLowerCase() === "delivered";
          return delivered && order.orderDetails?.some((detail) => String(detail.product?.productId) === String(productId));
        });
        setHasPurchased(bought);
      } catch (err) {
        console.error("Purchase status error:", err);
      }
    };

    checkPurchaseStatus();
  }, [currentUserId, productId, token]);

  useEffect(() => {
    if (!product) return;

    const productColor = COLOR_OPTIONS.find((color) => color.name.toLowerCase() === String(product.color || "").toLowerCase());
    setSelectedColor(productColor || COLOR_OPTIONS[0]);
    setSelectedMaterial(product.material?.split(",")?.[0]?.trim() || MATERIAL_OPTIONS[0]);
  }, [product]);

  const priceInfo = useMemo(() => getProductPriceInfo(product, flashSale), [product, flashSale]);
  const images = useMemo(() => resolveImages(product), [product]);
  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
  }, [reviews]);
  const displayedRelatedProducts = relatedProducts.length ? relatedProducts : MOCK_RELATED_PRODUCTS;
  const isOutOfStock = Number(product?.quantity || 0) <= 0;

  const handleAddToCart = async (selectedProduct = product, qty = quantity) => {
    if (!token) {
      notify("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
      navigate("/login");
      return;
    }

    const currentPrice = selectedProduct.productId === product?.productId
      ? priceInfo
      : getProductPriceInfo(selectedProduct, null);

    if (currentPrice.isFlashSale && qty > currentPrice.maxAvailable) {
      notify(`Chỉ còn ${currentPrice.maxAvailable} sản phẩm ở mức giá này.`);
      return;
    }

    const orderPayload = {
      userId: currentUserId,
      totalAmount: currentPrice.finalPrice * qty,
      orderStatus: "pending",
      shippingAddress: "cart",
      isOrder: 0,
      orderDetails: [
        {
          product: { productId: selectedProduct.productId },
          quantity: qty,
          unitPrice: currentPrice.finalPrice,
          originalUnitPrice: selectedProduct.price,
          isFlashSale: currentPrice.isFlashSale ? 1 : 0,
        },
      ],
    };

    try {
      await api.post("/api/orders", orderPayload);
      notify(`Đã thêm ${selectedProduct.productName} vào giỏ hàng.`, "success");
      refreshCartCount(currentUserId, token);
    } catch (err) {
      console.error("Add to cart error:", err);
      notify("Chưa thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.");
    }
  };

  const handleBuyNow = () => {
    if (!token) {
      notify("Vui lòng đăng nhập trước khi thanh toán.");
      navigate("/login");
      return;
    }

    if (!isOutOfStock && quantity > Number(priceInfo.maxAvailable || product.quantity)) {
      notify("Số lượng yêu cầu hiện không khả dụng.");
      return;
    }

    navigate("/checkout", {
      state: {
        product: {
          ...product,
          price: priceInfo.finalPrice,
          originalPrice: product.price,
          isFlashSale: priceInfo.isFlashSale,
        },
        quantity,
      },
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: product.productName,
      text: product.description || "Khám phá thiết kế nội thất cao cấp này.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        notify("Đã sao chép liên kết sản phẩm.", "success");
      }
    } catch (err) {
      if (err.name !== "AbortError") notify("Chưa thể chia sẻ vào lúc này.");
    }
  };

  const handleReviewChange = (field, value) => {
    setReviewForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmitReview = async () => {
    if (!token) {
      notify("Vui lòng đăng nhập để viết đánh giá.");
      return;
    }

    if (!reviewForm.comment.trim()) {
      notify("Vui lòng nhập nội dung đánh giá.");
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await api.post("/api/reviews", {
        userId: currentUserId,
        productId,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      setReviews((current) => [res.data, ...current]);
      setReviewForm({ rating: 5, comment: "" });
      notify("Cảm ơn bạn đã gửi đánh giá.", "success");
    } catch (err) {
      console.error("Review error:", err);
      notify(err.response?.data?.error || "Chưa thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-5 text-center">
        <p className="text-2xl font-light text-[#23231f]">Không tìm thấy sản phẩm.</p>
        <button onClick={() => navigate("/")} className="mt-6 rounded-full bg-[#23231f] px-7 py-3 text-sm uppercase tracking-[0.18em] text-[#f8f6f2]">
          Về trang chủ
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#24231f]">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-8 sm:px-8 lg:pb-20">
          <motion.button
            type="button"
            onClick={() => navigate(-1)}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: LUXURY_EASE }}
            className="mb-8 inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-[#6b6257] transition hover:text-[#211f1c]"
          >
            <ArrowLeft size={16} />
            Quay lại
          </motion.button>

          <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
            <ProductGallery
              product={product}
              images={images}
              activeImageIndex={activeImageIndex}
              setActiveImageIndex={setActiveImageIndex}
              activeMedia={activeMedia}
              setActiveMedia={setActiveMedia}
              isOutOfStock={isOutOfStock}
              discountPercent={priceInfo.discountPercent}
            />

            <ProductInfo
              product={product}
              priceInfo={priceInfo}
              averageRating={averageRating}
              reviewCount={reviews.length}
              quantity={quantity}
              setQuantity={setQuantity}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              selectedMaterial={selectedMaterial}
              setSelectedMaterial={setSelectedMaterial}
              isWishlisted={isWishlisted}
              setIsWishlisted={setIsWishlisted}
              isOutOfStock={isOutOfStock}
              onAddToCart={() => handleAddToCart(product, quantity)}
              onBuyNow={handleBuyNow}
              onShare={handleShare}
            />
          </div>
        </div>
      </section>

      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.24 }}
        className="mx-auto grid max-w-7xl gap-4 px-5 sm:px-8 md:grid-cols-3"
      >
        {[
          [PackageCheck, "Giao hàng tuyển chọn", "Lắp đặt tận nơi theo lịch hẹn, bảo toàn trải nghiệm showroom."],
          [ShieldCheck, "Chất liệu xác thực", "Vải bọc, gỗ và kim loại hoàn thiện được kiểm định cho từng đơn hàng."],
          [Sparkles, "Dịch vụ nội thất", "Tư vấn tỷ lệ, bảng màu và vị trí đặt sản phẩm trong không gian."],
        ].map(([Icon, title, copy]) => (
          <motion.article key={title} variants={fadeUp} className="rounded-[1.75rem] border border-white/70 bg-white/45 p-7 shadow-[0_20px_70px_rgba(88,70,48,0.08)]">
            <Icon size={22} className="text-[#9a7d46]" />
            <h3 className="mt-5 text-xl font-light text-[#25231f]">{title}</h3>
            <p className="mt-3 leading-7 text-[#665d52]">{copy}</p>
          </motion.article>
        ))}
      </motion.section>

      <ProductTabs
        product={product}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reviews={reviews}
        averageRating={averageRating}
        reviewForm={reviewForm}
        onReviewChange={handleReviewChange}
        onSubmitReview={handleSubmitReview}
        submittingReview={submittingReview}
        token={token}
        hasPurchased={hasPurchased}
      />

      <SimilarProducts productId={productId} onAddToCart={handleAddToCart} />

      <RelatedProducts products={displayedRelatedProducts} onAddToCart={handleAddToCart} />


      <MobilePurchaseBar
        product={product}
        price={priceInfo.finalPrice}
        quantity={quantity}
        setQuantity={setQuantity}
        max={Number(priceInfo.maxAvailable || product.quantity || 0)}
        allowPreorder={isOutOfStock}
        onAddToCart={() => handleAddToCart(product, quantity)}
      />
    </main>
  );
}
