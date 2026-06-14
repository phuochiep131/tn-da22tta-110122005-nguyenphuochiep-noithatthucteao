import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext, useMemo, useRef } from "react"; // [UPDATE] Thêm useContext
import { message, Modal, Input, Divider, Button, Select } from "antd";
import {
  MapPin,
  Edit,
  Trash2,
  Plus,
  ShoppingBag,
  NotebookPen,
  Ticket,
  UserRound,
  Phone,
  CreditCard,
  Truck,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Cookies from "js-cookie";
import { AuthContext } from "../../context/AuthContext"; // [UPDATE] Import AuthContext
import api from "../../config/api";
import PayPalButton from "../../components/PayPalButton"; // [PAYPAL] Nút thanh toán PayPal tái sử dụng
import {
  calculateShippingFee,
  extractGhnError,
  getAvailableServices,
  getDistricts,
  getProvinces,
  getWards,
  isGhnRequestCanceled,
} from "../../services/ghnService";

const SHIPPING_DEBOUNCE_MS = 500;
const DEFAULT_PACKAGE_SIZE = {
  height: 20,
  length: 20,
  width: 20,
};

// --- HÀM KIỂM TRA HẠN SỬ DỤNG ---
const isCouponExpired = (endDate) => {
  if (!endDate) return false;
  return new Date().getTime() > new Date(endDate).getTime();
};

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const token = Cookies.get("jwt");

  // [UPDATE] Lấy thông tin user từ AuthContext
  const { user } = useContext(AuthContext);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [note, setNote] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Coupon
  const [coupons, setCoupons] = useState([]);
  const [selectedCouponId, setSelectedCouponId] = useState(null);
  const [couponValue, setCouponValue] = useState(0);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [tempSelectedCouponId, setTempSelectedCouponId] = useState(null);
  const [manualCouponCode, setManualCouponCode] = useState("");

  // Address
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [modalData, setModalData] = useState({
    name: "",
    phone: "",
    address: "",
    provinceId: null,
    provinceName: "",
    districtId: null,
    districtName: "",
    wardCode: "",
    wardName: "",
  });

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [locationLoading, setLocationLoading] = useState({
    provinces: false,
    districts: false,
    wards: false,
  });
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingService, setShippingService] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState("");
  const shippingRequestRef = useRef(0);
  const [isFreeShipping, setIsFreeShipping] = useState(false);
  const [freeShippingReason, setFreeShippingReason] = useState("");

  const [singleProduct, setSingleProduct] = useState(state?.product || null);
  const [items, setItems] = useState(state?.order?.orderDetails || []);
  const [oldOrderIds, setOldOrderIds] = useState(state?.oldOrderIds || []);

  // [UPDATE] useEffect để load thông tin user vào danh sách địa chỉ
  useEffect(() => {
    if (user) {
      // Kiểm tra xem user có thông tin cơ bản không để tạo địa chỉ mặc định
      // Lưu ý: Tên trường khớp với API trả về (thường là camelCase so với DB snake_case)
      const defaultAddress = {
        id: 1, // ID mặc định cho địa chỉ chính
        name: user.fullName || "", // Mapping từ full_name
        phone: user.phoneNumber || "", // Mapping từ phone_number
        address: user.address || "", // Mapping từ address
        provinceId: null,
        provinceName: "",
        districtId: null,
        districtName: "",
        wardCode: "",
        wardName: "",
      };

      // Chỉ set nếu có ít nhất tên hoặc số điện thoại
      if (defaultAddress.name || defaultAddress.phone) {
        setAddresses([defaultAddress]);
        setSelectedAddressId(1);
      }
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    setLocationLoading((prev) => ({ ...prev, provinces: true }));

    getProvinces()
      .then((data) => {
        if (active) setProvinces(data);
      })
      .catch((error) => {
        console.error("[GHN] Load provinces failed:", error);
        if (active) messageApi.warning("Không thể tải danh sách tỉnh/thành GHN");
      })
      .finally(() => {
        if (active) {
          setLocationLoading((prev) => ({ ...prev, provinces: false }));
        }
      });

    return () => {
      active = false;
    };
  }, [messageApi]);

  useEffect(() => {
    let active = true;

    if (!isModalOpen || !modalData.provinceId) {
      setDistricts([]);
      return () => {
        active = false;
      };
    }

    setLocationLoading((prev) => ({ ...prev, districts: true }));
    getDistricts(modalData.provinceId)
      .then((data) => {
        if (active) setDistricts(data);
      })
      .catch((error) => {
        console.error("[GHN] Load districts failed:", error);
        if (active) messageApi.warning("Không thể tải danh sách quận/huyện GHN");
      })
      .finally(() => {
        if (active) {
          setLocationLoading((prev) => ({ ...prev, districts: false }));
        }
      });

    return () => {
      active = false;
    };
  }, [isModalOpen, modalData.provinceId, messageApi]);

  useEffect(() => {
    let active = true;

    if (!isModalOpen || !modalData.districtId) {
      setWards([]);
      return () => {
        active = false;
      };
    }

    setLocationLoading((prev) => ({ ...prev, wards: true }));
    getWards(modalData.districtId)
      .then((data) => {
        if (active) setWards(data);
      })
      .catch((error) => {
        console.error("[GHN] Load wards failed:", error);
        if (active) messageApi.warning("Không thể tải danh sách phường/xã GHN");
      })
      .finally(() => {
        if (active) {
          setLocationLoading((prev) => ({ ...prev, wards: false }));
        }
      });

    return () => {
      active = false;
    };
  }, [isModalOpen, modalData.districtId, messageApi]);

  useEffect(() => {
    if ((!state || !state.product) && !singleProduct) {
      const pendingOrder = sessionStorage.getItem("pendingOrder");
      if (pendingOrder) {
        const {
          singleProduct: sp,
          items: it,
          oldOrderIds: oldIds,
          note: n,
          paymentMethod: pm,
          couponId: cid,
        } = JSON.parse(pendingOrder);

        setSingleProduct(sp || null);
        setItems(it || []);
        setOldOrderIds(oldIds || []);
        setNote(n || "");
        setPaymentMethod(pm || "PM001");
        setSelectedCouponId(cid || null);
      }
    }
  }, [state, singleProduct]);

  const productsToPay = useMemo(
    () => [
      ...items,
      ...(singleProduct
        ? [{ ...singleProduct, quantity: state?.quantity || 1 }]
        : []),
    ],
    [items, singleProduct, state?.quantity]
  );

  const totalPrice = productsToPay.reduce(
    (sum, item) =>
      sum +
      (item.subtotal || (item.product?.price || item.price) * item.quantity),
    0
  );

  const totalPriceWithCoupon = Math.max(totalPrice - couponValue, 0);
  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId),
    [addresses, selectedAddressId]
  );
  const totalQuantity = productsToPay.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const packageWeight = Math.max(1000, totalQuantity * 1000);
  const insuranceValue = Math.max(
    0,
    Math.min(Math.round(totalPriceWithCoupon), 5000000)
  );
  const grandTotal = totalPriceWithCoupon + shippingFee;
  const isAddressReady = Boolean(
    selectedAddress?.provinceId &&
      selectedAddress?.districtId &&
      selectedAddress?.wardCode
  );

  useEffect(() => {
    if (!selectedAddress) {
      setShippingFee(0);
      setShippingService(null);
      setShippingError("");
      setShippingLoading(false);
      setIsFreeShipping(false);
      setFreeShippingReason("");
      return undefined;
    }

    if (!isAddressReady) {
      setShippingFee(0);
      setShippingService(null);
      setShippingError("Vui lòng chọn đủ tỉnh/thành, quận/huyện, phường/xã để tính phí GHN.");
      setShippingLoading(false);
      setIsFreeShipping(false);
      setFreeShippingReason("");
      return undefined;
    }

    const requestId = shippingRequestRef.current + 1;
    shippingRequestRef.current = requestId;
    const controller = new AbortController();
    setShippingLoading(true);
    setShippingError("");

    const timer = window.setTimeout(async () => {
      try {
        const services = await getAvailableServices(
          selectedAddress.districtId,
          controller.signal
        );
        const service =
          services.find((item) => item.serviceId) || services[0] || null;

        if (!service?.serviceId) {
          throw new Error("GHN không có gói dịch vụ khả dụng cho tuyến này.");
        }

        const feeData = await calculateShippingFee(
          {
            toDistrictId: selectedAddress.districtId,
            toWardCode: selectedAddress.wardCode,
            serviceId: service.serviceId,
            subtotal: totalPrice,
            items: productsToPay.map(item => {
              const product = item.product || item;
              return {
                productId: product.productId,
                quantity: item.quantity || 1
              };
            }),
            insuranceValue,
          },
          controller.signal
        );

        if (shippingRequestRef.current !== requestId) return;

        const totalFee = Number(feeData?.totalFee || 0);
        setShippingService(service);
        setShippingFee(totalFee);
        setIsFreeShipping(Boolean(feeData?.freeShipping));
        setFreeShippingReason(feeData?.freeShippingReason || "");
        console.debug("[GHN] Fee calculated", {
          serviceId: service.serviceId,
          totalFee,
          toDistrictId: selectedAddress.districtId,
          toWardCode: selectedAddress.wardCode,
          freeShipping: feeData?.freeShipping,
          freeShippingReason: feeData?.freeShippingReason,
        });
      } catch (error) {
        if (isGhnRequestCanceled(error)) return;
        console.error("[GHN] Calculate fee failed:", error);
        if (shippingRequestRef.current === requestId) {
          setShippingFee(0);
          setShippingService(null);
          setIsFreeShipping(false);
          setFreeShippingReason("");
          setShippingError(
            `${extractGhnError(error)}. Tạm thời hệ thống giữ phí vận chuyển 0đ.`
          );
        }
      } finally {
        if (shippingRequestRef.current === requestId) {
          setShippingLoading(false);
        }
      }
    }, SHIPPING_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    selectedAddress,
    isAddressReady,
    productsToPay,
    totalPrice,
    insuranceValue,
  ]);

  // Fetch Payment Methods
  useEffect(() => {
    api.get("/api/payment-methods")
      .then((res) => setPaymentMethods(res.data))
      .catch(() => messageApi.error("Không thể tải phương thức thanh toán"));
  }, [token, messageApi]);

  // Fetch Coupons
  useEffect(() => {
    api.get("/api/coupons/active")
      .then((res) => setCoupons(res.data))
      .catch(() => messageApi.error("Không thể tải danh sách voucher"));
  }, [messageApi]);

  const getAddressDisplay = (addr) =>
    [
      addr?.address,
      addr?.wardName,
      addr?.districtName,
      addr?.provinceName,
    ]
      .filter(Boolean)
      .join(", ");

  const buildShippingAddress = (addr) =>
    `${addr.name} - ${addr.phone} - ${getAddressDisplay(addr)}`;

  const getSelectedName = (list, value, valueKey, labelKey) =>
    list.find((item) => String(item[valueKey]) === String(value))?.[labelKey] ||
    "";

  const handleProvinceChange = (provinceId) => {
    setModalData((prev) => ({
      ...prev,
      provinceId,
      provinceName: getSelectedName(
        provinces,
        provinceId,
        "provinceId",
        "provinceName"
      ),
      districtId: null,
      districtName: "",
      wardCode: "",
      wardName: "",
    }));
    setDistricts([]);
    setWards([]);
  };

  const handleDistrictChange = (districtId) => {
    setModalData((prev) => ({
      ...prev,
      districtId,
      districtName: getSelectedName(
        districts,
        districtId,
        "districtId",
        "districtName"
      ),
      wardCode: "",
      wardName: "",
    }));
    setWards([]);
  };

  const handleWardChange = (wardCode) => {
    setModalData((prev) => ({
      ...prev,
      wardCode,
      wardName: getSelectedName(wards, wardCode, "wardCode", "wardName"),
    }));
  };

  // --- LOGIC XỬ LÝ VOUCHER ---
  const handleSelectCoupon = (couponId) => {
    const selected = coupons.find((c) => c.couponId === couponId);

    if (!selected) {
      setSelectedCouponId(null);
      setCouponValue(0);
      return;
    }

    if (isCouponExpired(selected.endDate)) {
      messageApi.error(`Mã giảm giá ${selected.code} đã hết hạn sử dụng!`);
      return;
    }

    if (selected.minOrderAmount && totalPrice < selected.minOrderAmount) {
      messageApi.warning(
        `Đơn hàng chưa đạt mức tối thiểu ${selected.minOrderAmount.toLocaleString()}đ để dùng mã này!`
      );
      return;
    }

    let discountAmount = 0;

    if (selected.discountType === "percent") {
      let rawDiscount = (totalPrice * selected.discountValue) / 100;
      if (selected.maxDiscount && selected.maxDiscount > 0) {
        discountAmount = Math.min(rawDiscount, selected.maxDiscount);
      } else {
        discountAmount = rawDiscount;
      }
    } else {
      discountAmount = selected.discountValue;
    }

    setSelectedCouponId(couponId);
    setCouponValue(discountAmount);
    messageApi.success("Áp dụng mã giảm giá thành công!");
  };

  const handleApplyManualCode = () => {
    if (!manualCouponCode.trim()) {
      messageApi.warning("Vui lòng nhập mã voucher!");
      return;
    }

    const normalizedCode = manualCouponCode.trim().toUpperCase();
    const foundCoupon = coupons.find(
      (c) => c.code?.toUpperCase() === normalizedCode
    );

    if (!foundCoupon) {
      messageApi.error("Mã giảm giá không tồn tại!");
      return;
    }

    if (isCouponExpired(foundCoupon.endDate)) {
      messageApi.error("Mã giảm giá đã hết hạn sử dụng!");
      return;
    }

    if (!foundCoupon.isActive) {
      messageApi.error("Mã này hiện đang tạm khóa!");
      return;
    }

    const minSpend = foundCoupon.minOrderAmount || 0;
    if (totalPrice < minSpend) {
      messageApi.warning(
        `Đơn hàng cần tối thiểu ${minSpend.toLocaleString()}đ để sử dụng mã này!`
      );
      return;
    }

    setTempSelectedCouponId(foundCoupon.couponId);
    messageApi.success("Mã hợp lệ! Voucher đã được chọn.");
  };

  // [PAYPAL] Gom logic dựng payload đơn hàng để cả luồng COD và PayPal dùng chung.
  const buildOrderPayload = () => ({
    userId: Cookies.get("user_id"),
    paymentMethodId: paymentMethod,
    shippingAddress: buildShippingAddress(selectedAddress),
    customerNote: note,
    couponId: selectedCouponId,
    totalAmount: grandTotal,
    shippingFee: shippingFee,
    isOrder: true,
    orderStatus: "pending",
    orderDetails: productsToPay.map((item) => ({
      product: { productId: item.product?.productId || item.productId },
      quantity: item.quantity,
      unitPrice: item.unitPrice || item.product?.price || item.price,
      originalUnitPrice:
        item.originalUnitPrice || item.product?.price || item.price,
      // TRUYỀN FLAG ISFLASHSALE ĐỂ BACKEND TRỪ KHO FLASH SALE
      isFlashSale: item.isFlashSale ? 1 : 0,
    })),
    oldOrderIds,
  });

  // [PAYPAL] Đơn hàng chỉ hợp lệ khi đã chọn địa chỉ đầy đủ và phí ship đã tính xong.
  const isCheckoutReady = Boolean(
    selectedAddress && isAddressReady && !shippingLoading
  );

  // [PAYPAL] Sau khi PayPal capture thành công -> tạo Order + Payment (status Completed),
  // tái sử dụng đúng các API có sẵn như luồng VnPay/COD.
  const handlePayPalSuccess = async (capture) => {
    try {
      const orderPayload = buildOrderPayload();
      const apiPath = oldOrderIds?.length
        ? "/api/orders/replace"
        : "/api/orders";
      const { data: orderData } = await api.post(apiPath, orderPayload);

      await api.post("/api/payments", {
        orderId: orderData.orderId,
        paymentMethodId: "PM003",
        transactionId: capture?.transactionId || "PAYPAL-" + Date.now(),
        amount: grandTotal,
        paymentStatus: "Completed",
      });

      messageApi.success("Thanh toán PayPal thành công!");
      messageApi.success("Đặt hàng thành công!");
      sessionStorage.removeItem("pendingOrder");
      setTimeout(() => navigate("/purchase"), 1500);
    } catch (err) {
      messageApi.error(
        "Lỗi lưu đơn hàng: " +
          (err.response?.data?.message || err.response?.data || err.message)
      );
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedAddress)
      return messageApi.warning("Vui lòng chọn địa chỉ nhận hàng!");
    if (!isAddressReady)
      return messageApi.warning("Vui lòng chọn đủ tỉnh/thành, quận/huyện, phường/xã!");
    if (shippingLoading)
      return messageApi.warning("Đang tính phí vận chuyển, vui lòng chờ giây lát!");
    if (!paymentMethod)
      return messageApi.warning("Vui lòng chọn phương thức thanh toán!");
    if (shippingError) {
      messageApi.warning("GHN đang lỗi, hệ thống tạm giữ phí vận chuyển 0đ.");
    }

    const orderPayload = buildOrderPayload();

    // LUỒNG THANH TOÁN VNPAY (PM002)
    if (paymentMethod === "PM002") {
      try {
        const { data: vnpData } = await api.post("/api/vnpay/create-payment", {
          amount: Math.round(grandTotal),
          language: "vn",
        });
        if (vnpData.code === "00") {
          // Lưu lại order payload để xử lý sau khi VNPAY redirect về
          sessionStorage.setItem("pendingOrder", JSON.stringify(orderPayload));
          window.location.href = vnpData.data;
        }
      } catch {
        messageApi.error("Không thể kết nối cổng thanh toán!");
      }
      return;
    }

    // LUỒNG THANH TOÁN COD
    try {
      const apiPath = oldOrderIds?.length
        ? "/api/orders/replace"
        : "/api/orders";
      const { data: orderData } = await api.post(apiPath, orderPayload);

      // Tạo Payment record trạng thái Pending
      await api.post("/api/payments", {
        orderId: orderData.orderId,
        paymentMethodId: paymentMethod,
        transactionId: "COD-" + Date.now(),
        amount: grandTotal,
        paymentStatus: "Pending",
      });

      messageApi.success("Đặt hàng thành công!");
      sessionStorage.removeItem("pendingOrder");
      setTimeout(() => navigate("/purchase"), 1500);
    } catch (err) {
      messageApi.error("Lỗi: " + (err.response?.data?.message || err.response?.data || err.message));
    }
  };

  // --- Address Modal Handlers ---
  const openAddModal = () => {
    setEditingAddress(null);
    setModalData({
      name: "",
      phone: "",
      address: "",
      provinceId: null,
      provinceName: "",
      districtId: null,
      districtName: "",
      wardCode: "",
      wardName: "",
    });
    setDistricts([]);
    setWards([]);
    setIsModalOpen(true);
  };
  const openEditModal = (addr) => {
    setEditingAddress(addr);
    setModalData({
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      provinceId: addr.provinceId || null,
      provinceName: addr.provinceName || "",
      districtId: addr.districtId || null,
      districtName: addr.districtName || "",
      wardCode: addr.wardCode || "",
      wardName: addr.wardName || "",
    });
    setIsModalOpen(true);
  };
  const handleSaveAddress = () => {
    if (
      !modalData.name?.trim() ||
      !modalData.phone?.trim() ||
      !modalData.address?.trim() ||
      !modalData.provinceId ||
      !modalData.districtId ||
      !modalData.wardCode
    )
      return messageApi.warning("Vui lòng nhập đầy đủ thông tin!");

    const compactPhone = modalData.phone.replace(/\D/g, "");
    if (compactPhone.length < 9 || compactPhone.length > 11) {
      return messageApi.warning("Số điện thoại nhận hàng không hợp lệ!");
    }

    const nextAddress = {
      ...modalData,
      name: modalData.name.trim(),
      phone: modalData.phone.trim(),
      address: modalData.address.trim(),
      provinceId: Number(modalData.provinceId),
      provinceName:
        modalData.provinceName ||
        getSelectedName(provinces, modalData.provinceId, "provinceId", "provinceName"),
      districtId: Number(modalData.districtId),
      districtName:
        modalData.districtName ||
        getSelectedName(districts, modalData.districtId, "districtId", "districtName"),
      wardCode: String(modalData.wardCode),
      wardName:
        modalData.wardName ||
        getSelectedName(wards, modalData.wardCode, "wardCode", "wardName"),
    };

    if (editingAddress) {
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === editingAddress.id ? { ...a, ...nextAddress } : a
        )
      );
    } else {
      const newId = addresses.length
        ? Math.max(...addresses.map((a) => a.id)) + 1
        : 1;
      setAddresses((prev) => [...prev, { id: newId, ...nextAddress }]);
      setSelectedAddressId(newId);
    }
    setIsModalOpen(false);
  };
  const handleDeleteAddress = (id) => {
    setAddresses((prev) => {
      const nextAddresses = prev.filter((a) => a.id !== id);
      if (selectedAddressId === id) {
        setSelectedAddressId(nextAddresses[0]?.id || null);
      }
      return nextAddresses;
    });
  };

  if (!productsToPay.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-xl text-gray-500 font-medium">
          Giỏ hàng của bạn đang trống
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-blue-600 hover:underline"
        >
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 font-sans">
      {contextHolder}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          Thanh toán
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ----- LEFT COLUMN: Main Info ----- */}
          <div className="lg:col-span-8 space-y-6">
            {/* Section: Địa chỉ nhận hàng */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" /> Địa chỉ nhận hàng
                </h2>
                <button
                  onClick={openAddModal}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full transition"
                >
                  <Plus className="w-4 h-4" /> Thêm mới
                </button>
              </div>

              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 mb-2">Chưa có địa chỉ nào</p>
                    <button
                      onClick={openAddModal}
                      className="text-blue-600 font-medium"
                    >
                      Thêm địa chỉ ngay
                    </button>
                  </div>
                ) : (
                  addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`group relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedAddressId === addr.id
                          ? "border-blue-600 bg-blue-50/30"
                          : "border-gray-100 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div
                            className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              selectedAddressId === addr.id
                                ? "border-blue-600 bg-blue-600"
                                : "border-gray-300"
                            }`}
                          >
                            {selectedAddressId === addr.id && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900">
                                {addr.name}
                              </span>
                              <span className="text-gray-400">|</span>
                              <span className="text-gray-600">
                                {addr.phone}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {getAddressDisplay(addr)}
                            </p>
                            {(!addr.provinceId ||
                              !addr.districtId ||
                              !addr.wardCode) && (
                              <p className="text-xs text-amber-600 mt-1">
                                Chưa chọn mã tỉnh/quận/phường GHN
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-white p-1 rounded shadow-sm border">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(addr);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(addr.id);
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section: Sản phẩm */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" /> Sản phẩm (
                {productsToPay.length})
              </h2>
              <div className="divide-y divide-gray-100">
                {productsToPay.map((item, index) => (
                  <div
                    key={item.orderDetailId || index}
                    className="py-4 flex gap-4"
                  >
                    <div className="w-20 h-20 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={item.product?.imageUrls?.[0] || item.product?.imageUrl || item.imageUrls?.[0] || item.imageUrl}
                        alt="product"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 line-clamp-2">
                          {item.product?.productName || item.productName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Số lượng: x{item.quantity}
                        </p>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-gray-500 text-sm">
                          Đơn giá:{" "}
                          {(
                            item.unitPrice ||
                            item.product?.price ||
                            item.price
                          ).toLocaleString()}{" "}
                          ₫
                        </p>
                        <p className="font-bold text-gray-900 text-lg">
                          {(
                            item.subtotal ||
                            (item.unitPrice ||
                              item.product?.price ||
                              item.price) * item.quantity
                          ).toLocaleString()}{" "}
                          ₫
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Phương thức thanh toán */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" /> Phương thức
                thanh toán
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paymentMethods.map((pm) => (
                  <label
                    key={pm.id}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                      paymentMethod === pm.id
                        ? "border-blue-600 bg-blue-50/50"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={pm.id}
                      checked={paymentMethod === pm.id}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5 text-blue-600 accent-blue-600"
                    />
                    <div className="flex-1">
                      <span className="block font-medium text-gray-900">
                        {pm.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {pm.id === "PM002"
                          ? "Thanh toán qua ví điện tử/ngân hàng"
                          : pm.id === "PM003"
                          ? "Thanh toán quốc tế qua PayPal"
                          : "Thanh toán khi nhận hàng"}
                      </span>
                    </div>
                    {pm.id === "PM002" || pm.id === "PM003" ? (
                      <CreditCard className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Truck className="w-6 h-6 text-green-500" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ----- RIGHT COLUMN: Summary & Actions ----- */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-8 space-y-6">
              {/* Order Summary Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="font-semibold text-gray-900 text-lg">
                    Tổng quan đơn hàng
                  </h2>
                </div>

                <div className="p-6 space-y-6">
                  {/* Voucher Trigger */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Ticket className="w-4 h-4" /> Mã ưu đãi
                    </label>
                    <button
                      onClick={() => {
                        setTempSelectedCouponId(selectedCouponId);
                        setIsCouponModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-3 border border-gray-300 border-dashed rounded-lg text-sm hover:border-blue-500 hover:text-blue-600 transition group bg-gray-50"
                    >
                      <span className="flex items-center gap-2 text-gray-600 group-hover:text-blue-600">
                        {selectedCouponId ? (
                          <span className="font-medium text-green-600">
                            {coupons.find(
                              (c) => c.couponId === selectedCouponId
                            )?.code || "Đã áp dụng mã"}
                          </span>
                        ) : (
                          "Chọn hoặc nhập mã"
                        )}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                    {selectedCouponId && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã giảm: {couponValue.toLocaleString()} ₫
                      </p>
                    )}
                  </div>

                  {/* Note Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <NotebookPen className="w-4 h-4" /> Ghi chú cho người bán
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-3 border"
                      rows={2}
                      placeholder="Ví dụ: Giao giờ hành chính..."
                    />
                  </div>

                  <Divider className="my-2" />

                  {/* Calculation */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Tạm tính</span>
                      <span>{totalPrice.toLocaleString()} ₫</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Giảm giá</span>
                      <span>-{couponValue.toLocaleString()} ₫</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="flex items-center gap-1">
                        <Truck className="w-4 h-4" /> Phí vận chuyển
                      </span>
                      <span>
                        {shippingLoading
                          ? "Đang tính..."
                          : isFreeShipping
                            ? "Miễn phí"
                            : `${shippingFee.toLocaleString()} ₫`}
                      </span>
                    </div>
                    {isFreeShipping && !shippingLoading && freeShippingReason && (
                      <p className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded inline-block mt-1">
                        {freeShippingReason}
                      </p>
                    )}
                    {shippingService && !shippingLoading && (
                      <p className="text-xs text-blue-600">
                        GHN: {shippingService.shortName || "Dịch vụ khả dụng"}{" "}
                        #{shippingService.serviceId}
                      </p>
                    )}
                    {shippingError && (
                      <p className="text-xs text-amber-600 leading-relaxed">
                        {shippingError}
                      </p>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <span className="font-bold text-gray-900 text-base">
                        Tổng thanh toán
                      </span>
                      <span className="font-bold text-2xl text-red-600">
                        {grandTotal.toLocaleString()} ₫
                      </span>
                    </div>
                  </div>

                  {paymentMethod === "PM003" ? (
                    // [PAYPAL] Hiển thị Smart Buttons thay cho nút "Đặt hàng" khi chọn PayPal.
                    <div className="space-y-2">
                      {!isCheckoutReady && (
                        <p className="text-xs text-amber-600 text-center">
                          Vui lòng chọn địa chỉ đầy đủ và chờ tính phí vận chuyển
                          trước khi thanh toán.
                        </p>
                      )}
                      <PayPalButton
                        amountVnd={Math.round(grandTotal)}
                        disabled={!isCheckoutReady}
                        onSuccess={handlePayPalSuccess}
                        onError={(err) =>
                          messageApi.error(
                            "Thanh toán PayPal thất bại: " +
                              (err?.message || "Vui lòng thử lại.")
                          )
                        }
                      />
                    </div>
                  ) : (
                    <button
                      onClick={handleConfirmOrder}
                      disabled={shippingLoading}
                      className={`w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 active:scale-[0.98] transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${
                        shippingLoading ? "opacity-70 cursor-wait" : ""
                      }`}
                    >
                      <span>{shippingLoading ? "Đang tính phí..." : "Đặt hàng"}</span>
                      <ChevronRight className="w-5 h-5 opacity-80" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Địa chỉ */}
      <Modal
        title={
          <div className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            {editingAddress ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
          </div>
        }
        open={isModalOpen}
        onOk={handleSaveAddress}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu địa chỉ"
        cancelText="Hủy"
        okButtonProps={{ className: "bg-blue-600 hover:!bg-blue-700" }}
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Họ và tên
            </label>
            <Input
              size="large"
              placeholder="VD: Nguyễn Văn A"
              value={modalData.name}
              onChange={(e) =>
                setModalData({ ...modalData, name: e.target.value })
              }
              prefix={<UserRound className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Số điện thoại
            </label>
            <Input
              size="large"
              placeholder="VD: 0901234567"
              value={modalData.phone}
              onChange={(e) =>
                setModalData({ ...modalData, phone: e.target.value })
              }
              prefix={<Phone className="w-4 h-4 text-gray-400" />}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Tỉnh/Thành
              </label>
              <Select
                size="large"
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Chọn tỉnh"
                value={modalData.provinceId || undefined}
                loading={locationLoading.provinces}
                onChange={handleProvinceChange}
                className="w-full"
                options={provinces.map((item) => ({
                  value: item.provinceId,
                  label: item.provinceName,
                }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Quận/Huyện
              </label>
              <Select
                size="large"
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Chọn quận"
                value={modalData.districtId || undefined}
                loading={locationLoading.districts}
                disabled={!modalData.provinceId}
                onChange={handleDistrictChange}
                className="w-full"
                options={districts.map((item) => ({
                  value: item.districtId,
                  label: item.districtName,
                }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Phường/Xã
              </label>
              <Select
                size="large"
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Chọn phường"
                value={modalData.wardCode || undefined}
                loading={locationLoading.wards}
                disabled={!modalData.districtId}
                onChange={handleWardChange}
                className="w-full"
                options={wards.map((item) => ({
                  value: item.wardCode,
                  label: item.wardName,
                }))}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Địa chỉ chi tiết
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Số nhà, tên đường, phường/xã..."
              value={modalData.address}
              onChange={(e) =>
                setModalData({ ...modalData, address: e.target.value })
              }
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Voucher */}
      <Modal
        title="Chọn Shopper Voucher"
        open={isCouponModalOpen}
        onCancel={() => setIsCouponModalOpen(false)}
        footer={null}
        width={600}
        className="top-10"
      >
        <div className="flex gap-2 mb-6">
          <Input
            size="large"
            placeholder="Nhập mã Voucher"
            className="bg-gray-50 uppercase"
            value={manualCouponCode}
            onChange={(e) => setManualCouponCode(e.target.value)}
            onPressEnter={handleApplyManualCode}
          />
          <Button
            size="large"
            type="primary"
            className="bg-blue-600"
            onClick={handleApplyManualCode}
          >
            Áp dụng
          </Button>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 -mr-2 custom-scrollbar">
          {coupons.length === 0 ? (
            <div className="text-center py-10">
              <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Kho voucher của bạn đang trống</p>
            </div>
          ) : (
            coupons.map((c) => {
              const isInactive = !c.isActive;
              const isExpired = isCouponExpired(c.endDate);

              // --- LOGIC KIỂM TRA ĐIỀU KIỆN ---
              const minSpend = c.minOrderAmount || 0;
              const isEligible = totalPrice >= minSpend;

              // Chỉ cho phép chọn nếu voucher active VÀ đủ điều kiện tiền tối thiểu VÀ CHƯA HẾT HẠN
              const canSelect = !isInactive && isEligible && !isExpired;
              const isSelected = tempSelectedCouponId === c.couponId;

              return (
                <div
                  key={c.couponId}
                  onClick={() =>
                    canSelect && setTempSelectedCouponId(c.couponId)
                  }
                  className={`relative flex border rounded-lg overflow-hidden transition-all ${
                    !canSelect
                      ? "opacity-60 bg-gray-100 cursor-not-allowed grayscale-[0.8]"
                      : "cursor-pointer hover:shadow-md bg-white"
                  } ${
                    isSelected
                      ? "border-red-500 ring-1 ring-red-500 bg-red-50/10"
                      : "border-gray-200"
                  }`}
                >
                  {/* Left Ticket Stub */}
                  <div
                    className={`w-28 flex flex-col items-center justify-center p-3 border-r border-dashed ${
                      c.discountType === "fixed"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    <span className="font-bold text-lg">
                      {c.discountType === "percent"
                        ? `${c.discountValue}%`
                        : "GIẢM TIỀN"}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-white rounded-full mt-1 border shadow-sm">
                      SHOPPER
                    </span>
                  </div>

                  {/* Right Content */}
                  <div className="flex-1 p-3 flex flex-col justify-center">
                    <h4 className="font-bold text-gray-800">
                      {c.description || c.code}
                    </h4>

                    {/* Hiển thị chi tiết giảm giá */}
                    <div className="text-xs text-gray-500 mt-1">
                      <p>
                        Đơn tối thiểu:{" "}
                        {minSpend > 0 ? `${minSpend.toLocaleString()}đ` : "0đ"}
                      </p>
                      {c.discountType === "percent" && c.maxDiscount > 0 && (
                        <p className="text-red-500">
                          Giảm tối đa: {c.maxDiscount.toLocaleString()}đ
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-1">
                      HSD: {new Date(c.endDate).toLocaleDateString("vi-VN")}
                    </p>

                    {/* Báo lỗi nếu không đủ điều kiện */}
                    {!canSelect && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1 font-bold">
                        <AlertCircle className="w-3 h-3" />
                        {isInactive
                          ? "Tạm khóa bởi quản trị viên"
                          : isExpired
                          ? "ĐÃ HẾT HẠN SỬ DỤNG"
                          : !isEligible
                          ? `Cần thêm ${(
                              minSpend - totalPrice
                            ).toLocaleString()}đ`
                          : "Không hợp lệ"}
                      </p>
                    )}
                  </div>

                  {/* Radio Check */}
                  <div className="flex items-center px-4">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-red-500 bg-red-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button size="large" onClick={() => setIsCouponModalOpen(false)}>
            Trở lại
          </Button>
          <Button
            size="large"
            type="primary"
            className="bg-red-600 hover:!bg-red-700 w-32"
            onClick={() => {
              handleSelectCoupon(tempSelectedCouponId);
              setIsCouponModalOpen(false);
            }}
          >
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
}
