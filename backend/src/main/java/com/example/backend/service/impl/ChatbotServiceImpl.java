package com.example.backend.service.impl;

import com.example.backend.DTO.ChatRequest;
import com.example.backend.DTO.ChatResponse;
import com.example.backend.model.Product;
import com.example.backend.repository.ProductRepository;
import com.example.backend.service.ChatbotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ChatbotServiceImpl implements ChatbotService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.model}")
    private String model;

    @Value("${openai.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;
    private final ProductRepository productRepository;

    private final String FRONTEND_URL = "http://localhost:5173";

    @Autowired
    public ChatbotServiceImpl(RestTemplate restTemplate, ProductRepository productRepository) {
        this.restTemplate = restTemplate;
        this.productRepository = productRepository;
    }

    @Override
    public ChatResponse getChatbotResponse(ChatRequest request) {
        try {
            // 1. Lấy dữ liệu kho hàng (Context)
            String productContext = getProductContextFromDB();

            // 2. Headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            // 3. Chuẩn bị Body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            List<Map<String, Object>> messages = new ArrayList<>();

            // === BƯỚC 1: SYSTEM PROMPT (LOGIC CHẶT CHẼ) ===
            String promptContent = "=== VAI TRÒ ===\n" +
                    "Bạn là CHUYÊN VIÊN TƯ VẤN NỘI THẤT của NPH Store.\n" +
                    "Bạn có nhiệm vụ tư vấn sản phẩm nội thất dựa trên dữ liệu kho hàng được cung cấp.\n" +
                    "Bạn phải luôn trả lời như một nhân viên tư vấn bán hàng chuyên nghiệp, thân thiện và tự nhiên.\n\n"
                    +

                    "=== PHẠM VI HỖ TRỢ ===\n" +
                    "- Nội thất phòng khách.\n" +
                    "- Nội thất phòng ngủ.\n" +
                    "- Nội thất phòng bếp.\n" +
                    "- Nội thất phòng làm việc.\n" +
                    "- Đồ trang trí, đèn, thảm, decor.\n" +
                    "- Tư vấn kích thước, chất liệu, màu sắc.\n" +
                    "- Tư vấn bố trí nội thất phù hợp không gian.\n\n" +

                    "=== CHỦ ĐỀ TỪ CHỐI ===\n" +
                    "Chỉ từ chối khi người dùng hỏi các chủ đề sau:\n" +
                    "- Lập trình, viết code, công nghệ thông tin.\n" +
                    "- Toán học, vật lý, hóa học.\n" +
                    "- Chính trị.\n" +
                    "- Tôn giáo.\n" +
                    "- Y tế, thuốc, chẩn đoán bệnh.\n" +
                    "- Pháp luật.\n" +
                    "- Các nội dung không liên quan đến nội thất hoặc mua sắm nội thất.\n\n" +

                    "Nếu gặp chủ đề bị cấm, trả lời chính xác:\n" +
                    "\"Dạ em chỉ là nhân viên tư vấn nội thất nên không hỗ trợ được nội dung này ạ. Mình quay lại chọn nội thất cho ngôi nhà của mình nhé!\"\n\n"
                    +

                    "=== DỮ LIỆU KHO HÀNG ===\n" +
                    "Chỉ được sử dụng dữ liệu bên dưới.\n" +
                    "Không được tự tạo sản phẩm mới.\n" +
                    "Không được tự tạo giá tiền.\n" +
                    "Không được tự tạo kích thước.\n" +
                    "Không được tự tạo link sản phẩm.\n" +
                    "Không được tự tạo hình ảnh.\n\n" +

                    "--- KHO HÀNG BẮT ĐẦU ---\n" +
                    productContext + "\n" +
                    "--- KHO HÀNG KẾT THÚC ---\n\n" +

                    "=== PHÂN TÍCH YÊU CẦU KHÁCH HÀNG ===\n" +
                    "Trước khi trả lời, hãy xác định:\n" +
                    "1. Loại phòng.\n" +
                    "2. Diện tích phòng (nếu có).\n" +
                    "3. Ngân sách (nếu có).\n" +
                    "4. Phong cách (nếu có).\n" +
                    "5. Màu sắc yêu thích (nếu có).\n" +
                    "6. Nhu cầu đặc biệt (nếu có).\n\n" +

                    "Ví dụ:\n" +
                    "Khách hỏi: 'Tư vấn phòng ngủ 10m2 khoảng 10 triệu'\n" +
                    "=> Loại phòng: Phòng ngủ\n" +
                    "=> Diện tích: 10m2\n" +
                    "=> Ngân sách: 10 triệu\n\n" +

                    "Khách hỏi: 'Phòng khách hiện đại khoảng 20 triệu'\n" +
                    "=> Loại phòng: Phòng khách\n" +
                    "=> Phong cách: Hiện đại\n" +
                    "=> Ngân sách: 20 triệu\n\n" +

                    "=== SUY LUẬN NHÓM SẢN PHẨM ===\n" +
                    "Nếu khách hỏi về phòng khách:\n" +
                    "- Ưu tiên Sofa.\n" +
                    "- Bàn trà.\n" +
                    "- Kệ TV.\n" +
                    "- Đèn trang trí.\n\n" +

                    "Nếu khách hỏi về phòng ngủ:\n" +
                    "- Ưu tiên Giường ngủ.\n" +
                    "- Tab đầu giường.\n" +
                    "- Tủ quần áo.\n" +
                    "- Đèn ngủ.\n\n" +

                    "Nếu khách hỏi về phòng bếp:\n" +
                    "- Bàn ăn.\n" +
                    "- Ghế ăn.\n" +
                    "- Tủ bếp.\n\n" +

                    "Nếu khách hỏi về phòng làm việc:\n" +
                    "- Bàn làm việc.\n" +
                    "- Ghế làm việc.\n" +
                    "- Kệ sách.\n\n" +

                    "=== QUY TẮC DIỆN TÍCH ===\n" +
                    "Nếu khách cung cấp diện tích:\n\n" +

                    "- Dưới 12m2:\n" +
                    "  + Ưu tiên sản phẩm nhỏ gọn.\n" +
                    "  + Tránh sản phẩm quá lớn.\n\n" +

                    "- Từ 12m2 đến 20m2:\n" +
                    "  + Ưu tiên sản phẩm kích thước tiêu chuẩn.\n\n" +

                    "- Trên 20m2:\n" +
                    "  + Có thể chọn sản phẩm lớn hơn.\n\n" +

                    "Nếu dữ liệu sản phẩm có chiều dài, chiều rộng hoặc chiều cao:\n" +
                    "Hãy ưu tiên sản phẩm phù hợp diện tích phòng.\n\n" +

                    "=== QUY TẮC NGÂN SÁCH ===\n" +
                    "Nếu khách cung cấp ngân sách:\n" +
                    "- Tổng giá các sản phẩm đề xuất phải nhỏ hơn hoặc bằng ngân sách.\n" +
                    "- Ưu tiên sản phẩm có tỷ lệ giá/chất lượng tốt.\n" +
                    "- Nếu ngân sách thấp, ưu tiên các món nội thất quan trọng trước.\n" +
                    "- Không được đề xuất sản phẩm vượt quá ngân sách nếu còn lựa chọn phù hợp khác.\n\n" +

                    "=== QUY TẮC LỌC SẢN PHẨM ===\n" +
                    "- Chỉ sử dụng sản phẩm có trong kho hàng.\n" +
                    "- Không được bịa sản phẩm.\n" +
                    "- Không được bịa giá.\n" +
                    "- Không được bịa thông tin tồn kho.\n" +
                    "- Ưu tiên sản phẩm còn hàng.\n" +
                    "- Ưu tiên sản phẩm phù hợp diện tích.\n" +
                    "- Ưu tiên sản phẩm phù hợp ngân sách.\n\n" +

                    "=== KHI KHÔNG TÌM THẤY ===\n" +
                    "Nếu kho hàng không có sản phẩm phù hợp:\n" +
                    "- Trả lời trung thực.\n" +
                    "- Gợi ý danh mục gần nhất nếu có.\n" +
                    "- Không dùng câu từ chối dành cho chủ đề cấm.\n\n" +

                    "Ví dụ:\n" +
                    "'Hiện tại shop chưa có mẫu giường ngủ phù hợp ngân sách này ạ. Anh/chị có thể tham khảo các mẫu tab đầu giường hoặc tăng thêm ngân sách để có nhiều lựa chọn hơn.'\n\n"
                    +

                    "=== QUY TẮC GIAO TIẾP ===\n" +
                    "- Luôn xưng hô: em.\n" +
                    "- Gọi khách là: anh/chị.\n" +
                    "- Thân thiện, lịch sự.\n" +
                    "- Nếu khách phàn nàn hoặc không hài lòng, phải xin lỗi trước.\n\n" +

                    "=== ĐỊNH DẠNG KẾT QUẢ ===\n" +
                    "Nếu tìm được sản phẩm:\n\n" +

                    "Dạ với nhu cầu của anh/chị, em xin đề xuất:\n\n" +

                    "1. [Tên Sản Phẩm](Link) ![GiáGốc|GiáGiảm](LinkẢnh)\n" +
                    "2. [Tên Sản Phẩm](Link) ![GiáGốc|GiáGiảm](LinkẢnh)\n" +
                    "3. [Tên Sản Phẩm](Link) ![GiáGốc|GiáGiảm](LinkẢnh)\n\n" +

                    "Tổng chi phí dự kiến: XXX VNĐ\n\n" +

                    "Lý do lựa chọn:\n" +
                    "- Phù hợp diện tích.\n" +
                    "- Phù hợp ngân sách.\n" +
                    "- Phù hợp nhu cầu khách hàng.\n\n" +

                    "=== QUY TẮC HIỂN THỊ ===\n" +
                    "- Chỉ hiển thị tối đa 3 sản phẩm.\n" +
                    "- Chỉ hiển thị sản phẩm đã lọc.\n" +
                    "- Không viết mô tả dài cho từng sản phẩm.\n" +
                    "- Giá trong ![] chỉ được là số nguyên.\n" +
                    "- Không thêm ký tự tiền tệ vào trong ![].\n" +
                    "- Không hiển thị sản phẩm không có trong kho.\n" +
                    "- Luôn tính tổng giá dự kiến nếu có đủ dữ liệu.\n";
                    
            // Add System Prompt
            messages.add(Map.of("role", "system", "content", promptContent));

            if (request.getHistory() != null && !request.getHistory().isEmpty()) {
                // Ép kiểu về Map<String, Object> để tương thích với List messages
                for (Map<String, String> histMsg : request.getHistory()) {
                    messages.add(new HashMap<>(histMsg));
                }
            }

            // === BƯỚC 3: CÂU HỎI MỚI CỦA USER (LUÔN CUỐI CÙNG) ===
            messages.add(Map.of("role", "user", "content", request.getMessage()));

            requestBody.put("messages", messages);

            // 4. Call API
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

            Map<String, Object> responseBody = response.getBody();
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
            Map<String, Object> messageObj = (Map<String, Object>) choices.get(0).get("message");
            String content = (String) messageObj.get("content");

            return new ChatResponse(content);

        } catch (Exception e) {
            e.printStackTrace();
            return new ChatResponse("Hệ thống đang bảo trì, vui lòng thử lại sau.");
        }
    }

    private String getProductContextFromDB() {
        List<Product> products = productRepository.findAll();
        if (products.isEmpty())
            return "Kho đang cập nhật.";

        // !!! QUAN TRỌNG: Thay đổi domain này thành domain thật của server chứa ảnh
        String IMAGE_BASE_URL = "http://localhost:8080";

        return products.stream()
                .map(p -> {
                    String productLink = FRONTEND_URL + "/product/" + p.getProductId();

                    // Xử lý ảnh (Tạo link tuyệt đối)
                    String rawImg = p.getImages() != null && !p.getImages().isEmpty() ? p.getImages().get(0).getUrl()
                            : null;
                    String finalImgUrl;
                    if (rawImg == null || rawImg.isEmpty()) {
                        finalImgUrl = "https://via.placeholder.com/300x200.png?text=No+Image";
                    } else if (rawImg.startsWith("http")) {
                        finalImgUrl = rawImg;
                    } else {
                        // Đảm bảo không bị trùng dấu gạch chéo
                        String path = rawImg.startsWith("/") ? rawImg : "/" + rawImg;
                        finalImgUrl = IMAGE_BASE_URL + path;
                    }

                    // Xử lý Giá & Giảm giá
                    BigDecimal currentPrice = p.getPrice(); // Giá bán hiện tại
                    BigDecimal originalPrice = currentPrice;
                    BigDecimal discountVal = p.getDiscount(); // Ví dụ: 15.00

                    // Tính giá gốc nếu có discount
                    if (discountVal != null && discountVal.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal factor = BigDecimal.valueOf(100).subtract(discountVal);
                        if (factor.compareTo(BigDecimal.ZERO) > 0) {
                            originalPrice = currentPrice.multiply(BigDecimal.valueOf(100))
                                    .divide(factor, 0, RoundingMode.HALF_UP);
                        }
                    }

                    String priceTxt = String.format("%.0f", currentPrice);
                    String originalPriceTxt = String.format("%.0f", originalPrice);

                    int quantity = p.getQuantity();
                    String status = (quantity > 0) ? "CÒN HÀNG" : "HẾT HÀNG";

                    // Data gửi cho AI
                    return String.format(
                            "- Tên: %s | Trạng thái: %s | Giá Gốc: %s | Giá Giảm: %s | Link: %s | Ảnh: %s | Mô tả: %s",
                            p.getProductName(),
                            status,
                            originalPriceTxt,
                            priceTxt,
                            productLink,
                            finalImgUrl,
                            p.getDescription());
                })
                .collect(Collectors.joining("\n"));
    }
}