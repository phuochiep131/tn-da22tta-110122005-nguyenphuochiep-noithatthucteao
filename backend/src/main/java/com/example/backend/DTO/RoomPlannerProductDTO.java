package com.example.backend.DTO;

import java.math.BigDecimal;
import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class RoomPlannerProductDTO {
    private String id;
    private String productId;
    private String name;
    private String productName;
    private String modelUrl;
    private String arLink;
    private String arModelUsdz;
    private BigDecimal price;
    private BigDecimal discount;
    private String categoryId;
    private List<String> imageUrls;
    private String size;
    private Integer length;
    private Integer width;
    private Integer height;
    private Integer weight;
    private String color;
    private String material;

    public RoomPlannerProductDTO(ProductDTO product) {
        this.id = product.getProductId();
        this.productId = product.getProductId();
        this.name = product.getProductName();
        this.productName = product.getProductName();
        this.modelUrl = product.getArLink();
        this.arLink = product.getArLink();
        this.arModelUsdz = product.getArModelUsdz();
        this.price = product.getPrice();
        this.discount = product.getDiscount();
        this.categoryId = product.getCategoryId();
        this.imageUrls = product.getImageUrls();
        this.size = product.getSize();
        this.length = product.getLength();
        this.width = product.getWidth();
        this.height = product.getHeight();
        this.weight = product.getWeight();
        this.color = product.getColor();
        this.material = product.getMaterial();
    }
}
