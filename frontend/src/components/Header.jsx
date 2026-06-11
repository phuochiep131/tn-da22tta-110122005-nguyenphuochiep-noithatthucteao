import { useState, useContext, useRef, useEffect } from "react";
import {
  ShoppingCart,
  User,
  Search,
  LogOut,
  Shield,
  Settings,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import MainMenu from "./MainMenu";
import { message } from "antd";
import Cookies from "js-cookie";

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // --- THÊM STATE CHO HIỆU ỨNG CUỘN ---
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const { cartCount, refreshCartCount, resetCartCount } =
    useContext(CartContext);
  const { user, logout } = useContext(AuthContext);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("search") || "");

  const menuRef = useRef(null);
  const [messageApi, contextHolder] = message.useMessage();

  const isLoggedIn = !!user;

  // Sync input với URL khi URL thay đổi
  useEffect(() => {
    setKeyword(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    if (user) refreshCartCount(Cookies.get("user_id"), Cookies.get("jwt"));
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user]);

  // --- THÊM USEEFFECT XỬ LÝ SỰ KIỆN SCROLL ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Nếu ở sát trên cùng thì luôn hiện (tránh giật lag ở top)
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Đang cuộn xuống -> Ẩn
        setIsVisible(false);
        // Đóng luôn menu user nếu đang mở để tránh lỗi UI
        setShowUserMenu(false);
      } else {
        // Đang cuộn lên -> Hiện
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);
  // ------------------------------------------

  const handleLogout = () => {
    logout();
    resetCartCount();
    setShowUserMenu(false);
    messageApi.success("Đăng xuất thành công");
    navigate("/");
  };

  const handleSearch = () => {
    if (keyword.trim()) {
      navigate(`/products?search=${encodeURIComponent(keyword.trim())}`);
    } else {
      navigate(`/products`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <header
      className={`bg-white border-b border-gray-200 fixed top-0 w-full z-50 shadow-sm transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {contextHolder}

      {/* TẦNG 1: LOGO - SEARCH - ACTIONS */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tighter shrink-0"
          >
            NPH <span className="text-blue-600">STORE</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-auto relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm kiếm ghế sofa, bàn ăn..."
              className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
            >
              <Search size={18} />
            </button>
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={18}
            />
          </div>

          {/* Actions: Cart & User */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <button
              onClick={() => navigate("/cart")}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition group"
            >
              <ShoppingCart
                size={24}
                className="group-hover:text-blue-600 transition"
              />
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            </button>

            {!isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="hidden sm:block text-sm font-semibold text-gray-700 hover:text-blue-600 px-2"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-blue-700 transition shadow-sm"
                >
                  Đăng ký
                </Link>
              </div>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 pr-3 rounded-full border border-gray-200 hover:shadow-md transition bg-white"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-full h-full object-cover"
                        alt="avatar"
                      />
                    ) : (
                      <User className="p-1.5 w-full h-full text-gray-400" />
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-gray-700 max-w-[80px] truncate">
                    {user.fullName}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                      <p className="font-bold text-gray-800 truncate">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="py-1">
                      {user.role === "ADMIN" && (
                        <Link
                          to="/admin"
                          className="px-5 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Shield size={16} /> Trang quản trị
                        </Link>
                      )}
                      <Link
                        to="/purchase"
                        className="px-5 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <ShoppingCart size={16} /> Đơn mua hàng
                      </Link>
                      <Link
                        to="/edit-profile"
                        className="px-5 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Settings size={16} /> Cài đặt tài khoản
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 mt-1 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-5 py-2.5 flex items-center gap-3 text-sm text-red-600 hover:bg-red-50 font-medium"
                      >
                        <LogOut size={16} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TẦNG 2: MAIN MENU */}
      <MainMenu />
    </header>
  );
}
