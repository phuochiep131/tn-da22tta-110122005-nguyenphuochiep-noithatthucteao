import Slideshow from "../../components/Slideshow";
import Products from "../../components/Products";
import PersonalizedRecommendations from "../../components/PersonalizedRecommendations";

export default function Home() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Slideshow Banner — full width, không bọc section có padding/margin */}
      <Slideshow />

      {/* Gợi ý sản phẩm cá nhân hóa */}
      <PersonalizedRecommendations />

      {/* Danh sách sản phẩm */}
      <section>
        <Products />
      </section>
    </div>
  );
}