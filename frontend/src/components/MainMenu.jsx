import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import api from "../config/api";

export default function MainMenu() {
  const location = useLocation();

  const [categories, setCategories] = useState([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mobileSubOpen, setMobileSubOpen] = useState(false);
  const [hoveredPlanner, setHoveredPlanner] = useState(false);

  useEffect(() => {
    api
      .get("/api/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  const menus = [
    { name: "Trang chủ", path: "/" },
    { name: "Sản phẩm", path: "/products", dropdown: true },
    { name: "Khuyến mãi", path: "/promotions" },
    { name: "Liên hệ", path: "/contact" },
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white border-b border-gray-100 relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Mobile Toggle */}
          <button
            className="lg:hidden flex items-center gap-2 text-gray-800"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
            <span className="uppercase text-sm font-medium tracking-wide">
              Danh mục
            </span>
          </button>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center">
            {menus.map((menu, i) => (
              <div key={i} className="relative group h-12 flex items-center">
                {menu.dropdown ? (
                  <>
                    <Link
                      to={menu.path}
                      className={`flex items-center gap-1 px-4 h-full text-sm font-semibold uppercase tracking-wide border-b-2 transition-all
                        ${
                          isActive(menu.path)
                            ? "text-blue-600 border-blue-600"
                            : "text-gray-700 border-transparent hover:text-blue-600 hover:border-blue-400"
                        }`}
                    >
                      {menu.name}
                      <ChevronDown size={14} />
                    </Link>

                    {/* Desktop Dropdown */}
                    <div
                      className="
                        absolute top-full left-0
                        w-64 bg-white
                        shadow-xl border border-gray-100
                        rounded-b-xl
                        opacity-0 invisible
                        group-hover:opacity-100
                        group-hover:visible
                        transition-all duration-200
                        translate-y-2
                        group-hover:translate-y-0
                        z-50
                      "
                    >
                      <div className="py-2">
                        {categories.map((cat) => (
                          <Link
                            key={cat.categoryId}
                            to={`/products?category=${cat.categoryId}`}
                            className="
                              block px-5 py-3
                              text-sm text-gray-600
                              hover:bg-gray-50
                              hover:text-blue-600
                              transition
                            "
                          >
                            {cat.categoryName}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    to={menu.path}
                    className={`px-4 h-full flex items-center text-sm font-semibold uppercase tracking-wide border-b-2 transition-all
                      ${
                        isActive(menu.path)
                          ? "text-blue-600 border-blue-600"
                          : "text-gray-700 border-transparent hover:text-blue-600 hover:border-blue-400"
                      }`}
                  >
                    {menu.name}
                  </Link>
                )}
              </div>
            ))}

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 mx-5" />

            {/* Room Planner */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredPlanner(true)}
              onMouseLeave={() => setHoveredPlanner(false)}
            >
              <Link
                to="/room-planner"
                className="
                  relative flex items-center gap-2
                  px-4 h-8
                  rounded-lg overflow-hidden
                  text-white text-sm font-bold
                  transition-all duration-200
                  hover:-translate-y-0.5
                "
                style={{
                  background:
                    "linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 58%,#0ea5e9 100%)",
                  boxShadow: hoveredPlanner
                    ? "0 4px 18px rgba(29,78,216,.45)"
                    : "0 2px 10px rgba(29,78,216,.30)",
                }}
              >
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg,rgba(255,255,255,.13),transparent 55%)",
                  }}
                />

                <svg
                  className="w-4 h-4 relative z-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                  <rect x="9" y="13" width="6" height="8" rx="0.8" />
                </svg>

                <span className="relative z-10">Thử Nội Thất</span>

                <span
                  className="relative z-10 text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(255,255,255,.18)",
                    border: "1px solid rgba(255,255,255,.25)",
                    color: "#bae6fd",
                  }}
                >
                  3D
                </span>

                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{
                    animation: "rp-pulse 1.8s ease-in-out infinite",
                  }}
                />
              </Link>

              {/* Tooltip */}
              <div
                className={`
                  absolute left-1/2 -translate-x-1/2
                  top-11
                  bg-gray-900 text-white
                  text-xs px-3 py-2
                  rounded-lg whitespace-nowrap
                  transition-opacity duration-200
                  pointer-events-none
                  ${hoveredPlanner ? "opacity-100" : "opacity-0"}
                `}
              >
                Xem nội thất trong phòng của bạn ✨
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileOpen && (
        <div
          className="
            lg:hidden
            absolute top-full left-0
            w-full
            bg-white
            border-t border-gray-200
            shadow-2xl
            z-50
            max-h-[calc(100vh-120px)]
            overflow-y-auto
          "
        >
          <div className="p-4 space-y-1">
            {menus.map((menu, i) => (
              <div key={i}>
                {menu.dropdown ? (
                  <>
                    <button
                      onClick={() => setMobileSubOpen(!mobileSubOpen)}
                      className="
                        w-full flex items-center justify-between
                        px-3 py-3
                        rounded-lg
                        hover:bg-gray-50
                        font-medium
                        text-gray-800
                      "
                    >
                      {menu.name}

                      <ChevronDown
                        size={18}
                        className={`transition-transform ${
                          mobileSubOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {mobileSubOpen && (
                      <div className="ml-4 mb-2 bg-gray-50 rounded-lg p-2">
                        {categories.map((cat) => (
                          <Link
                            key={cat.categoryId}
                            to={`/products?category=${cat.categoryId}`}
                            onClick={() => setIsMobileOpen(false)}
                            className="
                              block py-2 px-2
                              text-sm text-gray-600
                              hover:text-blue-600
                            "
                          >
                            • {cat.categoryName}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={menu.path}
                    onClick={() => setIsMobileOpen(false)}
                    className="
                      block px-3 py-3
                      rounded-lg
                      font-medium
                      text-gray-800
                      hover:bg-gray-50
                    "
                  >
                    {menu.name}
                  </Link>
                )}
              </div>
            ))}

            {/* Mobile Room Planner */}
            <Link
              to="/room-planner"
              onClick={() => setIsMobileOpen(false)}
              className="
                mt-4
                flex items-center justify-center gap-2
                py-3 rounded-xl
                text-white font-semibold
              "
              style={{
                background:
                  "linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 58%,#0ea5e9 100%)",
              }}
            >
              🏠
              <span>Thử Nội Thất 3D</span>
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rp-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(52,211,153,.75);
          }
          65% {
            box-shadow: 0 0 0 5px rgba(52,211,153,0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(52,211,153,0);
          }
        }
      `}</style>
    </nav>
  );
}
